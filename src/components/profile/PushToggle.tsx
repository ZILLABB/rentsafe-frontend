import { BellOff, BellRing, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { disable, enable, currentState, type PushState } from "@/lib/push";
import { useI18n } from "@/lib/i18n";

/** Turn phone notifications for watched areas on or off.
 *
 *  Watches already personalised the feed and the unread badge; this is what
 *  makes them arrive when the app is closed, which is the case they matter in.
 *
 *  Every state that isn't "on" or "off" is explained rather than hidden, because
 *  "I tapped the toggle and nothing happened" is the worst version of this.
 */
export function PushToggle() {
  const { t } = useI18n();
  const [state, setState] = useState<PushState | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    currentState().then(setState).catch(() => setState("unsupported"));
  }, []);

  async function toggle() {
    setBusy(true);
    try {
      setState(state === "on" ? await disable() : await enable());
    } catch {
      // A failed subscribe leaves the previous state intact; re-reading it is
      // more honest than assuming which way it went.
      setState(await currentState().catch(() => null));
    } finally {
      setBusy(false);
    }
  }

  if (state === null) return null;

  const explanation: Partial<Record<PushState, string>> = {
    unsupported: t("push.unsupported"),
    disabled: t("push.notEnabled"),
    denied: t("push.blocked"),
  };
  const note = explanation[state];
  const on = state === "on";

  return (
    <div className="flex items-start gap-3 border-t border-border pt-3">
      <span className="mt-0.5 flex h-9 w-9 flex-none items-center justify-center rounded-md bg-aqua-soft">
        {on ? (
          <BellRing size={16} className="text-primary" />
        ) : (
          <BellOff size={16} className="text-subtle" />
        )}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-600 text-foreground">{t("push.title")}</p>
        <p className="mt-0.5 text-2xs leading-relaxed text-subtle">
          {note ?? t("push.explain")}
        </p>
        {!note && (
          <button
            onClick={toggle}
            disabled={busy}
            className={`mt-2 inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-2xs font-700 transition-colors disabled:opacity-40 ${
              on
                ? "border border-border text-foreground hover:border-primary/50"
                : "bg-primary text-white"
            }`}
          >
            {busy && <Loader2 size={12} className="animate-spin" />}
            {on ? t("push.turnOff") : t("push.turnOn")}
          </button>
        )}
      </div>
    </div>
  );
}
