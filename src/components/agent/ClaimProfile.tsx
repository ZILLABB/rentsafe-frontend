import { BadgeCheck, Loader2 } from "lucide-react";
import { useState } from "react";
import { Card, SectionLabel } from "@/components/ui/Card";
import { api, getToken } from "@/lib/api";
import { useI18n } from "@/lib/i18n";

/** "Is this you?" — ask to take control of an agent profile.
 *
 *  `profile_claimed` existed on the model from the start with nothing able to
 *  set it, which meant the right-of-reply feature was unreachable by the agents
 *  it exists for: an agent could be reviewed publicly and had no way to answer.
 *
 *  Submitting is explicitly not granting, and the copy says so. The power being
 *  requested — replying on the record as a named agent — is exactly what a rival
 *  would want, so a human checks it.
 */
export function ClaimProfile({
  slug,
  claimed,
}: {
  slug: string;
  claimed: boolean;
}) {
  const { t } = useI18n();
  const signedIn = !!getToken();
  const [open, setOpen] = useState(false);
  const [lasrera, setLasrera] = useState("");
  const [email, setEmail] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  if (claimed) {
    return (
      <Card>
        <p className="flex items-center gap-2 text-2xs text-muted-foreground">
          <BadgeCheck size={14} className="flex-none text-score-good" />
          {t("claim.alreadyClaimed")}
        </p>
      </Card>
    );
  }

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      const out = await api.claimAgent(slug, {
        lasrera_number: lasrera.trim() || undefined,
        contact_email: email.trim() || undefined,
        evidence_note: note.trim() || undefined,
      });
      setDone(out.message);
      setOpen(false);
    } catch (e) {
      const raw = e instanceof Error ? e.message : "";
      setError(raw.match(/"detail":"([^"]+)"/)?.[1] ?? t("account.genericError"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <SectionLabel className="mb-1.5">{t("claim.title")}</SectionLabel>

      {done ? (
        <p className="rounded-md bg-score-good/[0.09] px-3 py-2 text-2xs leading-relaxed text-score-good">
          {done}
        </p>
      ) : (
        <>
          <p className="text-2xs leading-relaxed text-subtle">{t("claim.body")}</p>

          {error && (
            <p className="mt-2 rounded-md bg-score-bad/[0.08] px-3 py-2 text-2xs text-score-bad">
              {error}
            </p>
          )}

          {!signedIn ? (
            <p className="mt-2 text-2xs text-muted-foreground">
              {t("claim.signInFirst")}
            </p>
          ) : open ? (
            <div className="mt-2.5 space-y-2">
              <input
                value={lasrera}
                onChange={(e) => setLasrera(e.target.value)}
                placeholder={t("claim.lasreraPlaceholder")}
                aria-label={t("claim.lasreraPlaceholder")}
                className="h-9 w-full rounded-lg bg-muted px-3 text-xs outline-none placeholder:text-subtle focus:shadow-focus"
              />
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                type="email"
                placeholder={t("claim.emailPlaceholder")}
                aria-label={t("claim.emailPlaceholder")}
                className="h-9 w-full rounded-lg bg-muted px-3 text-xs outline-none placeholder:text-subtle focus:shadow-focus"
              />
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
                placeholder={t("claim.notePlaceholder")}
                aria-label={t("claim.notePlaceholder")}
                className="w-full rounded-lg bg-muted px-3 py-2 text-xs outline-none placeholder:text-subtle focus:shadow-focus"
              />
              <div className="flex gap-2">
                <button
                  onClick={submit}
                  disabled={busy}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-2 text-2xs font-700 text-white disabled:opacity-40"
                >
                  {busy && <Loader2 size={12} className="animate-spin" />}
                  {t("claim.submit")}
                </button>
                <button
                  onClick={() => setOpen(false)}
                  className="rounded-lg border border-border px-3.5 py-2 text-2xs font-600 text-muted-foreground"
                >
                  {t("review.cancel")}
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setOpen(true)}
              className="mt-2.5 rounded-lg border border-border px-3.5 py-2 text-2xs font-700 text-foreground transition-colors hover:border-primary/50"
            >
              {t("claim.cta")}
            </button>
          )}
        </>
      )}
    </Card>
  );
}
