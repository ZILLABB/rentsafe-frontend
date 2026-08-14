import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { CheckCircle2, ShieldAlert, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { FadeIn } from "@/components/motion";
import { PhotoQueue } from "@/components/admin/PhotoQueue";
import { Card, SectionLabel } from "@/components/ui/Card";
import { PropertyIdChip } from "@/components/ui/Chip";
import {
  api,
  getToken,
  clearSession,
  type ApiQueueItem,
  type ModerationAction,
} from "@/lib/api";
import { cn } from "@/lib/cn";

/** Human labels for the reasons the automated pre-check returns.
 *
 *  The reasons themselves come from the API. This dashboard used to keep its
 *  own copy of the risky-phrase list for highlighting, which had already
 *  drifted out of sync with the backend's — the frontend listed "doubled the
 *  fee", which the backend never matched, and knew nothing about the Pidgin
 *  and Yoruba patterns the backend does match. */
const REASON_LABEL: Record<string, string> = {
  legally_risky_language: "Legal risk — allegation against a named party",
  profanity: "Profanity",
  velocity: "Velocity — several reviews from this account in 24h",
  duplicate_text: "Duplicate — same text already submitted for this property",
};

/** Admin moderation dashboard (design 2d). Internal — reachable at /admin.
 *  OTP login as the seeded admin, SLA strip, queue with approve/reject wired
 *  to PATCH /admin/moderation/reviews/{id}. */
export default function AdminPage() {
  const [authed, setAuthed] = useState(!!getToken());
  if (!authed) return <AdminLogin onDone={() => setAuthed(true)} />;
  return <AdminQueue onAuthError={() => setAuthed(false)} />;
}

function AdminLogin({ onDone }: { onDone: () => void }) {
  const [phone, setPhone] = useState("08000000001");
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function send() {
    setBusy(true);
    setError(null);
    try {
      const out = await api.requestOtp(phone);
      setSent(true);
      if (out.dev_code) setCode(out.dev_code);
    } catch (e) {
      setError(e instanceof Error ? e.message : "failed");
    } finally {
      setBusy(false);
    }
  }

  async function verify() {
    setBusy(true);
    setError(null);
    try {
      clearSession(); // drop any tenant session first
      await api.verifyOtp(phone, code);
      onDone();
    } catch (e) {
      setError(e instanceof Error ? e.message : "failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-sm pt-10">
      <FadeIn>
        <Card>
          <div className="mb-3 flex items-center gap-2.5">
            <span className="flex h-10 w-10 items-center justify-center rounded-md bg-ink">
              <ShieldCheck size={18} className="text-aqua" />
            </span>
            <div>
              <p className="font-display text-base font-800 text-heading">
                RentSafe <span className="rounded-sm bg-gold px-1 text-2xs align-middle text-heading">ADMIN</span>
              </p>
              <p className="text-2xs text-subtle">Moderator sign-in</p>
            </div>
          </div>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full rounded-md border border-input bg-background px-3 py-2.5 text-sm outline-none focus:shadow-focus"
          />
          {sent && (
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="6-digit code"
              className="mt-2 w-full rounded-md border border-input bg-background px-3 py-2.5 font-mono text-sm tracking-[0.3em] outline-none focus:shadow-focus"
            />
          )}
          {error && <p className="mt-2 text-xs text-score-bad">{error}</p>}
          <button
            onClick={sent ? verify : send}
            disabled={busy}
            className="mt-3 w-full rounded-lg bg-primary py-3 font-display text-sm font-700 text-white disabled:opacity-50"
          >
            {busy ? "…" : sent ? "Sign in" : "Send code"}
          </button>
        </Card>
      </FadeIn>
    </div>
  );
}

function AdminQueue({ onAuthError }: { onAuthError: () => void }) {
  const queryClient = useQueryClient();
  const [view, setView] = useState<"reviews" | "photos">("reviews");
  const [acted, setActed] = useState<Record<number, string>>({});
  const [actError, setActError] = useState<string | null>(null);

  const { data: queue = [], isError, error } = useQuery({
    queryKey: ["admin-queue"],
    queryFn: api.adminQueue,
    refetchInterval: 15_000,
  });

  if (isError) {
    const msg = error instanceof Error ? error.message : "";
    if (msg.includes("401") || msg.includes("403")) {
      return (
        <div className="pt-10 text-center">
          <ShieldAlert size={28} className="mx-auto text-score-mid" />
          <p className="mt-2 text-sm font-600 text-foreground">
            This account is not an admin.
          </p>
          <button
            onClick={() => {
              clearSession();
              onAuthError();
            }}
            className="mt-3 rounded-lg bg-primary px-4 py-2 text-xs font-700 text-white"
          >
            Sign in as admin
          </button>
        </div>
      );
    }
  }

  async function act(id: number, action: ModerationAction, note?: string) {
    setActError(null);
    try {
      await api.adminModerate(id, action, note);
      setActed((a) => ({ ...a, [id]: action }));
      await queryClient.invalidateQueries({ queryKey: ["admin-queue"] });
      await queryClient.invalidateQueries({ queryKey: ["properties"] });
    } catch (e) {
      setActError(e instanceof Error ? e.message : "Could not save that decision");
    }
  }

  const flagged = queue.filter((q) => q.status === "flagged").length;
  const oldest = queue.length
    ? Math.max(...queue.map((q) => q.submitted_hours_ago))
    : 0;

  return (
    <div className="space-y-4">
      <FadeIn>
        <div className="flex items-center justify-between">
          <h1 className="font-display text-xl font-800 text-heading">
            {view === "reviews" ? "Review moderation queue" : "Photo moderation queue"}
          </h1>
          <span className="rounded-sm bg-gold px-1.5 py-0.5 text-2xs font-800 text-heading">
            ADMIN
          </span>
        </div>
      </FadeIn>

      {/* Reviews / photos. Photo endpoints existed from the start with nothing
          calling them, so uploads sat pending and invisible forever. */}
      <FadeIn delay={0.02}>
        <div className="flex gap-2">
          {(["reviews", "photos"] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              aria-pressed={view === v}
              className={cn(
                "rounded-lg px-3 py-1.5 text-xs font-700 transition-colors",
                view === v
                  ? "bg-ink text-white"
                  : "border border-border text-muted-foreground hover:text-foreground",
              )}
            >
              {v === "reviews" ? "Reviews" : "Photos"}
            </button>
          ))}
        </div>
      </FadeIn>

      {view === "photos" && <PhotoQueue />}

      {view === "reviews" && (
        <>
      {/* SLA strip */}
      <FadeIn delay={0.05}>
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          {[
            { label: "Pending reviews", value: String(queue.length), tone: "text-heading" },
            {
              label: "Oldest in queue",
              value: `${Math.round(oldest)}h`,
              tone: oldest > 48 ? "text-score-mid" : "text-heading",
              sub: oldest > 48 ? "SLA 72h — at risk" : undefined,
            },
            { label: "Flagged (legal risk)", value: String(flagged), tone: flagged ? "text-score-bad" : "text-heading" },
            { label: "Actioned this session", value: String(Object.keys(acted).length), tone: "text-score-good" },
          ].map((s) => (
            <div key={s.label} className="rounded-lg border border-border bg-card px-3.5 py-3">
              <p className="text-2xs font-600 text-subtle">{s.label}</p>
              <p className={cn("font-display text-2xl font-800", s.tone)}>{s.value}</p>
              {s.sub && <p className="text-2xs font-700 text-score-bad">{s.sub}</p>}
            </div>
          ))}
        </div>
      </FadeIn>

      {/* Queue */}
      <div className="space-y-2.5">
        {queue.length === 0 && (
          <Card className="py-10 text-center">
            <CheckCircle2 size={26} className="mx-auto text-score-good" />
            <p className="mt-2 text-sm font-600 text-foreground">Queue is clear</p>
            <p className="text-xs text-subtle">New submissions land here for review.</p>
          </Card>
        )}
        {queue.map((q) => (
          <QueueCard
            key={q.review_id}
            item={q}
            acted={acted[q.review_id]}
            onAct={act}
          />
        ))}
      </div>

      {actError && (
        <p className="rounded-md bg-score-bad/[0.08] px-3 py-2 text-xs text-score-bad">
          {actError}
        </p>
      )}

      <SectionLabel className="pt-2 !text-subtle">
        Auto-checks run before queueing: profanity · duplicate text · velocity ·
        risky-phrase scan (English, Pidgin, Yorùbá)
      </SectionLabel>
        </>
      )}
    </div>
  );
}

/** One queue item. Shows the rating being decided on, not just the prose —
 *  approving a review publishes a score, so the score has to be visible. */
function QueueCard({
  item: q,
  acted,
  onAct,
}: {
  item: ApiQueueItem;
  acted?: string;
  onAct: (id: number, action: ModerationAction, note?: string) => Promise<void>;
}) {
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  async function run(action: ModerationAction) {
    setBusy(true);
    await onAct(q.review_id, action, note.trim() || undefined);
    setBusy(false);
  }

  // Rejecting or bouncing a review is a decision the author is owed a reason
  // for, so the server requires a note and the UI enforces it up front.
  const needsNote = !note.trim();

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "rounded-lg border bg-card p-4",
        q.status === "flagged"
          ? "border-score-bad/35 border-l-[3px] border-l-score-bad"
          : "border-border",
      )}
    >
      <div className="mb-1.5 flex flex-wrap items-center gap-2">
        <PropertyIdChip id={q.property_id} />
        <span className="text-2xs text-subtle">
          · submitted {Math.round(q.submitted_hours_ago)}h ago
        </span>
        {q.aggregate !== null && (
          <span
            className={cn(
              "ml-auto rounded-[5px] px-2 py-0.5 font-mono text-2xs font-800",
              q.aggregate >= 4
                ? "bg-score-good/10 text-score-good"
                : q.aggregate >= 3
                  ? "bg-score-mid/10 text-score-mid"
                  : "bg-score-bad/10 text-score-bad",
            )}
            title="Rating this review would publish"
          >
            {q.aggregate.toFixed(1)}
          </span>
        )}
      </div>

      {q.property_address && (
        <p className="mb-1.5 text-2xs text-muted-foreground">{q.property_address}</p>
      )}

      {/* Why the pre-check held it, straight from the stored verdict. */}
      {q.flag_reasons.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1.5">
          {q.flag_reasons.map((r) => (
            <span
              key={r}
              className="rounded-[5px] bg-score-bad px-2 py-0.5 text-2xs font-800 text-white"
            >
              {REASON_LABEL[r] ?? r}
            </span>
          ))}
        </div>
      )}

      <p className="mb-2 text-2xs text-subtle">
        {q.verified_tenant ? "✓ Verified tenant" : "Unverified tenant"}
        {q.reviewer_trust !== null && ` · trust ${q.reviewer_trust.toFixed(2)}`}
      </p>

      {q.text_positives && (
        <p className="text-xs leading-relaxed text-foreground">
          <strong className="text-score-good">Loved:</strong> {q.text_positives}
        </p>
      )}
      {q.text_warnings && (
        <p className="mt-1 text-xs leading-relaxed text-foreground">
          <strong className="text-score-bad">Warnings:</strong> {q.text_warnings}
        </p>
      )}

      {acted ? (
        <span
          className={cn(
            "mt-3 inline-block rounded-md px-3.5 py-2 text-xs font-700",
            acted === "approve"
              ? "bg-score-good/10 text-score-good"
              : acted === "request_edits"
                ? "bg-info/10 text-info"
                : "bg-score-bad/10 text-score-bad",
          )}
        >
          {acted === "approve"
            ? "Approved ✓"
            : acted === "request_edits"
              ? "Sent back for edits"
              : "Rejected"}
        </span>
      ) : (
        <>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            placeholder="Reason — shown to the author. Required to reject or ask for edits."
            className="mt-3 w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-xs outline-none focus:shadow-focus"
          />
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              onClick={() => run("approve")}
              disabled={busy}
              className="rounded-md bg-score-good px-3.5 py-2 text-2xs font-700 text-white transition-transform active:scale-[0.97] disabled:opacity-50"
            >
              Approve
            </button>
            <button
              onClick={() => run("reject")}
              disabled={busy || needsNote}
              title={needsNote ? "Add a reason first" : undefined}
              className="rounded-md bg-score-bad px-3.5 py-2 text-2xs font-700 text-white transition-transform active:scale-[0.97] disabled:opacity-40"
            >
              Reject
            </button>
            <button
              onClick={() => run("request_edits")}
              disabled={busy || needsNote}
              title={needsNote ? "Add a reason first" : undefined}
              className="rounded-md bg-muted px-3.5 py-2 text-2xs font-600 text-muted-foreground transition-transform active:scale-[0.97] disabled:opacity-40"
            >
              Ask edits
            </button>
          </div>
        </>
      )}
    </motion.div>
  );
}
