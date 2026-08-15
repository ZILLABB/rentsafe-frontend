import { AnimatePresence, motion } from "framer-motion";
import { BadgeCheck, Calculator, ChevronRight, FileCheck2, HeartHandshake, Plus, UserSearch } from "lucide-react";
import { lazy, Suspense, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FadeIn } from "@/components/motion";

// MapLibre is ~800KB and was bundled straight into this route, making the
// landing page a 948KB download. On metered Nigerian mobile data that is a real
// cost paid before anything useful renders — and the property list underneath,
// which is the part people actually read, needs none of it. Split out, the map
// streams in after first paint.
const LagosMap = lazy(() =>
  import("@/components/map/LagosMap").then((m) => ({ default: m.LagosMap })),
);
import { Chip, PropertyIdChip } from "@/components/ui/Chip";
import { scoreColor } from "@/components/ui/Score";
import { cn } from "@/lib/cn";
import { formatNaira } from "@/lib/format";
import { useProperties, usePropertyTotal } from "@/lib/hooks";
import { useI18n } from "@/lib/i18n";
import type { PropertyQuery } from "@/lib/api";
import type { PropertySummary } from "@/lib/types";

const FLOOD_LABEL = { VeryHigh: "FLOOD V.HIGH", High: "FLOOD HIGH", Moderate: "FLOOD MOD", Low: "FLOOD LOW" } as const;
const FLOOD_TONE = { VeryHigh: "bad", High: "bad", Moderate: "mid", Low: "good" } as const;

/** Explore filters. Each carries the API query it maps onto, so the chips and
 *  the request can't drift apart. */
const FILTERS = [
  { id: "eti-osa", label: "Eti-Osa", query: { lga: "ETI" } },
  { id: "under-2m", label: "≤ ₦2M/yr", query: {} as PropertyQuery, localMaxRentKobo: 200_000_000 },
  { id: "rating-3", label: "Rating 3+", query: { min_rating: 3 } },
  { id: "low-flood", label: "Low flood", query: { flood_risk: "Low" } },
] as const;

/** Explore — map home (design 1a).
 *
 *  The map is real: MapLibre over OpenStreetMap tiles, pannable and zoomable,
 *  with pins at each property's actual coordinates. It replaces a drawing whose
 *  "city blocks" were coloured rectangles and whose pins were real coordinates
 *  linearly interpolated into a fixed box — convincing at a glance, but not
 *  Lagos, and impossible to explore. */
export default function ExplorePage() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activeFilters, setActiveFilters] = useState<string[]>([]);
  const navigate = useNavigate();
  const { t } = useI18n();

  // Chips drive the actual request. The API already supports lga / min_rating /
  // flood_risk; rent has no server-side filter yet, so it's applied here.
  const active = FILTERS.filter((f) => activeFilters.includes(f.id));
  const query: PropertyQuery = Object.assign({}, ...active.map((f) => f.query));
  const maxRentKobo = active.find((f) => "localMaxRentKobo" in f)?.localMaxRentKobo;

  const { data, isLoading, isError, refetch } = useProperties(query);
  // What matched, not what fitted on the page.
  const { data: matched } = usePropertyTotal(query);
  const properties = (data ?? []).filter(
    (p) =>
      maxRentKobo === undefined ||
      // Unknown rent cannot satisfy a "under ₦2M" filter. Including it would
      // put properties in a price band nobody has evidence for.
      (p.latestRentKobo !== null && p.latestRentKobo <= maxRentKobo),
  );

  const selected: PropertySummary | undefined =
    properties.find((p) => p.propertyId === selectedId) ?? properties[0];

  const toggleFilter = (id: string) => {
    setSelectedId(null);
    setActiveFilters((cur) =>
      cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id],
    );
  };

  return (
    // Two columns once there is room for them: the map is the thing being
    // worked with, so it takes the space, and the results become a rail beside
    // it rather than a page-length scroll underneath. Below `xl` this collapses
    // back to the stacked phone layout unchanged.
    <div className="space-y-4 xl:grid xl:grid-cols-[minmax(0,1fr)_390px] xl:items-start xl:gap-5 xl:space-y-0">
      {/* Map */}
      <FadeIn className="xl:sticky xl:top-5">
        {/* overflow-clip, not overflow-hidden: hidden still makes this a scroll
            container, so focusing a filter chip inside it scrolled the whole
            map sideways. clip crops without becoming scrollable. */}
        <div className="relative -mx-4 -mt-4 h-[440px] overflow-clip bg-map-land md:mx-0 md:mt-0 md:h-[480px] md:rounded-2xl md:border md:border-border xl:h-[calc(100vh-7.5rem)] xl:min-h-[560px]">
          <Suspense
            fallback={
              // The map's own ground colour, so its arrival is a fade-in
              // rather than a flash of empty page.
              <div className="h-full w-full animate-pulse bg-map-land" aria-hidden />
            }
          >
            <LagosMap
              properties={properties}
              selectedId={selectedId}
              onSelect={setSelectedId}
            />
          </Suspense>

          {/* filter chips, floated over the map */}
          <div className="scrollbar-none absolute inset-x-3 top-3 z-20 flex gap-2 overflow-x-auto pb-1">
            {FILTERS.map((f) => {
              const on = activeFilters.includes(f.id);
              return (
                <button
                  key={f.id}
                  onClick={() => toggleFilter(f.id)}
                  aria-pressed={on}
                  className={cn(
                    "whitespace-nowrap rounded-full px-3 py-[7px] text-xs font-600 shadow-lift transition-colors",
                    on ? "bg-ink text-white" : "bg-card text-primary-deep",
                  )}
                >
                  {f.label}
                </button>
              );
            })}
          </div>

          {/* bottom sheet */}
          <div className="absolute inset-x-0 bottom-0 rounded-t-2xl bg-card px-4 pb-4 pt-2.5 shadow-[0_-8px_28px_rgba(0,0,0,.14)]">
            {selected && (
              /* FAB — positioned against the sheet itself rather than a magic
                 pixel offset from the map, so it can't collide when the sheet
                 grows (long addresses wrap, chips reflow). */
              <Link
                to={`/review?property=${selected.propertyId}`}
                className="absolute bottom-full right-3.5 z-20 mb-3 flex items-center gap-2 rounded-full bg-primary px-[18px] py-[13px] font-display text-sm font-700 text-white shadow-fab transition-transform active:scale-[0.97]"
              >
                <Plus size={14} strokeWidth={3} />
                {t("explore.writeReview")}
              </Link>
            )}
            <div className="mx-auto mb-3 h-1 w-[38px] rounded-full bg-border" />

            {isLoading && (
              <div className="flex gap-3">
                <div className="skeleton h-[84px] w-[84px] shrink-0 rounded-lg" />
                <div className="flex-1 space-y-2 py-1">
                  <div className="skeleton h-4 w-2/3 rounded" />
                  <div className="skeleton h-3 w-1/2 rounded" />
                  <div className="skeleton h-5 w-3/4 rounded" />
                </div>
              </div>
            )}

            {isError && (
              <div className="py-3 text-center">
                <p className="text-sm font-600 text-score-bad">{t("error.title")}</p>
                <p className="mt-1 text-xs text-muted-foreground">{t("error.properties")}</p>
                <button
                  onClick={() => refetch()}
                  className="mt-2.5 rounded-md border border-border px-4 py-2 text-xs font-700 text-primary"
                >
                  {t("error.retry")}
                </button>
              </div>
            )}

            {!isLoading && !isError && !selected && (
              <div className="py-4 text-center">
                <p className="text-sm font-600 text-foreground">{t("explore.noMatches")}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {t("explore.noMatchesHint")}
                </p>
                <button
                  onClick={() => setActiveFilters([])}
                  className="mt-2.5 rounded-md border border-border px-4 py-2 text-xs font-700 text-primary"
                >
                  {t("explore.clearFilters")}
                </button>
              </div>
            )}

            {selected && (
              <AnimatePresence mode="wait">
                <motion.div
                  key={selected.propertyId}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.18 }}
                >
                  <div className="flex gap-3">
                    <div className="tex-aqua flex h-[84px] w-[84px] shrink-0 items-center justify-center rounded-lg">
                      <span className="font-mono text-2xs text-muted-foreground">street view</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="mb-1 flex items-center gap-2">
                        <span
                          className={cn(
                            "font-display text-2xl font-800 leading-none",
                            selected.totalReviews === 0
                              ? "text-subtle"
                              : scoreColor(selected.avgRating),
                          )}
                        >
                          {selected.totalReviews === 0
                            ? "–"
                            : selected.avgRating.toFixed(1)}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-xs font-600 text-foreground">
                            {selected.addressLocal}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {selected.totalReviews} {t("explore.reviews")} · {selected.verifiedReviews} {t("explore.verified")}
                          </p>
                        </div>
                      </div>
                      <PropertyIdChip id={selected.propertyId} className="mb-1.5" />
                      <div className="flex flex-wrap gap-1.5">
                        <Chip tone={FLOOD_TONE[selected.floodZone]}>{FLOOD_LABEL[selected.floodZone]}</Chip>
                        <Chip tone="neutral">{selected.powerHoursAvg}h power</Chip>
                        {selected.latestRentKobo !== null && (
                          <Chip tone="neutral">
                            {formatNaira(selected.latestRentKobo)}/yr
                          </Chip>
                        )}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => navigate(`/property/${selected.propertyId}`)}
                    className="mt-3 w-full rounded-lg bg-primary py-3 text-center font-display text-sm font-700 text-white transition-transform active:scale-[0.99]"
                  >
                    {t("explore.fullReport")}
                  </button>
                </motion.div>
              </AnimatePresence>
            )}
          </div>
        </div>
      </FadeIn>

      {/* Results rail. On phones this is simply the rest of the page. */}
      <div className="space-y-4 xl:max-h-[calc(100vh-7.5rem)] xl:overflow-y-auto xl:pr-1">
      {/* Trust strip — why Lagosians can rely on this data */}
      <FadeIn delay={0.1}>
        <div className="grid grid-cols-3 gap-2">
          {[
            { icon: BadgeCheck, key: "trust.realTenants" },
            { icon: FileCheck2, key: "trust.evidence" },
            { icon: HeartHandshake, key: "trust.free" },
          ].map(({ icon: Icon, key }) => (
            <div
              key={key}
              className="flex flex-col items-center gap-1.5 rounded-lg border border-border bg-card px-2 py-3 text-center"
            >
              <Icon size={17} strokeWidth={2} className="text-primary" />
              <span className="text-2xs font-600 leading-tight text-muted-foreground">
                {t(key)}
              </span>
            </div>
          ))}
        </div>
      </FadeIn>

      {/* Agent directory entry point.
          The profiles existed from the start but were reachable only from a
          property page you had already landed on, so looking up an agent by
          name — what a tenant actually does when one is introduced to them —
          had no route into the app at all. */}
      {/* Fee checker. Unlike everything else here it needs no reviews of a
          specific building, so it is the one thing that works on day one. */}
      <FadeIn delay={0.12}>
        <Link
          to="/fees"
          className="flex items-center gap-3 rounded-lg border border-border bg-card px-3 py-2.5 transition-colors hover:border-primary/50"
        >
          <span className="flex h-9 w-9 flex-none items-center justify-center rounded-md bg-aqua-soft">
            <Calculator size={16} className="text-primary" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-700 text-foreground">{t("fees.title")}</p>
            <p className="truncate text-2xs text-subtle">{t("fees.exploreHint")}</p>
          </div>
          <ChevronRight size={15} className="flex-none text-subtle" />
        </Link>
      </FadeIn>

      <FadeIn delay={0.13}>
        <Link
          to="/agents"
          className="flex items-center gap-3 rounded-lg border border-border bg-card px-3 py-2.5 transition-colors hover:border-primary/50"
        >
          <span className="flex h-9 w-9 flex-none items-center justify-center rounded-md bg-aqua-soft">
            <UserSearch size={16} className="text-primary" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-700 text-foreground">{t("agents.title")}</p>
            <p className="truncate text-2xs text-subtle">{t("agents.subtitle")}</p>
          </div>
          <ChevronRight size={15} className="flex-none text-subtle" />
        </Link>
      </FadeIn>

      {/* Reviewed near you */}
      <div className="flex items-center justify-between pt-1">
        <h2 className="font-display text-base font-800 text-heading">{t("explore.mostReviewed")}</h2>
        <span className="text-xs text-subtle">
          {/* Says "50 of 188" when the result is truncated, rather than
              reporting the page size as though it were the whole set. */}
          {matched != null && matched > properties.length
            ? t("explore.showingOf", {
                shown: String(properties.length),
                total: String(matched),
              })
            : `${properties.length} ${t("explore.properties")}`}
        </span>
      </div>

      <div className="space-y-2.5 pb-2">
        {properties.map((p) => (
          <Link key={p.propertyId} to={`/property/${p.propertyId}`} className="block">
            <motion.div
              whileHover={{ y: -2 }}
              className="flex items-center gap-3 rounded-lg border border-border bg-card p-3 hover:shadow-lift"
            >
              <span
                className={cn(
                  "w-11 shrink-0 text-center font-display text-2xl font-800",
                  p.totalReviews === 0 ? "text-subtle" : scoreColor(p.avgRating),
                )}
              >
                {p.totalReviews === 0 ? "–" : p.avgRating.toFixed(1)}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-600 text-foreground">{p.addressLocal}</p>
                <p className="font-mono text-2xs text-subtle">
                  {p.propertyId} · {p.totalReviews} reviews
                </p>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  <Chip tone={FLOOD_TONE[p.floodZone]}>{FLOOD_LABEL[p.floodZone]}</Chip>
                  {/* Omitted rather than shown as ₦0: a zero is a price, and a wrong
                      one. The property simply has no reported rent yet. */}
                  {p.latestRentKobo !== null && (
                    <Chip tone="neutral">{formatNaira(p.latestRentKobo)}/YR</Chip>
                  )}
                </div>
              </div>
            </motion.div>
          </Link>
        ))}
      </div>

      {/* Footer */}
      <footer className="border-t border-border pb-3 pt-5 text-center">
        <p className="font-display text-xs font-800 text-heading">{t("brand.tagline")}.</p>
        <p className="mx-auto mt-1 max-w-xs text-2xs leading-relaxed text-subtle">
          {t("brand.mission")}
        </p>
        <p className="mt-3 text-2xs uppercase tracking-[0.1em] text-subtle">
          Built for Lagos tenants 🇳🇬 · NDPR-compliant · Your identity stays private
        </p>
      </footer>
      </div>
    </div>
  );
}
