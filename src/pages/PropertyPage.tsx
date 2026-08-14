import { motion } from "framer-motion";
import { MapPinOff, SearchX } from "lucide-react";
import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { FadeIn } from "@/components/motion";
import { AgentCard } from "@/components/property/AgentCard";
import { PhotoHero } from "@/components/property/PhotoHero";
import { CommuteTab } from "@/components/property/CommuteTab";
import { EnvironmentTab } from "@/components/property/EnvironmentTab";
import { RentHistoryTab } from "@/components/property/RentHistoryTab";
import { ReviewItem } from "@/components/property/ReviewItem";
import { Card, InsightBanner, SectionLabel } from "@/components/ui/Card";
import { Chip, PropertyIdChip } from "@/components/ui/Chip";
import { ScoreBar } from "@/components/ui/ScoreBar";
import { ScoreNumber } from "@/components/ui/Score";
import { formatNaira } from "@/lib/format";
import { useProperty, usePropertyReviews } from "@/lib/hooks";
import { useI18n } from "@/lib/i18n";
import { EmptyState, PageError, PageSkeleton, Skeleton } from "@/components/ui/States";
import type { PropertySummary } from "@/lib/types";

const TABS = [
  { id: "Reviews", key: "prop.tab.reviews" },
  { id: "Rent history", key: "prop.tab.rent" },
  { id: "Environment", key: "prop.tab.environment" },
  { id: "Commute", key: "prop.tab.commute" },
  { id: "Agent", key: "prop.tab.agent" },
] as const;
type Tab = (typeof TABS)[number]["id"];

const FLOOD_LABEL = { VeryHigh: "FLOOD: VERY HIGH", High: "FLOOD: HIGH", Moderate: "FLOOD: MODERATE", Low: "FLOOD: LOW" } as const;
const FLOOD_TONE = { VeryHigh: "bad", High: "bad", Moderate: "mid", Low: "good" } as const;

export default function PropertyPage() {
  const { propertyId = "" } = useParams();
  const { data: p, isLoading, isError, error, refetch } = useProperty(propertyId);
  const [tab, setTab] = useState<Tab>("Reviews");
  const { t } = useI18n();

  if (isLoading) return <PageSkeleton />;

  // A 404 means the PropertyID is wrong; anything else is our problem, not the
  // user's, and gets a retry rather than a dead end.
  const notFound = isError && /\b404\b/.test(String(error));
  if (isError && !notFound) {
    return <PageError message={t("error.property")} onRetry={() => refetch()} />;
  }

  if (!p) {
    return (
      <div className="py-20 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-muted">
          <SearchX size={28} className="text-muted-foreground" />
        </div>
        <p className="mt-4 font-display text-lg font-700 text-foreground">Property not found</p>
        <p className="mt-1 text-sm text-muted-foreground">This PropertyID doesn't match our records.</p>
        <Link
          to="/"
          className="mt-5 inline-flex rounded-lg bg-primary px-5 py-2.5 text-sm font-700 text-white"
        >
          Back to Explore
        </Link>
      </div>
    );
  }

  return (
    // The hero, score and chips are reference material you keep glancing back
    // at while reading the tabs, so on a wide screen they stay put beside the
    // content instead of scrolling away above it.
    <div className="space-y-3 lg:grid lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)] lg:items-start lg:gap-5 lg:space-y-0">
      <div className="space-y-3 lg:sticky lg:top-5">
      <FadeIn>
        <PhotoHero p={p} />
      </FadeIn>

      {/* Hero info */}
      <FadeIn delay={0.05}>
        <div className="-mx-4 border-b border-border bg-card px-4 pt-4 md:mx-0 md:rounded-b-2xl md:border md:border-t-0">
          <PropertyIdChip id={p.propertyId} className="mb-2" />
          <div className="flex items-start gap-3.5">
            <div className="flex-1">
              <h1 className="font-display text-lg font-700 leading-snug text-heading">
                {p.addressLocal}
              </h1>
              <p className="mt-0.5 text-2xs text-muted-foreground">
                {p.unitType} · {p.lga}
                {p.what3words ? ` · ${p.what3words}` : ""}
              </p>
              {/* An area-centroid pin must not read as a rooftop one. The
                  address above is the tenant's own words and is accurate; the
                  coordinate is not, and only this line says so. */}
              {!p.locationExact && (
                <p className="mt-1.5 flex items-start gap-1.5 text-2xs leading-relaxed text-muted-foreground">
                  <MapPinOff size={12} className="mt-px flex-none text-subtle" aria-hidden />
                  <span>
                    <span className="font-600 text-foreground">
                      {t("property.approxLocation")}
                    </span>{" "}
                    {t("property.approxLocationWhy")}
                  </span>
                </p>
              )}
            </div>
            <ScoreNumber
              rating={p.avgRating}
              reviews={p.totalReviews}
              size="lg"
              sub={
                p.totalReviews === 0
                  ? "No reviews yet"
                  : `${p.totalReviews} reviews\n${p.verifiedReviews} verified`
              }
            />
          </div>

          <div className="mb-3.5 mt-3 flex flex-wrap gap-1.5">
            <Chip tone={FLOOD_TONE[p.floodZone]}>{FLOOD_LABEL[p.floodZone]}</Chip>
            <Chip tone="neutral">POWER ~{p.powerHoursAvg}h/day</Chip>
            <Chip tone={p.securityRating >= 4 ? "good" : "mid"}>SECURITY {p.securityRating.toFixed(1)}</Chip>
            {p.latestRentKobo !== null && (
              <Chip tone="neutral">{formatNaira(p.latestRentKobo)}/YR</Chip>
            )}
            {p.highTurnover && <Chip tone="mid">HIGH TURNOVER</Chip>}
          </div>

          {/* Tabs — the strip scrolls on narrow screens, so it gets a fade on
              the right edge to show there's more than fits. */}
          <div className="relative">
            <div
              className="pointer-events-none absolute inset-y-0 right-0 z-10 w-8 bg-gradient-to-l from-card to-transparent"
              aria-hidden
            />
            <div className="scrollbar-none -mb-px flex gap-0.5 overflow-x-auto" role="tablist">
            {TABS.map((tabDef) => (
              <button
                key={tabDef.id}
                onClick={() => setTab(tabDef.id)}
                role="tab"
                aria-selected={tab === tabDef.id}
                className={`relative whitespace-nowrap px-3 py-2.5 text-xs transition-colors ${
                  tab === tabDef.id ? "font-700 text-primary" : "font-500 text-muted-foreground hover:text-foreground"
                }`}
              >
                {t(tabDef.key)}
                {tab === tabDef.id && (
                  <motion.span
                    layoutId="property-tab"
                    className="absolute inset-x-0 bottom-0 h-[2.5px] rounded-full bg-primary"
                    transition={{ type: "spring", stiffness: 400, damping: 32 }}
                  />
                )}
              </button>
            ))}
            </div>
          </div>
        </div>
      </FadeIn>

      </div>

      <div className="min-w-0 pt-1 lg:pt-0">
        {tab === "Reviews" && <ReviewsTab p={p} />}
        {tab === "Rent history" && <RentHistoryTab p={p} />}
        {tab === "Environment" && <EnvironmentTab p={p} />}
        {tab === "Commute" && <CommuteTab propertyId={p.propertyId} />}
        {tab === "Agent" && <AgentCard agentSlug={p.agentSlug} />}
      </div>
    </div>
  );
}

function ReviewsTab({ p }: { p: PropertySummary }) {
  const { data: reviews, isLoading, isError, refetch } = usePropertyReviews(p.propertyId);
  const { t } = useI18n();
  const b = p.ratingBreakdown;
  const hasReviews = p.totalReviews > 0;
  const rows: [string, number][] = [
    ["Landlord", b.landlord], ["Agent", b.agent], ["Property", b.property],
    ["Water", b.water], ["Power", b.power], ["Security", b.security],
    ["Noise", b.noise], ["Flooding", b.flooding], ["Area", b.neighbourhood],
    ["Value", b.value],
  ];

  return (
    <FadeIn>
      <div className="space-y-3">
        {/* The breakdown is only meaningful once something has been averaged. */}
        {hasReviews && (
          <Card>
            <SectionLabel className="mb-3">{t("prop.ratingBreakdown")}</SectionLabel>
            <div className="grid gap-[9px]">
              {rows.map(([label, value]) => (
                <ScoreBar key={label} label={label} value={value} />
              ))}
            </div>
          </Card>
        )}

        {p.highTurnover && (
          <InsightBanner>
            <strong>{t("prop.highTurnover")}</strong>{" "}
            {t("prop.highTurnoverBody", {
              rent: p.rentIncreasePct,
              area: p.areaIncreasePct,
            })}
          </InsightBanner>
        )}

        {isLoading && (
          <Card>
            <div className="space-y-2.5">
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-3.5 w-full" />
              <Skeleton className="h-3.5 w-5/6" />
            </div>
          </Card>
        )}

        {isError && (
          <PageError message={t("error.reviews")} onRetry={() => refetch()} />
        )}

        {!isLoading && !isError && reviews?.length === 0 && (
          <EmptyState
            title={t("prop.noReviewsTitle")}
            body={t("prop.noReviewsBody")}
            action={
              <Link
                to={`/review?property=${p.propertyId}`}
                className="mt-1.5 rounded-lg bg-primary px-5 py-2.5 text-xs font-700 text-white"
              >
                {t("explore.writeReview")}
              </Link>
            }
          />
        )}

        {reviews?.map((r) => (
          <ReviewItem key={r.id} r={r} />
        ))}

        {(reviews?.length ?? 0) > 0 && (
          <p className="pb-2 pt-1 text-center text-xs font-700 text-primary">
            {t("prop.seeAll", { n: p.totalReviews })}
          </p>
        )}
      </div>
    </FadeIn>
  );
}
