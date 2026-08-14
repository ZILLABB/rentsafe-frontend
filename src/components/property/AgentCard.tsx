import { ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";
import { FadeIn } from "@/components/motion";
import { Card, InsightBanner } from "@/components/ui/Card";
import { ScoreBar } from "@/components/ui/ScoreBar";
import { scoreColor } from "@/components/ui/Score";
import { useAgent } from "@/lib/hooks";
import { useI18n } from "@/lib/i18n";
import { EmptyState, PageError, Skeleton } from "@/components/ui/States";

/** Agent tab on the property page — a condensed agent summary linking to the
 *  full agent profile (design 1f). Shows the agent most cited across this
 *  property's approved reviews. */
export function AgentCard({ agentSlug }: { agentSlug: string | null }) {
  const { data: a, isLoading, isError, refetch } = useAgent(agentSlug ?? "");
  const { t } = useI18n();

  if (!agentSlug) {
    return (
      <FadeIn>
        <EmptyState
          title="No agent on record"
          body="No reviewer of this property has named the agent they dealt with yet."
        />
      </FadeIn>
    );
  }

  if (isLoading) {
    return (
      <Card>
        <div className="space-y-2.5">
          <Skeleton className="h-11 w-full" />
          <Skeleton className="h-3.5 w-2/3" />
          <Skeleton className="h-3.5 w-1/2" />
        </div>
      </Card>
    );
  }

  if (isError || !a) {
    return <PageError message={t("error.agent")} onRetry={() => refetch()} />;
  }

  return (
    <FadeIn>
      <div className="space-y-3">
        <Card>
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 flex-none items-center justify-center rounded-full bg-primary-deep font-display text-base font-800 text-aqua">
              {a.initials}
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-display text-base font-800 text-heading">{a.name}</p>
              <p className="text-2xs text-muted-foreground">
                {a.agency} · {a.areas.join(", ")}
              </p>
            </div>
            <div className="text-center">
              <p className={`font-display text-3xl font-800 leading-none ${scoreColor(a.avgRating)}`}>
                {a.avgRating.toFixed(1)}
              </p>
              <p className="mt-0.5 text-2xs text-subtle">{a.totalReviews} reviews</p>
            </div>
          </div>

          <div className="mt-4 grid gap-2.5">
            {a.scores.slice(0, 4).map((s) => (
              <ScoreBar key={s.label} label={s.label} value={s.value} labelWidth="w-[118px]" />
            ))}
          </div>
        </Card>

        {a.warning && <InsightBanner>{a.warning}</InsightBanner>}

        <Link
          to={`/agent/${a.slug}`}
          className="flex items-center justify-center gap-1 rounded-lg border border-border bg-card py-3 text-xs font-700 text-primary transition-colors hover:bg-aqua-soft/50"
        >
          Full agent profile <ChevronRight size={15} strokeWidth={2.4} />
        </Link>
      </div>
    </FadeIn>
  );
}
