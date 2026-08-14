import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { FadeIn } from "@/components/motion";
import { Card, InkPanel, SectionLabel } from "@/components/ui/Card";
import { EmptyState, PageError, Skeleton } from "@/components/ui/States";
import { api } from "@/lib/api";
import { cn } from "@/lib/cn";
import { useI18n } from "@/lib/i18n";

/** Colour band for a reported time, relative to the fastest one on record for
 *  this trip — a 25-minute commute is good in Lagos, 2 hours is not. */
function band(minutes: number): "good" | "mid" | "bad" {
  if (minutes <= 30) return "good";
  if (minutes <= 75) return "mid";
  return "bad";
}

const BAND_PILL = {
  good: "text-score-good bg-score-good/[0.09]",
  mid: "text-score-mid bg-score-mid/10",
  bad: "text-score-bad bg-score-bad/[0.09]",
} as const;

function formatMinutes(min: number): string {
  if (min < 60) return `${min}m`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

const MODE_LABEL: Record<string, string> = {
  car: "car",
  bus: "danfo",
  brt: "BRT",
  keke: "keke",
  ferry: "ferry",
  rail: "train",
  bike: "okada",
};

/** Commute tab (design 2a): destination picker, the dark "what tenants actually
 *  report" panel, a breakdown by time of day, corridor risk and transport
 *  access — all from tenant-reported times via /properties/{id}/commute.
 *
 *  Where nobody has reported a trip yet, this says so. It does not fill the gap
 *  with a routing-API estimate, because the product's whole claim is that lived
 *  Lagos times and routing estimates are different numbers. */
export function CommuteTab({ propertyId }: { propertyId: string }) {
  const { t } = useI18n();
  const [dest, setDest] = useState<string | null>(null);

  const { data: destinations = [], isLoading: loadingDests } = useQuery({
    queryKey: ["commute-destinations"],
    queryFn: api.commuteDestinations,
    staleTime: 60 * 60 * 1000,
  });

  const active = dest ?? destinations[0]?.code ?? "";
  const {
    data: commute,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["commute", propertyId, active],
    enabled: !!active,
    queryFn: () => api.getCommute(propertyId, active),
  });

  if (loadingDests || (isLoading && !commute)) {
    return (
      <Card>
        <div className="space-y-2.5">
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      </Card>
    );
  }

  if (isError) {
    return <PageError message={t("error.commute")} onRetry={() => refetch()} />;
  }

  return (
    <FadeIn>
      <div className="space-y-3">
        {/* Destination picker */}
        <Card>
          <SectionLabel className="mb-2.5">{t("commute.where")}</SectionLabel>
          <div className="flex flex-wrap gap-1.5">
            {destinations.map((d) => (
              <button
                key={d.code}
                onClick={() => setDest(d.code)}
                aria-pressed={d.code === active}
                className={cn(
                  "rounded-full px-[11px] py-1.5 text-2xs transition-colors",
                  d.code === active
                    ? "bg-primary font-700 text-white"
                    : "bg-muted font-600 text-primary-deep hover:bg-aqua-soft",
                )}
              >
                {d.name}
              </button>
            ))}
          </div>
        </Card>

        {/* What tenants actually report */}
        {commute && commute.report_count > 0 && commute.typical_min !== null ? (
          <InkPanel label={t("commute.reported")} className="!mb-0">
            <div className="flex items-baseline gap-2.5">
              <span className="font-display text-3xl font-800">
                {formatMinutes(commute.typical_min)}
              </span>
              <span className="text-2xs opacity-75">
                typical trip to {commute.destination_name} ·{" "}
                {commute.report_count} tenant{commute.report_count === 1 ? "" : "s"}{" "}
                reporting
              </span>
            </div>
            <p className="mt-1 text-2xs opacity-55">
              Range {formatMinutes(commute.fastest_min ?? 0)} –{" "}
              {formatMinutes(commute.slowest_min ?? 0)}
              {commute.modes.length > 0 && (
                <> · by {commute.modes.map((m) => MODE_LABEL[m] ?? m).join(", ")}</>
              )}
            </p>
            {commute.google_estimate_min !== null ? (
              <p className="mt-1.5 text-2xs opacity-55">
                {commute.routing_kind === "free_flow" ? (
                  <>
                    {/* Free-flow is the road network at its speed limits — 4am
                        with nobody about. Describing it as "what your maps app
                        says" would be false, and would make the tenant figures
                        look absurd instead of informative. */}
                    Empty roads, no traffic:{" "}
                    {formatMinutes(commute.google_estimate_min)}. The gap is the
                    traffic.
                  </>
                ) : (
                  <>
                    Routing-app estimate for the same trip:{" "}
                    {formatMinutes(commute.google_estimate_min)}. Real experience
                    wins.
                  </>
                )}
              </p>
            ) : (
              // "Nobody wired a routing key" and "we asked and got nothing"
              // are different facts, and only one of them is about this trip.
              <p className="mt-1.5 text-2xs opacity-45">
                {commute.routing_configured
                  ? "No routing-app estimate available for this trip."
                  : "Routing-app comparison isn't switched on for this deployment."}
              </p>
            )}
          </InkPanel>
        ) : (
          <EmptyState
            title={t("commute.noReportsTitle")}
            body={t("commute.noReportsBody", {
              dest: commute?.destination_name ?? "",
            })}
          />
        )}

        {/* Tenant notes */}
        {commute && commute.notes.length > 0 && (
          <Card>
            <SectionLabel className="mb-2">What tenants say</SectionLabel>
            <ul className="space-y-1.5">
              {commute.notes.map((n) => (
                <li key={n} className="text-xs leading-relaxed text-muted-foreground">
                  “{n}”
                </li>
              ))}
            </ul>
          </Card>
        )}

        {/* By time of day */}
        {commute && commute.by_window.length > 0 && (
          <Card className="overflow-hidden p-0">
            <SectionLabel className="px-4 pb-2 pt-3">
              Reported times by departure
            </SectionLabel>
            <div>
              {commute.by_window.map((w) => (
                <div
                  key={w.window}
                  className="flex items-center justify-between border-t border-muted px-4 py-2.5"
                >
                  <div className="min-w-0">
                    <p className="text-xs font-600 text-foreground">{w.label}</p>
                    <p className="text-2xs text-subtle">
                      {w.report_count} report{w.report_count === 1 ? "" : "s"}
                      {w.worst_min !== w.best_min && (
                        <>
                          {" "}
                          · {formatMinutes(w.best_min)}–{formatMinutes(w.worst_min)}
                        </>
                      )}
                    </p>
                  </div>
                  <span
                    className={cn(
                      "flex-none rounded-sm px-2 py-1 font-mono text-xs font-700",
                      BAND_PILL[band(w.typical_min)],
                    )}
                  >
                    {formatMinutes(w.typical_min)}
                  </span>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Corridor risk */}
        {commute?.bottleneck && (
          <div className="flex items-start gap-2.5 rounded-lg border border-score-bad/25 bg-score-bad/[0.06] p-3.5">
            <span className="mt-0.5 h-4 w-4 flex-none rounded-full bg-score-bad" />
            <div>
              <p className="text-xs font-700 text-foreground">
                {commute.bottleneck.title}
              </p>
              <p className="mt-0.5 text-2xs leading-relaxed text-muted-foreground">
                {commute.bottleneck.detail}
              </p>
            </div>
          </div>
        )}

        {/* Transit access */}
        {commute && commute.transit.length > 0 && (
          <Card>
            <SectionLabel className="mb-2.5">{t("commute.transit")}</SectionLabel>
            <div className="flex flex-wrap gap-1.5">
              {commute.transit.map((option) => (
                <span
                  key={option.label}
                  className={cn(
                    "rounded-md px-[11px] py-1.5 text-2xs font-600",
                    option.available
                      ? "bg-aqua-soft text-primary-deep"
                      : "bg-muted text-subtle line-through",
                  )}
                >
                  {option.label}
                  {option.available && option.distance_m
                    ? ` · ${option.distance_m}m`
                    : ""}
                </span>
              ))}
            </div>
          </Card>
        )}
      </div>
    </FadeIn>
  );
}
