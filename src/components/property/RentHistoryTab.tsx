import { useQuery } from "@tanstack/react-query";
import { FadeIn } from "@/components/motion";
import { Card, InkPanel, SectionLabel } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/States";
import { api } from "@/lib/api";
import { formatNaira, formatNairaFull } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import type { PropertySummary } from "@/lib/types";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/** Rent history tab (design 1c): velocity banner, tenant-reported line chart vs
 *  area average, dark "first-year total cost" panel, and area percentile. */
export function RentHistoryTab({ p }: { p: PropertySummary }) {
  const { t } = useI18n();
  const rent = p.latestRentKobo;

  // The one figure on this screen that does not come from a tenant. Its whole
  // job is to give the tenant-reported rise something to be measured against.
  const { data: benchmark } = useQuery({
    queryKey: ["rent-benchmark"],
    queryFn: api.rentBenchmark,
    staleTime: 24 * 60 * 60 * 1000,
  });

  // Nothing on this tab means anything without a reported rent: the velocity
  // banner, the chart and the first-year cost breakdown are all derived from
  // it. Rendering them against a missing figure produced a blank chart and a
  // cost breakdown built on ₦0 — numbers presented with total confidence and no
  // basis whatsoever.
  if (rent == null || p.rentHistory.length === 0) {
    return (
      <FadeIn>
        <EmptyState
          title="No rent reported yet"
          body="Rent figures here come from tenants who actually paid them, not from asking prices. Nobody has reported one for this property."
        />
      </FadeIn>
    );
  }

  const agentFee = Math.round(rent * 0.14);
  const caution = Math.round(rent * 0.086);
  const agreement = 5_000_000;
  const total = rent + agentFee + caution + agreement;

  return (
    <FadeIn>
      <div className="space-y-3">
        {/* Velocity banner */}
        <div className="rounded-lg border border-score-bad/25 bg-score-bad/[0.06] p-3.5">
          <div className="flex items-baseline gap-2">
            <span className="font-display text-2xl font-800 text-score-bad">
              +{p.rentIncreasePct}%
            </span>
            <span className="text-xs font-600 text-foreground">rent increase over 3 years</span>
          </div>
          <p className="mt-0.5 text-2xs text-muted-foreground">
            {p.neighbourhood} average over the same period:{" "}
            <strong className="text-foreground">+{p.areaIncreasePct}%</strong>
          </p>

          {/* Official comparison. Kept visually secondary and explicitly
              labelled national: NBS does not publish the rent index by state,
              and letting a reader take it for a Lagos figure would be the kind
              of quiet overclaim this app is built to avoid. */}
          {benchmark?.yoy_pct != null && (
            <p className="mt-1.5 border-t border-score-bad/15 pt-1.5 text-2xs text-muted-foreground">
              {t("rent.benchmarkLabel")}:{" "}
              <strong className="text-foreground">+{benchmark.yoy_pct}%</strong>{" "}
              <span className="text-subtle">
                ·{" "}
                {t("rent.benchmarkNote", {
                  month: MONTHS[(benchmark.period_month ?? 1) - 1],
                  year: String(benchmark.period_year ?? ""),
                })}
              </span>
            </p>
          )}
        </div>

        {/* Chart */}
        <Card>
          <SectionLabel>Annual rent — tenant reported</SectionLabel>
          <p className="mb-2.5 mt-1 text-2xs text-subtle">
            Solid: this property · Dashed: {p.neighbourhood} average
          </p>
          <RentChart p={p} />
        </Card>

        {/* Total cost */}
        <InkPanel label="First-year total cost">
          <div className="grid grid-cols-[1fr_auto] gap-y-2 text-xs text-white/75">
            <span>Annual rent</span>
            <span className="font-mono font-600 text-white">{formatNairaFull(rent)}</span>
            <span>Agent fee (14%)</span>
            <span className="font-mono font-600 text-white">{formatNairaFull(agentFee)}</span>
            <span>Caution fee</span>
            <span className="font-mono font-600 text-white">{formatNairaFull(caution)}</span>
            <span>Agreement fee</span>
            <span className="font-mono font-600 text-white">{formatNairaFull(agreement)}</span>
          </div>
          <div className="mt-3 flex items-baseline justify-between border-t border-white/15 pt-3">
            <span className="text-xs font-600 text-white">You actually pay</span>
            <span className="font-mono text-xl font-700 text-aqua">{formatNairaFull(total)}</span>
          </div>
        </InkPanel>

        {/* Percentile */}
        <Card>
          <SectionLabel className="mb-3">
            Vs. {p.neighbourhood} · {p.unitType.replace("-bedroom flat", "-bed flats")}
          </SectionLabel>
          <div className="relative mx-1.5 h-[34px]">
            <div className="absolute inset-x-0 top-[14px] h-1.5 rounded-full bg-muted" />
            <div className="absolute left-[22%] top-[11px] h-3 w-[44%] rounded border border-aqua bg-aqua-soft" />
            <div className="absolute left-[44%] top-[7px] h-5 w-[2.5px] rounded bg-primary-deep" />
            <div
              className="absolute top-0.5 h-3.5 w-3.5 -translate-x-1/2 rounded-full border-[2.5px] border-white bg-score-bad shadow-lift"
              style={{ left: `${p.rentPercentile}%` }}
            />
          </div>
          <div className="mt-0.5 flex justify-between font-mono text-2xs text-subtle">
            <span>₦0.9M</span>
            <span>median ₦1.4M</span>
            <span>₦2.4M</span>
          </div>
          <p className="mt-2.5 text-2xs leading-relaxed text-muted-foreground">
            This property is at the{" "}
            <strong className={p.rentPercentile >= 75 ? "text-score-bad" : "text-foreground"}>
              {p.rentPercentile}th percentile
            </strong>
            {p.rentPercentile >= 75 ? " — expensive for the area." : " for the area."}
          </p>
        </Card>
      </div>
    </FadeIn>
  );
}

/** SVG line chart — property rent (teal, solid) vs area average (grey, dashed). */
function RentChart({ p }: { p: PropertySummary }) {
  const W = 326;
  const H = 150;
  const points = p.rentHistory;
  const all = points.flatMap((r) => [r.rentKobo, r.areaAvgKobo]);
  const min = Math.min(...all) * 0.85;
  // Guard against a flat series: with one point, or identical values, max would
  // equal min and every y coordinate would divide by zero.
  const max = Math.max(Math.max(...all) * 1.1, min + 1);
  // A single data point is the *most common* real case — one review, one year.
  // Dividing by (length - 1) makes that zero, so every coordinate came out NaN
  // and the whole chart silently failed to render. One point is centred instead.
  const span = Math.max(1, points.length - 1);
  const x = (i: number) =>
    points.length === 1 ? W / 2 : 50 + (i * (W - 70)) / span;
  const y = (v: number) => 122 - ((v - min) / (max - min)) * 104;

  const rentLine = points.map((r, i) => `${x(i)},${y(r.rentKobo)}`).join(" ");
  const areaLine = points.map((r, i) => `${x(i)},${y(r.areaAvgKobo)}`).join(" ");
  const last = points[points.length - 1];

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="block w-full">
      <line x1="34" y1="14" x2="34" y2="122" stroke="currentColor"
        className="text-border" strokeWidth="1" />
      <line x1="34" y1="122" x2={W - 8} y2="122" stroke="currentColor"
        className="text-border" strokeWidth="1" />
      <line x1="34" y1="86" x2={W - 8} y2="86" stroke="currentColor"
        className="text-border/50" strokeWidth="1" />
      <line x1="34" y1="50" x2={W - 8} y2="50" stroke="currentColor"
        className="text-border/50" strokeWidth="1" />
      <polyline
        points={areaLine}
        fill="none"
        stroke="currentColor"
        className="text-subtle"
        strokeWidth="1.5"
        strokeDasharray="4 4"
      />
      <polyline
        points={rentLine}
        fill="none"
        stroke="currentColor"
        className="text-primary"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      {points.map((r, i) => (
        <circle
          key={r.year}
          cx={x(i)}
          cy={y(r.rentKobo)}
          r="4"
          className={
            // The ring is the card colour so the dot reads as sitting on the
            // surface in either theme; a hardcoded white ring vanished on dark.
            i === points.length - 1
              ? "fill-score-bad text-card"
              : "fill-primary text-card"
          }
          stroke="currentColor"
          strokeWidth="1.5"
        />
      ))}
      {points.map((r, i) => (
        <text
          key={r.year}
          x={x(i)}
          y="138"
          textAnchor="middle"
          fontSize="9"
          className="fill-subtle"
          fontFamily="Inter"
        >
          {r.year}
        </text>
      ))}
      <text
        x={x(points.length - 1)}
        y={y(last.rentKobo) - 12}
        textAnchor="middle"
        fontSize="9"
        fontWeight="700"
        className="fill-score-bad"
        fontFamily="JetBrains Mono"
      >
        {formatNaira(last.rentKobo)}
      </text>
    </svg>
  );
}
