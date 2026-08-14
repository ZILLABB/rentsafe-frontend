import { AlertTriangle, ChevronRight, Loader2, Search, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { FadeIn } from "@/components/motion";
import { Card, SectionLabel } from "@/components/ui/Card";
import { scoreColor } from "@/components/ui/Score";
import { EmptyState, PageError, Skeleton } from "@/components/ui/States";
import { useAgentSearch } from "@/lib/hooks";
import { useI18n } from "@/lib/i18n";

/** Agent directory.
 *
 *  The profiles were always good — fee against the area average, LASRERA
 *  status, linked properties — but reachable only by landing on a property the
 *  agent was already attached to. The one thing a tenant actually wants to do,
 *  look up the agent who just introduced themselves, had no route.
 */
export default function AgentsPage() {
  const { t } = useI18n();
  const [term, setTerm] = useState("");
  const [debounced, setDebounced] = useState("");

  useEffect(() => {
    const id = setTimeout(() => setDebounced(term.trim()), 350);
    return () => clearTimeout(id);
  }, [term]);

  const { data: agents = [], isLoading, isFetching, isError, refetch } =
    useAgentSearch(debounced);

  return (
    <div className="space-y-3">
      <FadeIn>
        <div className="-mx-4 -mt-4 bg-ink px-4 py-5 text-white md:mx-0 md:mt-0 md:rounded-2xl">
          <h1 className="font-display text-xl font-800">{t("agents.title")}</h1>
          <p className="mt-1 text-2xs leading-relaxed text-white/60">
            {t("agents.subtitle")}
          </p>
          <label className="mt-3 flex h-11 items-center gap-2 rounded-lg bg-white/[0.09] px-3 text-sm focus-within:bg-white/[0.14]">
            <Search size={15} className="text-white/50" aria-hidden />
            <input
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              placeholder={t("agents.searchPlaceholder")}
              aria-label={t("agents.searchPlaceholder")}
              className="w-full bg-transparent text-white outline-none placeholder:text-white/40"
            />
            {isFetching && <Loader2 size={14} className="animate-spin text-white/50" />}
          </label>
        </div>
      </FadeIn>

      <FadeIn delay={0.06}>
        <Card>
          <SectionLabel className="mb-2">
            {debounced ? t("agents.results") : t("agents.allAgents")}
          </SectionLabel>

          {isLoading && (
            <div className="flex flex-col gap-2">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          )}

          {isError && <PageError message={t("error.agent")} onRetry={() => refetch()} />}

          {!isLoading && !isError && agents.length === 0 && (
            <EmptyState
              title={t("agents.noneTitle")}
              body={
                debounced
                  ? t("agents.noneBody", { q: debounced })
                  : t("agents.noneYetBody")
              }
            />
          )}

          {/* Cards tile into columns once there is room; on a phone this is
              the same single-column list as before. */}
          <div className="grid gap-1.5 md:grid-cols-2 xl:grid-cols-3">
            {agents.map((a) => {
              const initials =
                a.name
                  .split(" ")
                  .map((w) => w[0])
                  .join("")
                  .slice(0, 2)
                  .toUpperCase() || "?";
              const rating =
                a.avg_rating_overall != null ? Number(a.avg_rating_overall) : null;
              // An agent nobody has reviewed is unknown, not bad. Showing 0.0
              // would read as a verdict we have not earned.
              const unrated = a.total_reviews === 0 || rating === null;

              return (
                <Link
                  key={a.slug ?? a.name}
                  to={a.slug ? `/agent/${a.slug}` : "#"}
                  className="flex items-center gap-2.5 rounded-md bg-inset px-2.5 py-2.5 transition-colors hover:bg-aqua-soft/60"
                >
                  <span className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-primary-deep font-display text-xs font-800 text-aqua">
                    {initials}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-1.5 truncate text-xs font-600 text-foreground">
                      {a.name}
                      {a.lasrera_verified && (
                        <ShieldCheck
                          size={12}
                          className="flex-none text-score-good"
                          aria-label={t("agents.lasrera")}
                        />
                      )}
                      {a.flagged && (
                        <AlertTriangle
                          size={12}
                          className="flex-none text-score-bad"
                          aria-label={t("agents.flagged")}
                        />
                      )}
                    </p>
                    <p className="truncate text-2xs text-subtle">
                      {[a.company_name, (a.operating_areas ?? []).join(", ")]
                        .filter(Boolean)
                        .join(" · ") || t("agents.noAreas")}
                    </p>
                  </div>
                  <div className="flex-none text-right">
                    <p
                      className={`font-display text-base font-800 leading-none ${
                        unrated ? "text-subtle" : scoreColor(rating)
                      }`}
                    >
                      {unrated ? "–" : rating.toFixed(1)}
                    </p>
                    <p className="mt-0.5 text-2xs text-subtle">
                      {a.total_reviews} {t("explore.reviews")}
                    </p>
                  </div>
                  <ChevronRight size={14} className="flex-none text-subtle" />
                </Link>
              );
            })}
          </div>
        </Card>
      </FadeIn>
    </div>
  );
}
