import { ChevronRight, MessageSquare } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { ClaimProfile } from "@/components/agent/ClaimProfile";
import { FadeIn } from "@/components/motion";
import { Card, InsightBanner, ResponseInset, SectionLabel } from "@/components/ui/Card";
import { EvidenceChip } from "@/components/ui/Chip";
import { ScoreBar } from "@/components/ui/ScoreBar";
import { scoreColor } from "@/components/ui/Score";
import { useAgent } from "@/lib/hooks";
import { useI18n } from "@/lib/i18n";
import { PageError, PageSkeleton } from "@/components/ui/States";

/** Agent profile (design 1f): dark hero with LASRERA badges, fee-dispute
 *  warning, category bars, fee history vs area, linked properties and the
 *  agent's response to a sample complaint. */
export default function AgentPage() {
  const { slug = "" } = useParams();
  const { data: a, isLoading, isError, refetch } = useAgent(slug);
  const { t } = useI18n();

  if (isLoading) return <PageSkeleton />;
  if (isError || !a) {
    return <PageError message={t("error.agent")} onRetry={() => refetch()} />;
  }

  return (
    <div className="space-y-3">
      {/* Dark hero */}
      <FadeIn>
        <div className="-mx-4 -mt-4 bg-ink px-4 py-5 text-white md:mx-0 md:mt-0 md:rounded-2xl">
          <div className="flex items-center gap-3.5">
            <span className="flex h-14 w-14 flex-none items-center justify-center rounded-full bg-primary-deep font-display text-2xl font-800 text-aqua">
              {a.initials}
            </span>
            <div className="min-w-0 flex-1">
              <h1 className="font-display text-lg font-800">{a.name}</h1>
              <p className="mt-0.5 text-2xs opacity-75">
                {a.agency} · {a.areas.join(", ")}
              </p>
              <div className="mt-1.5 flex gap-1.5">
                {a.lasreraVerified && (
                  <span className="rounded-sm border border-aqua/50 px-1.5 py-0.5 text-2xs font-700 text-aqua">
                    ✓ LASRERA VERIFIED
                  </span>
                )}
                {a.claimed && (
                  <span className="rounded-sm border border-white/25 px-1.5 py-0.5 text-2xs font-700 text-white/80">
                    PROFILE CLAIMED
                  </span>
                )}
              </div>
            </div>
            <div className="flex-none text-center">
              <p className={`font-display text-4xl font-800 leading-none ${scoreColor(a.avgRating)}`}>
                {a.avgRating.toFixed(1)}
              </p>
              <p className="mt-0.5 text-2xs opacity-70">{a.totalReviews} reviews</p>
            </div>
          </div>
        </div>
      </FadeIn>

      {a.warning && (
        <FadeIn delay={0.05}>
          <InsightBanner>{a.warning}</InsightBanner>
        </FadeIn>
      )}

      {/* Category bars */}
      <FadeIn delay={0.1}>
        <Card>
          <div className="grid gap-2.5">
            {a.scores.map((s) => (
              <ScoreBar key={s.label} label={s.label} value={s.value} labelWidth="w-[118px]" />
            ))}
          </div>
        </Card>
      </FadeIn>

      {/* Fee history */}
      <FadeIn delay={0.15}>
        <Card>
          <SectionLabel className="mb-2.5">Fee history — tenant reported</SectionLabel>
          <div className="flex items-baseline gap-2.5">
            <span className="font-display text-3xl font-800 text-score-bad">
              {a.avgFeePct.toFixed(1)}%
            </span>
            <span className="text-xs text-muted-foreground">
              avg fee as % of annual rent
              {a.areaAvgFeePct !== null && (
                <>
                  {" · "}
                  <strong className="text-foreground">
                    area avg: {a.areaAvgFeePct.toFixed(1)}%
                  </strong>
                </>
              )}
            </span>
          </div>
          <div className="relative mt-2.5 h-2 rounded-full bg-muted">
            <div
              className="absolute left-0 h-2 rounded-full"
              style={{
                width: `${(a.avgFeePct / 30) * 100}%`,
                background: "linear-gradient(90deg,#ED6C02,#D32F2F)",
              }}
            />
            {a.areaAvgFeePct !== null && (
              <div
                className="absolute -top-[3px] h-3.5 w-[2.5px] rounded bg-primary-deep"
                style={{ left: `${(a.areaAvgFeePct / 30) * 100}%` }}
              />
            )}
          </div>
          <div className="mt-1 flex justify-between font-mono text-2xs text-subtle">
            <span>0%</span>
            <span>area avg</span>
            <span>30%</span>
          </div>
        </Card>
      </FadeIn>

      {/* Linked properties */}
      <FadeIn delay={0.2}>
        <Card>
          <SectionLabel className="mb-2.5">Linked properties ({a.linkedProperties.length})</SectionLabel>
          <div className="flex flex-col gap-2">
            {a.linkedProperties.map((lp) => (
              <Link
                key={lp.propertyId}
                to={`/property/${lp.propertyId}`}
                className="flex items-center gap-2.5 rounded-md bg-inset px-2.5 py-2 transition-colors hover:bg-aqua-soft/60"
              >
                <span className={`w-9 flex-none text-center font-display text-sm font-800 ${scoreColor(lp.rating)}`}>
                  {lp.rating.toFixed(1)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-600 text-foreground">{lp.address}</p>
                  <p className="font-mono text-2xs text-subtle">{lp.propertyId}</p>
                </div>
                <ChevronRight size={14} className="flex-none text-subtle" />
              </Link>
            ))}
          </div>
        </Card>
      </FadeIn>

      {/* Complaint + response */}
      {a.sampleComplaint && (
        <FadeIn delay={0.25}>
          <Card>
            <p className="mb-2.5 text-xs leading-relaxed text-foreground">
              "{a.sampleComplaint.text}"{" "}
              <EvidenceChip className="ml-1 align-middle">
                <MessageSquare size={9} strokeWidth={2.6} /> {a.sampleComplaint.evidence}
              </EvidenceChip>
            </p>
            {a.response && <ResponseInset from="Agent response">{a.response}</ResponseInset>}
          </Card>
        </FadeIn>
      )}

      <FadeIn delay={0.3}>
        <ClaimProfile slug={a.slug} claimed={a.claimed} />
      </FadeIn>
    </div>
  );
}
