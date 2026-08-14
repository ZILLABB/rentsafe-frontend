import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, Calculator, Check, Share2 } from "lucide-react";
import { useState } from "react";
import { FadeIn } from "@/components/motion";
import { Card, SectionLabel } from "@/components/ui/Card";
import { api } from "@/lib/api";
import { formatNairaFull } from "@/lib/format";
import { useI18n } from "@/lib/i18n";

/** "Is this fee normal?" — the one page that works on day one.
 *
 *  Every other screen needs reviews of a specific building before it can say
 *  anything, and there are nine properties. This answers from area-level
 *  aggregates, so it is useful immediately — and it is the question Lagos
 *  tenants actually get burned on, since agent and agreement fees are quoted as
 *  a percentage of annual rent and the gap between customary and charged is
 *  where overcharging lives.
 *
 *  No account required: someone who has just been sent a number on WhatsApp can
 *  check it before they have ever used the app.
 */
export default function FeeCheckPage() {
  const { t } = useI18n();
  const [rent, setRent] = useState("");
  const [agent, setAgent] = useState("");
  const [agreement, setAgreement] = useState("");
  const [caution, setCaution] = useState("");
  const [area, setArea] = useState("");
  const [copied, setCopied] = useState(false);

  // Areas come straight from the API rather than a hook: this is the only
  // screen that needs the full list, so a shared hook would be one caller wide.
  const { data: areas = [] } = useQuery({
    queryKey: ["neighbourhoods"],
    queryFn: api.listNeighbourhoods,
    staleTime: 60 * 60 * 1000,
  });

  const rentKobo = Math.round(Number(rent || "0") * 100);
  const enabled = rentKobo > 0;

  const { data } = useQuery({
    queryKey: ["fees", rentKobo, agent, agreement, caution, area],
    enabled,
    queryFn: () =>
      api.checkFees({
        rent_kobo: rentKobo,
        agent_fee_kobo: Math.round(Number(agent || "0") * 100),
        agreement_fee_kobo: Math.round(Number(agreement || "0") * 100),
        caution_fee_kobo: Math.round(Number(caution || "0") * 100),
        area: area || undefined,
      }),
  });

  const tone = {
    typical: "text-score-good",
    high: "text-score-mid",
    very_high: "text-score-bad",
  } as const;

  function share() {
    if (!data) return;
    const lines = data.lines
      .map((l) => `${l.label}: ${l.pct_of_rent}% (usual ${l.benchmark_pct}%)`)
      .join("\n");
    const text = `${t("fees.shareIntro")}\n\n${lines}\n\n${data.summary}\n${window.location.href}`;
    // WhatsApp is where these numbers get sent in the first place, so it is
    // where the answer needs to be shareable back to.
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
    setCopied(true);
  }

  return (
    <div className="space-y-3 xl:grid xl:grid-cols-[minmax(0,440px)_minmax(0,1fr)] xl:items-start xl:gap-5 xl:space-y-0">
      <div className="space-y-3 xl:sticky xl:top-5">
        <FadeIn>
          <div className="-mx-4 -mt-4 bg-ink px-4 py-5 text-white md:mx-0 md:mt-0 md:rounded-2xl">
            <span className="flex h-9 w-9 items-center justify-center rounded-md bg-white/10">
              <Calculator size={17} className="text-aqua" />
            </span>
            <h1 className="mt-2.5 font-display text-xl font-800">
              {t("fees.title")}
            </h1>
            <p className="mt-1 text-2xs leading-relaxed text-white/60">
              {t("fees.subtitle")}
            </p>
          </div>
        </FadeIn>

        <FadeIn delay={0.05}>
          <Card>
            <SectionLabel className="mb-2.5">{t("fees.whatQuoted")}</SectionLabel>
            <div className="space-y-2.5">
              {[
                { label: t("fees.annualRent"), value: rent, set: setRent, required: true },
                { label: t("fees.agentFee"), value: agent, set: setAgent },
                { label: t("fees.agreementFee"), value: agreement, set: setAgreement },
                { label: t("fees.cautionFee"), value: caution, set: setCaution },
              ].map((f) => (
                <label key={f.label} className="block">
                  <span className="text-2xs font-600 text-foreground">
                    {f.label}
                    {f.required && <span className="text-score-bad"> *</span>}
                  </span>
                  <div className="mt-1 flex h-10 items-center gap-1.5 rounded-lg bg-muted px-3 focus-within:shadow-focus">
                    <span className="text-xs text-subtle">₦</span>
                    <input
                      value={f.value}
                      onChange={(e) => f.set(e.target.value.replace(/[^\d]/g, ""))}
                      inputMode="numeric"
                      placeholder="0"
                      aria-label={f.label}
                      className="w-full bg-transparent font-mono text-sm outline-none placeholder:text-subtle"
                    />
                  </div>
                </label>
              ))}

              <label className="block">
                <span className="text-2xs font-600 text-foreground">
                  {t("fees.area")}
                </span>
                <select
                  value={area}
                  onChange={(e) => setArea(e.target.value)}
                  className="mt-1 h-10 w-full rounded-lg bg-muted px-2.5 text-xs outline-none focus:shadow-focus"
                >
                  <option value="">{t("fees.areaAny")}</option>
                  {areas.map((a) => (
                    <option key={a.code} value={a.code}>
                      {a.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </Card>
        </FadeIn>
      </div>

      <div className="space-y-3">
        {!enabled && (
          <Card className="py-10 text-center">
            <p className="text-sm font-600 text-foreground">{t("fees.startTitle")}</p>
            <p className="mt-1 text-xs text-subtle">{t("fees.startBody")}</p>
          </Card>
        )}

        {enabled && data && (
          <>
            <FadeIn>
              <Card>
                <p className="text-xs font-700 text-foreground">{data.summary}</p>
                {data.area_avg_agent_pct !== null && (
                  <p className="mt-1 text-2xs text-subtle">
                    {t("fees.benchmarkSource", {
                      pct: String(data.area_avg_agent_pct),
                      area: data.area_name ?? t("fees.acrossLagos"),
                    })}
                  </p>
                )}
              </Card>
            </FadeIn>

            {data.lines.map((l, i) => (
              <FadeIn key={l.label} delay={0.04 * (i + 1)}>
                <Card>
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-xs font-600 text-foreground">{l.label}</span>
                    <span className="font-mono text-sm font-700 text-foreground">
                      {formatNairaFull(l.amount_kobo)}
                    </span>
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <span
                      className={`font-display text-2xl font-800 ${tone[l.verdict as keyof typeof tone] ?? ""}`}
                    >
                      {l.pct_of_rent}%
                    </span>
                    <span className="text-2xs text-subtle">
                      {t("fees.ofAnnualRent")}
                    </span>
                    {l.verdict !== "typical" && (
                      <AlertTriangle
                        size={13}
                        className={`ml-auto ${tone[l.verdict as keyof typeof tone]}`}
                      />
                    )}
                    {l.verdict === "typical" && (
                      <Check size={13} className="ml-auto text-score-good" />
                    )}
                  </div>
                  <p className="mt-1.5 text-2xs leading-relaxed text-muted-foreground">
                    {l.note}
                  </p>
                </Card>
              </FadeIn>
            ))}

            <FadeIn delay={0.2}>
              <Card>
                <div className="flex items-baseline justify-between">
                  <span className="text-xs font-600 text-foreground">
                    {t("fees.totalUpfront")}
                  </span>
                  <span className="font-mono text-lg font-800 text-heading">
                    {formatNairaFull(data.total_upfront_kobo)}
                  </span>
                </div>
                <p className="mt-1 text-2xs text-subtle">
                  {t("fees.totalNote", { pct: String(data.total_as_pct_of_rent) })}
                </p>
                {data.lines.length > 0 && (
                  <button
                    onClick={share}
                    className="mt-2.5 inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-2xs font-700 text-foreground transition-colors hover:border-primary/50"
                  >
                    <Share2 size={12} />
                    {copied ? t("fees.shared") : t("fees.share")}
                  </button>
                )}
              </Card>
            </FadeIn>

            <p className="px-1 text-2xs leading-relaxed text-subtle">
              {t("fees.disclaimer")}
            </p>
          </>
        )}
      </div>
    </div>
  );
}
