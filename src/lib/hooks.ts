/** React Query hooks over the live API.
 *
 *  Adapters map API DTOs onto the UI's domain types so components stay clean.
 *
 *  These deliberately do NOT fall back to fixture data. Showing invented
 *  properties and ratings when the API is unreachable is the worst failure mode
 *  this product has — people are deciding whether to sign a lease. Callers get
 *  `isLoading` / `isError` and render skeletons and error states instead. */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  api,
  clearSession,
  type ApiEnvironment,
  type ApiProperty,
  type ApiRentPoint,
  type ApiReview,
  type PropertyQuery,
} from "./api";
import type { AgentProfile, PropertySummary, Review } from "./types";

/* -------------------------------------------------------------- adapters */

function toPropertySummary(
  p: ApiProperty,
  rent: ApiRentPoint[] = [],
  env: ApiEnvironment | null = null,
): PropertySummary {
  return {
    propertyId: p.property_id,
    lat: p.lat,
    lng: p.lng,
    addressLocal: p.address_local ?? p.property_id,
    neighbourhood: p.neighbourhood_name ?? p.neighbourhood_code ?? "",
    lga: p.lga_name ? `${p.lga_name} LGA` : (p.lga_code ?? ""),
    unitType: p.bedrooms ? `${p.bedrooms}-bedroom ${p.property_type ?? "flat"}` : (p.property_type ?? "flat"),
    what3words: p.w3w_address,
    locationExact: p.location_precision !== "area",
    avgRating: p.avg_rating ?? 0,
    totalReviews: p.total_reviews,
    verifiedReviews: p.verified_reviews,
    // Null, not 0. A property nobody has reported rent for renders "₦0/yr",
    // which is a price — and a wrong one — rather than an absence.
    latestRentKobo: p.latest_rent_kobo,
    floodZone: p.flood_zone ?? "Moderate",
    elevationM: p.elevation_m,
    drainageDistM: p.drainage_dist_m,
    powerHoursAvg: p.power_hours_avg ?? 0,
    securityRating: p.security_rating != null ? Number(p.security_rating) : 0,
    highTurnover: p.high_turnover,
    ratingBreakdown: p.rating_breakdown,
    rentHistory: rent.map((r) => ({
      year: r.year,
      rentKobo: r.rent_kobo,
      areaAvgKobo: r.area_avg_kobo ?? r.rent_kobo,
    })),
    rentIncreasePct: p.rent_velocity_pct != null ? Number(p.rent_velocity_pct) : 0,
    areaIncreasePct: p.area_velocity_pct != null ? Number(p.area_velocity_pct) : 0,
    rentPercentile: p.rent_percentile ?? 50,
    floodEvents: (env?.flood_events ?? []).map((e) => ({
      when: e.when,
      severity: e.severity,
      quote: e.quote,
      evidence: e.evidence,
    })),
    agentSlug: p.agent_slug ?? null,
  };
}

function toReview(r: ApiReview): Review {
  const fmt = (iso: string | null) =>
    iso
      ? new Date(iso).toLocaleDateString("en-NG", { month: "short", year: "numeric" })
      : null;
  return {
    id: r.id,
    tier: r.verification_tier,
    isAnonymous: r.is_anonymous,
    displayName: r.display_name,
    tenancyStart: fmt(r.tenancy_start) ?? r.tenancy_start,
    tenancyEnd: fmt(r.tenancy_end),
    stillLiving: r.still_living,
    rentKobo: r.rent_amount_kobo ?? 0,
    ratings: r.ratings,
    aggregate: r.aggregate,
    positives: r.text_positives ?? "",
    warnings: r.text_warnings ?? "",
    evidence: [],
    agentName: r.agent_name,
    agentFeeKobo: r.agent_fee_kobo,
    ownerResponse: r.owner_response
      ? { from: r.owner_response.from, text: r.owner_response.text }
      : null,
    createdAt: r.created_at,
  };
}

/* ----------------------------------------------------------------- hooks */

export function useProperties(query: PropertyQuery = {}) {
  return useQuery<PropertySummary[]>({
    // The query is part of the key so filter changes refetch rather than
    // serving another filter's cached result.
    queryKey: ["properties", query],
    queryFn: async () => {
      const list = await api.listProperties(query);
      return list.map((p) => toPropertySummary(p));
    },
  });
}

export function useProperty(propertyId: string) {
  return useQuery<PropertySummary>({
    queryKey: ["property", propertyId],
    enabled: !!propertyId,
    queryFn: async () => {
      const [p, rent, env] = await Promise.all([
        api.getProperty(propertyId),
        api.getRentHistory(propertyId).catch(() => []),
        api.getEnvironment(propertyId).catch(() => null),
      ]);
      return toPropertySummary(p, rent, env);
    },
  });
}

export function usePropertyReviews(propertyId: string) {
  return useQuery<Review[]>({
    queryKey: ["reviews", propertyId],
    enabled: !!propertyId,
    queryFn: async () => (await api.getReviews(propertyId)).map(toReview),
  });
}

/** The signed-in user's own reviews. Disabled when there's no token, so the
 *  Profile page can show a sign-in prompt rather than an error. */
export function useMyReviews(enabled: boolean) {
  return useQuery<
    {
      review: Review;
      propertyId: string;
      status: string;
      moderatorNote: string | null;
      /** Seconds left to amend or withdraw. 0 once the window has closed. */
      editSecondsLeft: number;
      editedAt: string | null;
    }[]
  >({
    queryKey: ["reviews", "mine"],
    enabled,
    queryFn: async () =>
      (await api.myReviews()).map((r) => ({
        review: toReview(r),
        propertyId: r.property_id,
        status: r.moderation_status,
        moderatorNote: r.moderator_note ?? null,
        editSecondsLeft: r.edit_seconds_left ?? 0,
        editedAt: r.edited_at ?? null,
      })),
  });
}

/** The signed-in user's own profile — trust score, review count, display name.
 *  These were previously hardcoded on the Profile page. */
export function useMe(enabled: boolean) {
  return useQuery({
    queryKey: ["me"],
    enabled,
    queryFn: api.me,
  });
}

/** Approved photos for a property, plus the viewer's own pending ones. */
export function usePropertyPhotos(propertyId: string) {
  return useQuery({
    queryKey: ["photos", propertyId],
    enabled: !!propertyId,
    queryFn: () => api.getPhotos(propertyId),
  });
}

export function useSavedProperties(enabled: boolean) {
  return useQuery({
    queryKey: ["saved"],
    enabled,
    queryFn: api.savedProperties,
  });
}

export function useToggleSaved(propertyId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (next: boolean) =>
      next ? api.saveProperty(propertyId) : api.unsaveProperty(propertyId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["saved"] });
    },
    onError: (err) => {
      // An expired token used to make the bookmark silently do nothing: the
      // request 401'd, the icon never changed, and the user got no explanation.
      if (err instanceof Error && /\b401\b/.test(err.message)) {
        clearSession();
        qc.invalidateQueries({ queryKey: ["saved"] });
        qc.invalidateQueries({ queryKey: ["me"] });
      }
    },
  });
}

/** Areas the signed-in user is watching. */
export function useWatches(enabled: boolean) {
  return useQuery({
    queryKey: ["watches"],
    enabled,
    queryFn: api.watches,
  });
}

/** Watch/unwatch an area. */
export function useToggleWatch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ areaCode, next }: { areaCode: string; next: boolean }) =>
      next ? api.watchArea(areaCode) : api.unwatchArea(areaCode),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["watches"] });
      qc.invalidateQueries({ queryKey: ["alerts"] });
      qc.invalidateQueries({ queryKey: ["alerts", "unread"] });
    },
  });
}

/** Unread activity in watched areas. Drives the nav badge, which was
 *  previously hardcoded on and therefore meaningless. */
export function useUnreadAlerts(enabled: boolean) {
  return useQuery({
    queryKey: ["alerts", "unread"],
    enabled,
    queryFn: api.unreadAlerts,
    // Cheap query; keeps the badge roughly live without a socket.
    refetchInterval: 60_000,
  });
}

export function useMarkAlertsRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.markAlertsRead,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["alerts", "unread"] });
      qc.invalidateQueries({ queryKey: ["watches"] });
    },
  });
}

/** Agent directory search.
 *
 *  `GET /agents?name=` existed on the server from the start with nothing in the
 *  UI calling it, so an agent could only be reached from a property page you
 *  were already on. Looking someone up by name — the thing you actually want to
 *  do when an agent is introduced to you — was impossible.
 */
export function useAgentSearch(name: string) {
  return useQuery({
    queryKey: ["agents", name],
    queryFn: () => api.searchAgents(name.trim() || undefined),
    staleTime: 5 * 60 * 1000,
  });
}

export function useAgent(slug: string) {
  return useQuery<AgentProfile>({
    queryKey: ["agent", slug],
    enabled: !!slug,
    queryFn: async () => {
      const a = await api.getAgent(slug);
      return {
        slug: a.slug ?? slug,
        name: a.name,
        initials: a.name
          .split(" ")
          .map((w) => w[0])
          .join("")
          .slice(0, 2)
          .toUpperCase(),
        agency: a.company_name ?? a.name,
        areas: a.operating_areas ?? [],
        lasreraVerified: a.lasrera_verified,
        claimed: a.profile_claimed,
        avgRating: a.avg_rating_overall != null ? Number(a.avg_rating_overall) : 0,
        totalReviews: a.total_reviews,
        warning: a.flagged ? a.flag_reason : null,
        scores: a.scores.map((s) => ({ label: s.label, value: Number(s.value) })),
        avgFeePct: a.avg_fee_pct != null ? Number(a.avg_fee_pct) : 0,
        areaAvgFeePct: a.area_avg_fee_pct != null ? Number(a.area_avg_fee_pct) : null,
        linkedProperties: a.linked_properties.map((lp) => ({
          propertyId: lp.property_id,
          address: lp.address ?? lp.property_id,
          rating: lp.rating ?? 0,
        })),
        // Previously spliced in from fixtures. Absent until the API serves them.
        sampleComplaint: null,
        response: null,
      };
    },
  });
}
