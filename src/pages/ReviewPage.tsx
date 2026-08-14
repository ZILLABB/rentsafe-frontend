import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  Camera,
  CheckCircle2,
  Loader2,
  MapPin,
  Plus,
  Search,
  ShieldCheck,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { FadeIn } from "@/components/motion";
import { AuthedImage } from "@/components/ui/AuthedImage";
import { Card } from "@/components/ui/Card";
import { PropertyIdChip } from "@/components/ui/Chip";
import { api, getToken, clearSession, type ApiPlace } from "@/lib/api";
import { cn } from "@/lib/cn";
import { useProperties, useProperty, usePropertyPhotos } from "@/lib/hooks";
import { useI18n } from "@/lib/i18n";

const DRAFT_KEY = "rentsafe.review-draft";

const STEPS = [
  "Find property",
  "Your tenancy",
  "Rate your experience",
  "Tell your story",
  "Upload evidence",
  "Review & submit",
];

const CATEGORIES: { key: string; label: string; hint: string }[] = [
  { key: "landlord", label: "Landlord", hint: "deposit, fairness, repairs" },
  { key: "agent", label: "Agent", hint: "fees, honesty, professionalism" },
  { key: "property", label: "Property", hint: "condition, space, finishing" },
  { key: "water", label: "Water supply", hint: "reliability, cleanliness" },
  { key: "power", label: "Power supply", hint: "hours/day, transformer" },
  { key: "security", label: "Security", hint: "estate, street, break-ins" },
  { key: "noise", label: "Noise", hint: "generators, traffic, nightlife" },
  { key: "flooding", label: "Flooding", hint: "5 = never floods" },
  { key: "neighbourhood", label: "Neighbourhood", hint: "access, markets, people" },
  { key: "value", label: "Value", hint: "worth the rent?" },
];

/** Review wizard (design 1e): segmented progress, tap-to-score 1–5 buttons,
 *  free-text story, OTP phone verification and a live submit to the API. */
export default function ReviewPage() {
  // Which property is being reviewed comes from the URL (?property=…), set by
  // every "Write a review" entry point. Falls back to a picker rather than a
  // hardcoded fixture.
  const [params, setParams] = useSearchParams();
  const propertyId = params.get("property") ?? "";

  const [step, setStep] = useState(0);
  const [ratings, setRatings] = useState<Record<string, number>>({});
  const [tenancyStart, setTenancyStart] = useState("2024-01");
  const [stillLiving, setStillLiving] = useState(true);
  const [rentNaira, setRentNaira] = useState("");
  const [positives, setPositives] = useState("");
  const [warnings, setWarnings] = useState("");
  const [draftSaved, setDraftSaved] = useState(false);
  // Auth + submit state
  const [phone, setPhone] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { t } = useI18n();
  const { data: property } = useProperty(propertyId);

  const rated = Object.keys(ratings).length;
  const allRated = rated === CATEGORIES.length;
  // A token in storage isn't proof of a live session — it can be expired, or
  // left over from a rebuilt database. `sessionDead` flips when the server
  // rejects it, so the wizard falls back to asking for the phone code rather
  // than skipping verification and failing at submit.
  const [sessionDead, setSessionDead] = useState(false);
  const authed = !!getToken() && !sessionDead;
  const propertyLabel = property?.addressLocal ?? propertyId;

  // Restore a saved draft for this property.
  useEffect(() => {
    if (!propertyId) return;
    try {
      const raw = localStorage.getItem(`${DRAFT_KEY}:${propertyId}`);
      if (!raw) return;
      const d = JSON.parse(raw);
      setRatings(d.ratings ?? {});
      setTenancyStart(d.tenancyStart ?? "2024-01");
      setStillLiving(d.stillLiving ?? true);
      setRentNaira(d.rentNaira ?? "");
      setPositives(d.positives ?? "");
      setWarnings(d.warnings ?? "");
    } catch {
      // A corrupt draft shouldn't block writing a new review.
    }
  }, [propertyId]);

  function selectProperty(id: string) {
    setParams({ property: id }, { replace: true });
  }

  function saveDraft() {
    localStorage.setItem(
      `${DRAFT_KEY}:${propertyId}`,
      JSON.stringify({ ratings, tenancyStart, stillLiving, rentNaira, positives, warnings }),
    );
    setDraftSaved(true);
    setTimeout(() => setDraftSaved(false), 2000);
  }

  /** What still blocks moving on from the current step. */
  const blocker = useMemo((): string | null => {
    if (step === 0 && !propertyId) return t("wizard.blockProperty");
    if (step === 1 && !rentNaira) return t("wizard.blockRent");
    if (step === 2 && !allRated)
      return t("wizard.blockRatings", { n: CATEGORIES.length - rated });
    if (step === 3 && positives.trim().length < 10 && warnings.trim().length < 10)
      return t("wizard.blockStory");
    if (step === 5 && !authed && (!otpSent || otpCode.length < 4))
      return t("wizard.blockPhone");
    return null;
  }, [t, step, propertyId, rentNaira, allRated, rated, positives, warnings, authed, otpSent, otpCode]);

  async function requestOtp() {
    setBusy(true);
    setError(null);
    try {
      const out = await api.requestOtp(phone);
      setOtpSent(true);
      if (out.dev_code) setOtpCode(out.dev_code); // dev echo — Termii SMS in prod
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not send code");
    } finally {
      setBusy(false);
    }
  }

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      if (!getToken()) {
        await api.verifyOtp(phone, otpCode);
      }
      // Every category is required by `blocker` above, so nothing is invented
      // on the reviewer's behalf here.
      const out = await api.submitReview({
        property_id: propertyId,
        tenancy_start: `${tenancyStart}-01`,
        still_living: stillLiving,
        rent_amount_kobo: Math.round(Number(rentNaira || "0") * 100),
        ratings: ratings as never,
        text_positives: positives.trim(),
        text_warnings: warnings.trim(),
        is_anonymous: false,
      });
      setDone(out.message);
      localStorage.removeItem(`${DRAFT_KEY}:${propertyId}`);
      await queryClient.invalidateQueries({ queryKey: ["reviews", propertyId] });
      await queryClient.invalidateQueries({ queryKey: ["property", propertyId] });
      setTimeout(() => navigate(`/property/${propertyId}`), 1600);
    } catch (e) {
      const raw = e instanceof Error ? e.message : "";
      if (/\b401\b/.test(raw)) {
        // Expired or orphaned token: drop it and ask for the code again
        // instead of showing the raw API error.
        clearSession();
        setSessionDead(true);
        setOtpSent(false);
        setError(t("wizard.sessionExpired"));
      } else {
        setError(raw.match(/"detail":"([^"]+)"/)?.[1] ?? t("wizard.submitFailed"));
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    // Bottom padding clears the sticky action bar; without it the last card on
    // a long step sits permanently underneath it.
    <div className="space-y-4 pb-4">
      {/* Progress header */}
      <FadeIn>
        <div className="-mx-4 -mt-4 border-b border-border bg-card px-4 py-4 md:mx-0 md:mt-0 md:rounded-2xl md:border">
          <div className="mb-2.5 flex items-center justify-between">
            <span className="text-xs font-600 text-muted-foreground">
              Step {step + 1} of {STEPS.length} — {STEPS[step]}
            </span>
            <button
              onClick={saveDraft}
              disabled={!propertyId}
              className="text-xs font-700 text-primary disabled:opacity-40"
            >
              {draftSaved ? t("wizard.draftSaved") : t("wizard.saveDraft")}
            </button>
          </div>
          <div className="flex gap-1.5">
            {STEPS.map((s, i) => (
              <button
                key={s}
                // Steps can only be revisited, never skipped — jumping ahead
                // would let a reviewer submit without completing the ratings.
                onClick={() => i < step && setStep(i)}
                disabled={i >= step}
                aria-label={s}
                aria-current={i === step ? "step" : undefined}
                className={cn(
                  "h-1 flex-1 rounded-full transition-colors",
                  i <= step ? "bg-primary" : "bg-border",
                  i < step && "cursor-pointer",
                )}
              />
            ))}
          </div>
          {propertyId && (
            <div className="mt-3 flex items-center gap-2">
              <PropertyIdChip id={propertyId} />
              <span className="truncate text-2xs text-subtle">{propertyLabel}</span>
            </div>
          )}
        </div>
      </FadeIn>

      {/* Step content */}
      <motion.div
        key={step}
        initial={{ opacity: 0, x: 12 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.22 }}
      >
        {step === 0 && <PropertyPicker selected={propertyId} onSelect={selectProperty} />}

        {step === 1 && (
          <Card>
            <div className="space-y-3.5">
              <div>
                <label className="text-2xs font-600 text-muted-foreground">Move-in month</label>
                <input
                  type="month"
                  value={tenancyStart}
                  onChange={(e) => setTenancyStart(e.target.value)}
                  className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2.5 text-sm outline-none focus:shadow-focus"
                />
              </div>
              <label className="flex items-center gap-2 text-sm text-foreground">
                <input
                  type="checkbox"
                  checked={stillLiving}
                  onChange={(e) => setStillLiving(e.target.checked)}
                  className="h-4 w-4 accent-[#1A7A8A]"
                />
                I still live here
              </label>
              <div>
                <label className="text-2xs font-600 text-muted-foreground">Annual rent (₦)</label>
                <input
                  type="number"
                  value={rentNaira}
                  onChange={(e) => setRentNaira(e.target.value)}
                  className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2.5 font-mono text-sm outline-none focus:shadow-focus"
                />
              </div>
            </div>
          </Card>
        )}

        {step === 2 && (
          <div>
            <h1 className="font-display text-xl font-800 text-heading">{t("wizard.title")}</h1>
            <p className="mb-4 mt-0.5 text-xs text-muted-foreground">
              {t("wizard.subtitle")}
            </p>
            <div className="space-y-3">
              {CATEGORIES.map((c) => (
                <RatingRow
                  key={c.key}
                  label={c.label}
                  hint={c.hint}
                  value={ratings[c.key] ?? 0}
                  onChange={(v) => setRatings((r) => ({ ...r, [c.key]: v }))}
                />
              ))}
              <p className="pt-0.5 text-center text-2xs text-subtle">
                {rated} of {CATEGORIES.length} categories rated
              </p>
              <p className="text-center text-2xs leading-relaxed text-subtle">
                {t("rate.allRequired")}
              </p>
            </div>
          </div>
        )}

        {step === 3 && (
          <Card>
            <div className="space-y-3.5">
              <div>
                <label className="text-2xs font-600 text-score-good">
                  What did you love? *
                </label>
                <textarea
                  value={positives}
                  onChange={(e) => setPositives(e.target.value)}
                  maxLength={500}
                  rows={3}
                  placeholder="Water, security, landlord, space…"
                  className="mt-1 w-full resize-none rounded-md border border-input bg-background px-3 py-2.5 text-sm outline-none focus:shadow-focus"
                />
              </div>
              <div>
                <label className="text-2xs font-600 text-score-bad">
                  What should future tenants know? *
                </label>
                <textarea
                  value={warnings}
                  onChange={(e) => setWarnings(e.target.value)}
                  maxLength={1000}
                  rows={4}
                  placeholder="Flooding, fees, noise, promises not kept…"
                  className="mt-1 w-full resize-none rounded-md border border-input bg-background px-3 py-2.5 text-sm outline-none focus:shadow-focus"
                />
              </div>
            </div>
          </Card>
        )}

        {step === 4 && <EvidenceStep propertyId={propertyId} authed={authed} />}

        {step === 5 && (
          <div className="space-y-3">
            <Card>
              <p className="text-sm font-700 text-heading">Your review of {propertyLabel}</p>
              <p className="mt-1.5 text-xs text-muted-foreground">
                {rated} ratings · from {tenancyStart}
                {stillLiving ? " · still living here" : ""} · ₦
                {Number(rentNaira || "0").toLocaleString("en-NG")}/yr
              </p>
              {positives && (
                <p className="mt-2 text-xs">
                  <strong className="text-score-good">Loved:</strong> {positives}
                </p>
              )}
              {warnings && (
                <p className="mt-1 text-xs">
                  <strong className="text-score-bad">Know:</strong> {warnings}
                </p>
              )}
            </Card>

            {!authed && (
              <Card>
                <div className="mb-2.5 flex items-center gap-2">
                  <ShieldCheck size={16} className="text-primary" />
                  <p className="text-sm font-700 text-heading">{t("wizard.verifyPhone")}</p>
                </div>
                <div className="flex gap-2">
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="0803 123 4567"
                    className="min-w-0 flex-1 rounded-md border border-input bg-background px-3 py-2.5 text-sm outline-none focus:shadow-focus"
                  />
                  <button
                    onClick={requestOtp}
                    disabled={busy || phone.length < 10}
                    className="flex-none rounded-md bg-primary px-4 py-2.5 text-xs font-700 text-white disabled:opacity-40"
                  >
                    {otpSent ? "Resend" : t("wizard.sendCode")}
                  </button>
                </div>
                {otpSent && (
                  <input
                    type="text"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value)}
                    placeholder="6-digit code"
                    className="mt-2 w-full rounded-md border border-input bg-background px-3 py-2.5 font-mono text-sm tracking-[0.3em] outline-none focus:shadow-focus"
                  />
                )}
              </Card>
            )}

            {error && (
              <p className="rounded-md bg-score-bad/[0.08] px-3 py-2 text-xs text-score-bad">
                {error}
              </p>
            )}
            {done && (
              <div className="flex items-center gap-2 rounded-md bg-score-good/10 px-3 py-2.5 text-xs font-600 text-score-good">
                <CheckCircle2 size={15} /> {done}
              </div>
            )}
          </div>
        )}
      </motion.div>

      {/* Sticky footer.
          It was transparent with no stacking context, so the step content
          scrolled *through* it — on the ratings step the last card's buttons
          and labels showed straight behind the Continue button. It needs its
          own ground and to sit above the content, and the page needs room at
          the bottom for the last card to clear it. */}
      <div className="sticky bottom-14 z-20 -mx-4 space-y-2 border-t border-border bg-background/95 px-4 pb-8 pt-3 backdrop-blur md:bottom-4 md:mx-0 md:rounded-xl md:border md:pb-3 md:px-3">
        {blocker && (
          <p
            role="status"
            className="rounded-md bg-insight px-3 py-2 text-xs font-500 text-insight-foreground"
          >
            {blocker}
          </p>
        )}
        <div className="flex gap-2.5">
          <button
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            disabled={step === 0}
            className="flex-none rounded-lg border border-border bg-card px-[18px] py-3.5 text-sm font-600 text-muted-foreground disabled:opacity-40"
          >
            {t("wizard.back")}
          </button>
          <button
            onClick={() =>
              step === STEPS.length - 1 ? submit() : setStep((s) => s + 1)
            }
            disabled={busy || blocker !== null}
            className="flex-1 rounded-lg bg-primary py-3.5 text-center font-display text-sm font-700 text-white shadow-fab transition-transform active:scale-[0.99] disabled:opacity-50"
          >
            {busy
              ? t("wizard.submitting")
              : step === STEPS.length - 1
                ? t("wizard.submit")
                : t("wizard.continue")}
          </button>
        </div>
      </div>
    </div>
  );
}

/** Step 5 — optional photo evidence. Uploads immediately so the tenant sees it
 *  land, rather than holding files in memory until submit. */
function EvidenceStep({
  propertyId,
  authed,
}: {
  propertyId: string;
  authed: boolean;
}) {
  const queryClient = useQueryClient();
  const { data: photos = [] } = usePropertyPhotos(propertyId);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mine = photos.filter((p) => p.moderation_status !== "approved");

  async function onPick(files: FileList | null) {
    if (!files?.length) return;
    setBusy(true);
    setError(null);
    try {
      for (const file of Array.from(files).slice(0, 5)) {
        await api.uploadPhoto(propertyId, file, { kind: "evidence" });
      }
      await queryClient.invalidateQueries({ queryKey: ["photos", propertyId] });
    } catch (e) {
      // The API returns a human-readable reason for a rejected image.
      const raw = e instanceof Error ? e.message : "Upload failed";
      const detail = raw.match(/"detail":"([^"]+)"/)?.[1];
      setError(detail ?? "That upload didn't work. Try a different photo.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      {!authed ? (
        <div className="flex h-40 flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border text-center">
          <Camera size={26} className="text-subtle" />
          <p className="px-6 text-xs font-600 text-muted-foreground">
            Verify your phone on the next step to attach photos.
          </p>
        </div>
      ) : (
        <label
          className={cn(
            "flex h-40 cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border text-center transition-colors hover:border-primary/50",
            busy && "opacity-60",
          )}
        >
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            className="sr-only"
            disabled={busy}
            onChange={(e) => onPick(e.target.files)}
          />
          <Camera size={26} className="text-subtle" />
          <p className="text-xs font-600 text-muted-foreground">
            {busy ? "Uploading…" : "Add photos — flooding, receipts, agent chats"}
          </p>
          <p className="px-6 text-2xs text-subtle">
            Location and device details are stripped from every image before
            anyone sees it.
          </p>
        </label>
      )}

      {error && (
        <p className="mt-2 rounded-md bg-score-bad/[0.08] px-3 py-2 text-2xs text-score-bad">
          {error}
        </p>
      )}

      {mine.length > 0 && (
        <div className="mt-3">
          <p className="mb-1.5 text-2xs font-600 text-muted-foreground">
            {mine.length} photo{mine.length === 1 ? "" : "s"} attached · awaiting
            moderation
          </p>
          <div className="flex flex-wrap gap-2">
            {mine.map((photo) => (
              <AuthedImage
                key={photo.id}
                src={photo.thumb_url}
                alt={photo.caption ?? "Attached evidence"}
                needsAuth={photo.moderation_status !== "approved"}
                className="h-16 w-16 shrink-0 rounded-md object-cover"
              />
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}

/** Step 1 — pick the property being reviewed, from the ones we already know. */
function PropertyPicker({
  selected,
  onSelect,
}: {
  selected: string;
  onSelect: (id: string) => void;
}) {
  const { data: properties = [], isLoading, isError } = useProperties();
  const { t } = useI18n();

  if (isLoading) {
    return (
      <Card>
        <div className="space-y-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="skeleton h-16 rounded-lg" />
          ))}
        </div>
      </Card>
    );
  }

  if (isError) {
    return (
      <Card>
        <p className="text-sm font-600 text-score-bad">{t("error.title")}</p>
        <p className="mt-1 text-xs text-muted-foreground">{t("error.properties")}</p>
      </Card>
    );
  }

  return (
    <Card>
      <div className="mb-3 flex items-center gap-2">
        <MapPin size={16} className="text-primary" />
        <p className="text-sm font-700 text-heading">{t("wizard.whichProperty")}</p>
      </div>
      <div className="space-y-2">
        {properties.map((p) => (
          <button
            key={p.propertyId}
            onClick={() => onSelect(p.propertyId)}
            aria-pressed={selected === p.propertyId}
            className={cn(
              "flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-colors",
              selected === p.propertyId
                ? "border-primary bg-aqua-soft/40"
                : "border-border hover:border-primary/40",
            )}
          >
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-600 text-foreground">
                {p.addressLocal}
              </span>
              <span className="block font-mono text-2xs text-subtle">
                {p.propertyId}
              </span>
            </span>
            {selected === p.propertyId && (
              <CheckCircle2 size={18} className="flex-none text-primary" />
            )}
          </button>
        ))}
      </div>
      <div className="mt-3 border-t border-border pt-3">
        <AddressRegister onRegistered={onSelect} />
      </div>
    </Card>
  );
}

/** Find your own address and register it.
 *
 *  `POST /properties/identify` — the whole pin-drop identity flow from Section
 *  II — already existed, but nothing in the UI called it, so the wizard could
 *  only review properties that were already seeded. This is the missing half:
 *  search a real Lagos address, resolve it to an LGA and area, then register.
 *
 *  Identify de-duplicates within 15m, so searching for a building somebody has
 *  already added attaches to their PropertyID rather than creating a rival one. */
function AddressRegister({
  onRegistered,
}: {
  onRegistered: (propertyId: string) => void;
}) {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [term, setTerm] = useState("");
  const [debounced, setDebounced] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const id = setTimeout(() => setDebounced(term.trim()), 500);
    return () => clearTimeout(id);
  }, [term]);

  const { data: places = [], isFetching } = useQuery({
    queryKey: ["places", debounced],
    enabled: debounced.length >= 3,
    queryFn: () => api.searchPlaces(debounced),
    staleTime: 10 * 60 * 1000,
  });

  async function register(place: ApiPlace) {
    if (!place.resolved.lga_code || !place.resolved.area_code) {
      setError(t("wizard.addressOutsideCoverage"));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const out = await api.identifyProperty({
        lat: place.lat,
        lng: place.lng,
        lga_code: place.resolved.lga_code,
        area_code: place.resolved.area_code,
        // On an inexact match the tenant knows their address and OSM doesn't,
        // so keep what they typed verbatim. Storing the geocoder's "Magodo"
        // over their "16 Salako Street, Magodo" would throw away the only
        // accurate part of the record.
        address:
          place.precision === "exact"
            ? [place.road, place.suburb].filter(Boolean).join(", ") || place.label
            : debounced,
        // Tells the backend not to treat "same coordinate" as "same building":
        // every unmapped address in this area shares one centroid.
        location_approximate: place.precision !== "exact",
      });
      if (!out.property_id) {
        setError(out.message ?? t("wizard.addressAmbiguous"));
        return;
      }
      await queryClient.invalidateQueries({ queryKey: ["properties"] });
      onRegistered(out.property_id);
      setOpen(false);
      setTerm("");
    } catch (e) {
      const raw = e instanceof Error ? e.message : "";
      setError(raw.match(/"detail":"([^"]+)"/)?.[1] ?? t("wizard.addressFailed"));
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-border py-2.5 text-xs font-700 text-primary transition-colors hover:border-primary/50"
      >
        <Plus size={14} /> {t("wizard.addYourAddress")}
      </button>
    );
  }

  return (
    <div>
      <label className="flex h-11 items-center gap-2 rounded-lg bg-muted px-3 text-sm focus-within:shadow-focus">
        <Search size={15} className="text-subtle" aria-hidden />
        <input
          autoFocus
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          placeholder={t("wizard.addressPlaceholder")}
          aria-label={t("wizard.addYourAddress")}
          className="w-full bg-transparent outline-none placeholder:text-subtle"
        />
        {isFetching && <Loader2 size={14} className="animate-spin text-subtle" />}
      </label>

      <p className="mt-1.5 text-2xs leading-relaxed text-subtle">
        {t("wizard.addressHint")}
      </p>

      {error && (
        <p className="mt-2 rounded-md bg-score-bad/[0.08] px-3 py-2 text-2xs text-score-bad">
          {error}
        </p>
      )}

      {places.length > 0 && places[0].precision !== "exact" && (
        <p className="mt-2 rounded-md bg-primary/[0.07] px-3 py-2 text-2xs leading-relaxed text-muted-foreground">
          {places[0].precision === "street"
            ? t("wizard.addressApproxStreet")
            : t("wizard.addressApproxArea")}
        </p>
      )}

      <div className="mt-2 space-y-1.5">
        {places.map((place) => {
          const covered = !!place.resolved.area_code;
          return (
            <button
              key={`${place.lat},${place.lng}`}
              onClick={() => register(place)}
              disabled={busy || !covered}
              className={cn(
                "flex w-full items-start gap-2 rounded-lg border border-border p-2.5 text-left transition-colors",
                covered ? "hover:border-primary/50" : "opacity-50",
              )}
            >
              <MapPin size={14} className="mt-0.5 flex-none text-primary" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-xs font-600 text-foreground">
                  {place.road ?? place.label.split(",")[0]}
                </span>
                <span className="block truncate text-2xs text-subtle">
                  {covered
                    ? `${place.resolved.area_name} · ${place.resolved.lga_name}`
                    : t("wizard.addressOutsideCoverage")}
                </span>
              </span>
            </button>
          );
        })}

        {debounced.length >= 3 && !isFetching && places.length === 0 && (
          <p className="px-1 py-2 text-2xs text-muted-foreground">
            {t("wizard.addressNoMatch", { q: debounced })}
          </p>
        )}
      </div>

      <button
        onClick={() => {
          setOpen(false);
          setError(null);
        }}
        className="mt-2 text-2xs font-600 text-subtle"
      >
        Cancel
      </button>
    </div>
  );
}

/** One category with tappable 1–5 score buttons (selected = teal + ring). */
function RatingRow({
  label,
  hint,
  value,
  onChange,
}: {
  label: string;
  hint: string;
  value: number;
  onChange: (v: number) => void;
}) {
  const { t } = useI18n();

  // The score bands used everywhere else in the app, so the colour a tenant
  // picks here is the colour they will later see on the property page.
  const bandClass = (n: number) =>
    n >= 4
      ? "bg-score-good shadow-[0_0_0_3px_rgba(21,128,61,.22)]"
      : n === 3
        ? "bg-score-mid shadow-[0_0_0_3px_rgba(180,83,9,.22)]"
        : "bg-score-bad shadow-[0_0_0_3px_rgba(185,28,28,.22)]";

  return (
    <div className="rounded-lg border border-border bg-card p-3.5">
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <span className="text-xs font-600 text-foreground">{label}</span>
        <span className="text-2xs text-subtle">{hint}</span>
      </div>

      {/* A real radiogroup rather than five unlabelled buttons: without this a
          screen reader announced "1 2 3 4 5" with no indication of what was
          being rated or which was chosen. */}
      <div
        role="radiogroup"
        aria-label={label}
        className="flex gap-[7px]"
      >
        {[1, 2, 3, 4, 5].map((n) => (
          <motion.button
            key={n}
            type="button"
            role="radio"
            aria-checked={n === value}
            // The number alone means nothing out of context, so the accessible
            // name carries the word too.
            aria-label={`${n} — ${t(`rate.${n}`)}`}
            whileTap={{ scale: 0.94 }}
            onClick={() => onChange(n)}
            className={cn(
              "h-[38px] flex-1 rounded-md text-sm transition-all",
              n === value
                ? `font-800 text-white ${bandClass(n)}`
                : "border border-border font-700 text-subtle hover:border-primary/40",
            )}
          >
            {n}
          </motion.button>
        ))}
      </div>

      {/* Anchors, so the scale reads without having to be guessed at. Once a
          score is chosen the endpoints are replaced by what it actually means —
          the ambiguity that mattered was "what is a 3", not "which end is up". */}
      <div className="mt-1.5 min-h-[14px] text-2xs">
        {value === 0 ? (
          <div className="flex justify-between text-subtle">
            <span>1 · {t("rate.worst")}</span>
            <span>5 · {t("rate.best")}</span>
          </div>
        ) : (
          <p
            className={cn(
              "text-center font-600",
              value >= 4
                ? "text-score-good"
                : value === 3
                  ? "text-score-mid"
                  : "text-score-bad",
            )}
          >
            {value} · {t(`rate.${value}`)}
          </p>
        )}
      </div>
    </div>
  );
}
