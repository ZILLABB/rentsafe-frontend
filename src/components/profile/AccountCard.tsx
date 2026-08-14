import { AlertTriangle, Download, Phone, Trash2 } from "lucide-react";
import { useState } from "react";
import { Card, SectionLabel } from "@/components/ui/Card";
import { api, clearSession } from "@/lib/api";
import { PushToggle } from "@/components/profile/PushToggle";
import { useI18n } from "@/lib/i18n";

/** Account management: change the number, exercise NDPR rights.
 *
 *  The phone hash is the only route back to a user row — plaintext numbers are
 *  never stored — so a lost number used to mean a lost account and every review
 *  written from it. Nigerian numbers change hands often enough that this is a
 *  routine event, not an edge case.
 *
 *  Export and deletion existed as endpoints with nothing calling them, which
 *  meant rights users legally hold under the NDPR were unreachable in practice.
 */
export function AccountCard({ phoneLast4 }: { phoneLast4: string | null }) {
  const { t } = useI18n();
  const [stage, setStage] = useState<"idle" | "code">("idle");
  const [newPhone, setNewPhone] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  function fail(e: unknown) {
    const raw = e instanceof Error ? e.message : "";
    setError(raw.match(/"detail":"([^"]+)"/)?.[1] ?? t("account.genericError"));
  }

  async function start() {
    setBusy(true);
    setError(null);
    try {
      await api.startPhoneChange(newPhone);
      setStage("code");
    } catch (e) {
      fail(e);
    } finally {
      setBusy(false);
    }
  }

  async function confirm() {
    setBusy(true);
    setError(null);
    try {
      const me = await api.confirmPhoneChange(newPhone, code);
      setDone(t("account.phoneChanged", { last4: me.phone_last4 ?? "" }));
      setStage("idle");
      setNewPhone("");
      setCode("");
    } catch (e) {
      fail(e);
    } finally {
      setBusy(false);
    }
  }

  async function exportData() {
    setBusy(true);
    setError(null);
    try {
      const data = await api.exportMyData();
      // Handed over as a file rather than shown on screen: it contains every
      // review they've written, including ones still in moderation.
      const url = URL.createObjectURL(
        new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }),
      );
      const a = document.createElement("a");
      a.href = url;
      a.download = "rentsafe-my-data.json";
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      fail(e);
    } finally {
      setBusy(false);
    }
  }

  async function deleteAccount() {
    // Deliberately a confirm with the consequence spelled out. This is the one
    // irreversible action in the app.
    if (!window.confirm(t("account.deleteConfirm"))) return;
    setBusy(true);
    setError(null);
    try {
      await api.deleteMyAccount();
      clearSession();
      window.location.assign("/");
    } catch (e) {
      fail(e);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <SectionLabel className="mb-2.5">{t("account.title")}</SectionLabel>

      {done && (
        <p className="mb-2 rounded-md bg-score-good/[0.09] px-3 py-2 text-2xs text-score-good">
          {done}
        </p>
      )}
      {error && (
        <p className="mb-2 rounded-md bg-score-bad/[0.08] px-3 py-2 text-2xs text-score-bad">
          {error}
        </p>
      )}

      <div className="flex items-start gap-3 border-b border-border pb-3">
        <span className="mt-0.5 flex h-9 w-9 flex-none items-center justify-center rounded-md bg-aqua-soft">
          <Phone size={16} className="text-primary" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-600 text-foreground">
            {t("account.phoneNumber")}
            {phoneLast4 ? ` ····${phoneLast4}` : ""}
          </p>
          <p className="mt-0.5 text-2xs leading-relaxed text-subtle">
            {t("account.phoneWhy")}
          </p>

          {stage === "idle" ? (
            <div className="mt-2 flex gap-2">
              <input
                value={newPhone}
                onChange={(e) => setNewPhone(e.target.value)}
                inputMode="tel"
                placeholder={t("account.newPhonePlaceholder")}
                aria-label={t("account.newPhonePlaceholder")}
                className="h-9 min-w-0 flex-1 rounded-lg bg-muted px-3 text-xs outline-none placeholder:text-subtle focus:shadow-focus"
              />
              <button
                onClick={start}
                disabled={busy || newPhone.trim().length < 7}
                className="h-9 flex-none rounded-lg bg-primary px-3.5 text-2xs font-700 text-white disabled:opacity-40"
              >
                {t("account.sendCode")}
              </button>
            </div>
          ) : (
            <div className="mt-2 flex gap-2">
              <input
                value={code}
                onChange={(e) => setCode(e.target.value)}
                inputMode="numeric"
                placeholder={t("account.codePlaceholder")}
                aria-label={t("account.codePlaceholder")}
                className="h-9 min-w-0 flex-1 rounded-lg bg-muted px-3 font-mono text-xs outline-none placeholder:text-subtle focus:shadow-focus"
              />
              <button
                onClick={confirm}
                disabled={busy || code.trim().length < 4}
                className="h-9 flex-none rounded-lg bg-primary px-3.5 text-2xs font-700 text-white disabled:opacity-40"
              >
                {t("account.confirm")}
              </button>
            </div>
          )}
        </div>
      </div>

      <PushToggle />

      <div className="flex items-start gap-3 border-t border-border pt-3">
        <span className="mt-0.5 flex h-9 w-9 flex-none items-center justify-center rounded-md bg-inset">
          <Download size={16} className="text-subtle" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-600 text-foreground">{t("account.yourData")}</p>
          <p className="mt-0.5 text-2xs leading-relaxed text-subtle">
            {t("account.ndprRights")}
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              onClick={exportData}
              disabled={busy}
              className="rounded-lg border border-border px-3 py-1.5 text-2xs font-700 text-foreground transition-colors hover:border-primary/50 disabled:opacity-40"
            >
              {t("account.download")}
            </button>
            <button
              onClick={deleteAccount}
              disabled={busy}
              className="inline-flex items-center gap-1.5 rounded-lg border border-score-bad/40 px-3 py-1.5 text-2xs font-700 text-score-bad transition-colors hover:bg-score-bad/[0.06] disabled:opacity-40"
            >
              <Trash2 size={12} /> {t("account.delete")}
            </button>
          </div>
          {/* Said plainly up front rather than buried in a dialog: reviews
              survive deletion, detached from the account. */}
          <p className="mt-2 flex items-start gap-1.5 text-2xs leading-relaxed text-muted-foreground">
            <AlertTriangle size={12} className="mt-px flex-none text-subtle" aria-hidden />
            <span>{t("account.deleteNote")}</span>
          </p>
        </div>
      </div>
    </Card>
  );
}
