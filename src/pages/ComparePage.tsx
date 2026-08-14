import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { useState } from "react";
import { FadeIn } from "@/components/motion";
import { Card, InkPanel } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { PageError, Skeleton } from "@/components/ui/States";
import { api, type ApiNeighbourhood } from "@/lib/api";
import { cn } from "@/lib/cn";
import { formatNaira } from "@/lib/format";
import { useI18n } from "@/lib/i18n";

type Tone = "bad" | "mid" | "good";

/** One comparable metric, derived from the neighbourhood record.
 *
 *  `better` says which direction is good, so the winner marker is computed
 *  rather than hardcoded — the old version shipped a fixed winner per row. */
type Metric = {
  label: string;
  value: (n: ApiNeighbourhood) => number | null;
  format: (v: number) => string;
  better: "higher" | "lower";
  /** Scale for the bar; omit for chip-rendered categorical metrics. */
  max?: number;
  chip?: (n: ApiNeighbourhood) => { text: string; tone: Tone } | null;
};

const FLOOD_RANK: Record<string, number> = {
  Low: 1,
  Moderate: 2,
  High: 3,
  VeryHigh: 4,
};
const FLOOD_TONE: Record<string, Tone> = {
  Low: "good",
  Moderate: "mid",
  High: "bad",
  VeryHigh: "bad",
};

const METRICS: Metric[] = [
  {
    label: "Avg rent · 2-bed",
    value: (n) => n.avg_rent_2bed,
    format: (v) => formatNaira(v),
    better: "lower",
    max: 300_000_000,
  },
  {
    label: "Avg property rating",
    value: (n) => n.avg_rating,
    format: (v) => v.toFixed(1),
    better: "higher",
    max: 5,
  },
  {
    label: "Flood risk",
    value: (n) => (n.flood_risk ? FLOOD_RANK[n.flood_risk] ?? null : null),
    format: (v) => String(v),
    better: "lower",
    chip: (n) =>
      n.flood_risk
        ? { text: n.flood_risk.toUpperCase(), tone: FLOOD_TONE[n.flood_risk] ?? "mid" }
        : null,
  },
  {
    label: "Power · avg hrs/day",
    value: (n) => n.avg_power_hours,
    format: (v) => `${v}h`,
    better: "higher",
    max: 24,
  },
  {
    label: "Commute to VI · AM rush",
    value: (n) => n.commute_vi_min,
    format: (v) => `${v}min`,
    better: "lower",
    max: 120,
  },
  {
    label: "Avg agent fee · % of rent",
    value: (n) => n.avg_agent_fee_pct,
    format: (v) => `${v.toFixed(1)}%`,
    better: "lower",
    max: 20,
  },
];

/** Which of the two areas wins a metric, or null when it's a tie / no data. */
function winnerOf(m: Metric, areas: ApiNeighbourhood[]): number | null {
  const values = areas.map(m.value);
  if (values.some((v) => v === null)) return null;
  const [a, b] = values as number[];
  if (a === b) return null;
  const aWins = m.better === "higher" ? a > b : a < b;
  return aWins ? 0 : 1;
}

/** Neighbourhood comparison (design 1g), now against GET /neighbourhoods/compare
 *  — an endpoint that already existed and was never called. */
export default function ComparePage() {
  const { t } = useI18n();
  const [codes, setCodes] = useState<[string, string]>(["LEK", "YAB"]);

  const { data: all = [] } = useQuery({
    queryKey: ["neighbourhoods"],
    queryFn: api.listNeighbourhoods,
    staleTime: 60 * 60 * 1000,
  });

  const {
    data,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["compare", codes],
    queryFn: () => api.compareNeighbourhoods(codes),
  });

  const areas = data?.areas ?? [];

  function pick(slot: 0 | 1, code: string) {
    setCodes((cur) => {
      const next: [string, string] = [...cur] as [string, string];
      // Don't let both slots land on the same area.
      if (cur[slot === 0 ? 1 : 0] === code) return cur;
      next[slot] = code;
      return next;
    });
  }

  return (
    // Capped rather than full-bleed: a comparison table stretched across
    // 1900px puts the two columns being compared too far apart to read as a
    // pair, which defeats the point of the page.
    <div className="mx-auto w-full max-w-5xl space-y-3.5">
      <FadeIn>
        <h1 className="font-display text-xl font-800 text-heading">Compare areas</h1>
      </FadeIn>

      {/* Area selectors */}
      <FadeIn delay={0.05}>
        <div className="flex gap-2">
          {([0, 1] as const).map((slot) => (
            <label
              key={slot}
              className={cn(
                "min-w-0 flex-1 rounded-lg border-[1.5px] px-3 py-2",
                slot === 0
                  ? "border-primary bg-aqua-soft"
                  : "border-primary-deep bg-muted",
              )}
            >
              <span
                className={cn(
                  "block text-2xs font-700 uppercase tracking-[0.05em]",
                  slot === 0 ? "text-primary" : "text-primary-deep",
                )}
              >
                Area {slot + 1}
              </span>
              <select
                value={codes[slot]}
                onChange={(e) => pick(slot, e.target.value)}
                aria-label={`Area ${slot + 1}`}
                className="mt-0.5 w-full cursor-pointer truncate bg-transparent text-xs font-700 text-heading outline-none"
              >
                {all.map((n) => (
                  <option key={n.code} value={n.code}>
                    {n.name}
                  </option>
                ))}
              </select>
            </label>
          ))}
        </div>
      </FadeIn>

      {isLoading && (
        <Card>
          <div className="space-y-3">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        </Card>
      )}

      {isError && <PageError message={t("error.properties")} onRetry={() => refetch()} />}

      {areas.length === 2 && (
        <>
          <FadeIn delay={0.1}>
            <Card className="overflow-hidden p-0">
              {METRICS.map((m, mi) => {
                const winner = winnerOf(m, areas);
                return (
                  <motion.div
                    key={m.label}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: mi * 0.05 }}
                    className={cn("px-4 py-3", mi > 0 && "border-t border-muted")}
                  >
                    <p className="mb-2 text-2xs font-600 text-muted-foreground">
                      {m.label}
                    </p>
                    <div className="grid grid-cols-2 gap-2.5">
                      {areas.map((n, i) => {
                        const raw = m.value(n);
                        const chip = m.chip?.(n);
                        if (chip) {
                          return (
                            <div key={n.code}>
                              <Chip tone={chip.tone}>
                                {chip.text}
                                {winner === i && " ◂"}
                              </Chip>
                            </div>
                          );
                        }
                        return (
                          <div key={n.code}>
                            <p
                              className={cn(
                                "font-mono text-xs font-700",
                                winner === i ? "text-score-good" : "text-foreground",
                              )}
                            >
                              {raw === null ? "—" : m.format(raw)}
                              {winner === i && " ◂"}
                            </p>
                            <div className="mt-1.5 h-1.5 rounded-full bg-muted">
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{
                                  width:
                                    raw === null || !m.max
                                      ? "0%"
                                      : `${Math.min(100, (raw / m.max) * 100)}%`,
                                }}
                                transition={{ duration: 0.5, delay: mi * 0.05 }}
                                className={cn(
                                  "h-full rounded-full",
                                  i === 0 ? "bg-aqua" : "bg-primary-deep",
                                )}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </motion.div>
                );
              })}
            </Card>
          </FadeIn>

          <FadeIn delay={0.2}>
            <Verdict areas={areas} />
          </FadeIn>
        </>
      )}
    </div>
  );
}

/** The short version — assembled from which side actually won each metric. */
function Verdict({ areas }: { areas: ApiNeighbourhood[] }) {
  const wins: [string[], string[]] = [[], []];
  for (const m of METRICS) {
    const w = winnerOf(m, areas);
    if (w !== null) wins[w].push(m.label.split(" · ")[0].toLowerCase());
  }

  const totalReviews = areas.reduce((sum, n) => sum + n.total_reviews, 0);
  const totalProperties = areas.reduce((sum, n) => sum + n.total_properties, 0);

  return (
    <InkPanel label="The short version">
      <p className="text-xs leading-relaxed">
        {wins.map((list, i) =>
          list.length === 0 ? null : (
            <span key={areas[i].code}>
              <strong>{areas[i].name}</strong> wins on {list.join(", ")}.{" "}
            </span>
          ),
        )}
        {wins[0].length === 0 && wins[1].length === 0 && "These two areas score alike."}
      </p>
      <p className="mt-2 text-2xs opacity-60">
        {totalReviews > 0
          ? `Based on ${totalReviews} review${totalReviews === 1 ? "" : "s"} across ${totalProperties} propert${totalProperties === 1 ? "y" : "ies"}`
          : "Area averages are reference data — no reviews in these areas yet"}
      </p>
    </InkPanel>
  );
}
