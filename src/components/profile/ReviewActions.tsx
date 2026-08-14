import { useQueryClient } from "@tanstack/react-query";
import { Loader2, Pencil, Trash2 } from "lucide-react";
import { useState } from "react";
import { api } from "@/lib/api";
import { useI18n } from "@/lib/i18n";

/** Amend or withdraw your own review, inside the 48-hour window.
 *
 *  The Profile page promised this from the start and nothing implemented it.
 *  That mattered more than a normal missing feature: the terms make the author
 *  personally liable for a false statement of fact about a named landlord, so a
 *  tenant who got something wrong had no way to put it right.
 *
 *  The controls appear only while the window is genuinely open — the server
 *  reports the remaining seconds — rather than being offered and then refused.
 */
export function ReviewActions({
  reviewId,
  secondsLeft,
  positives,
  warnings,
}: {
  reviewId: number;
  secondsLeft: number;
  positives: string;
  warnings: string;
}) {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [pos, setPos] = useState(positives);
  const [warn, setWarn] = useState(warnings);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  if (secondsLeft <= 0) return null;

  const hoursLeft = Math.max(1, Math.round(secondsLeft / 3600));

  function fail(e: unknown) {
    const raw = e instanceof Error ? e.message : "";
    setError(raw.match(/"detail":"([^"]+)"/)?.[1] ?? t("account.genericError"));
  }

  async function save() {
    setBusy(true);
    setError(null);
    try {
      const out = await api.editReview(reviewId, {
        text_positives: pos.trim(),
        text_warnings: warn.trim(),
      });
      setNote(out.message);
      setEditing(false);
      await queryClient.invalidateQueries({ queryKey: ["reviews", "mine"] });
    } catch (e) {
      fail(e);
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!window.confirm(t("review.deleteConfirm"))) return;
    setBusy(true);
    setError(null);
    try {
      await api.deleteReview(reviewId);
      await queryClient.invalidateQueries({ queryKey: ["reviews", "mine"] });
    } catch (e) {
      fail(e);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="border-t border-border px-2.5 py-2">
      {error && (
        <p className="mb-2 rounded-md bg-score-bad/[0.08] px-2.5 py-1.5 text-2xs text-score-bad">
          {error}
        </p>
      )}
      {note && (
        <p className="mb-2 rounded-md bg-primary/[0.08] px-2.5 py-1.5 text-2xs text-muted-foreground">
          {note}
        </p>
      )}

      {editing ? (
        <div className="space-y-2">
          <label className="block">
            <span className="text-2xs font-600 text-score-good">
              {t("review.positivesLabel")}
            </span>
            <textarea
              value={pos}
              onChange={(e) => setPos(e.target.value)}
              rows={3}
              className="mt-1 w-full rounded-md border border-input bg-background px-2.5 py-2 text-xs outline-none focus:shadow-focus"
            />
          </label>
          <label className="block">
            <span className="text-2xs font-600 text-score-bad">
              {t("review.warningsLabel")}
            </span>
            <textarea
              value={warn}
              onChange={(e) => setWarn(e.target.value)}
              rows={3}
              className="mt-1 w-full rounded-md border border-input bg-background px-2.5 py-2 text-xs outline-none focus:shadow-focus"
            />
          </label>
          {/* Said before they save, not after: an edit un-publishes the review
              until a moderator sees it again. */}
          <p className="text-2xs leading-relaxed text-subtle">
            {t("review.editRemoderated")}
          </p>
          <div className="flex gap-2">
            <button
              onClick={save}
              disabled={busy}
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-2xs font-700 text-white disabled:opacity-40"
            >
              {busy && <Loader2 size={12} className="animate-spin" />}
              {t("review.saveChanges")}
            </button>
            <button
              onClick={() => {
                setEditing(false);
                setPos(positives);
                setWarn(warnings);
              }}
              className="rounded-lg border border-border px-3 py-1.5 text-2xs font-600 text-muted-foreground"
            >
              {t("review.cancel")}
            </button>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <button
            onClick={() => setEditing(true)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1 text-2xs font-600 text-foreground transition-colors hover:border-primary/50"
          >
            <Pencil size={11} /> {t("review.edit")}
          </button>
          <button
            onClick={remove}
            disabled={busy}
            className="inline-flex items-center gap-1.5 rounded-lg border border-score-bad/40 px-2.5 py-1 text-2xs font-600 text-score-bad transition-colors hover:bg-score-bad/[0.06] disabled:opacity-40"
          >
            <Trash2 size={11} /> {t("review.withdraw")}
          </button>
          <span className="ml-auto text-2xs text-subtle">
            {t("review.hoursLeft", { n: String(hoursLeft) })}
          </span>
        </div>
      )}
    </div>
  );
}
