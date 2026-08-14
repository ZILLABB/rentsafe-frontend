/** Typed client for the RentSafe API. Base URL from VITE_API_BASE (dev: Vite
 *  proxies /api to the FastAPI server). JWTs kept in localStorage.
 *
 *  Access tokens last 15 minutes. The refresh token was previously received and
 *  thrown away, and `/auth/refresh` was never called by anything — so every
 *  session died silently after 15 minutes, typically part-way through the
 *  six-step review wizard on a slow connection. `request` now refreshes once,
 *  transparently, and only gives up if that also fails.
 */

const BASE = import.meta.env.VITE_API_BASE ?? "/api/v1";
const TOKEN_KEY = "rentsafe.access_token";
const REFRESH_KEY = "rentsafe.refresh_token";

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}
export function setToken(token: string | null): void {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}
export function getRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_KEY);
}
export function setRefreshToken(token: string | null): void {
  if (token) localStorage.setItem(REFRESH_KEY, token);
  else localStorage.removeItem(REFRESH_KEY);
}
export function clearSession(): void {
  setToken(null);
  setRefreshToken(null);
}

/** Notified when the session ends for good, so the UI can react in one place. */
type SessionListener = () => void;
const sessionEndedListeners = new Set<SessionListener>();
export function onSessionEnded(fn: SessionListener): () => void {
  sessionEndedListeners.add(fn);
  return () => sessionEndedListeners.delete(fn);
}

// A single in-flight refresh shared by every caller. Without this, a page that
// fires six queries at once on a stale token would send six refreshes, and the
// last five would present an already-rotated token and fail.
let refreshInFlight: Promise<boolean> | null = null;

async function refreshSession(): Promise<boolean> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return false;

  refreshInFlight ??= (async () => {
    try {
      const res = await fetch(`${BASE}/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });
      if (!res.ok) return false;
      const out = (await res.json()) as {
        access_token: string;
        refresh_token: string;
      };
      setToken(out.access_token);
      // The server rotates the refresh token, so keeping the old one would work
      // exactly once more and then fail.
      setRefreshToken(out.refresh_token);
      return true;
    } catch {
      return false;
    } finally {
      refreshInFlight = null;
    }
  })();

  return refreshInFlight;
}

async function send(path: string, init?: RequestInit): Promise<Response> {
  const token = getToken();
  return fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers ?? {}),
    },
  });
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res = await send(path, init);

  // One transparent retry on 401. Only when we actually hold a refresh token —
  // an anonymous caller hitting an authenticated endpoint should get its 401
  // straight back rather than a pointless round trip.
  if (res.status === 401 && getRefreshToken() && !path.startsWith("/auth/")) {
    if (await refreshSession()) {
      res = await send(path, init);
    } else {
      clearSession();
      sessionEndedListeners.forEach((fn) => fn());
    }
  }

  if (!res.ok) {
    throw new Error(`API ${res.status}: ${await res.text()}`);
  }
  // 204s (save/unsave/delete) carry no body, and res.json() would throw on them.
  if (res.status === 204 || res.headers.get("content-length") === "0") {
    return undefined as T;
  }
  return res.json() as Promise<T>;
}

/* ------------------------------------------------------------------ types */

export interface ApiRatingBreakdown {
  landlord: number; agent: number; property: number; water: number;
  power: number; security: number; noise: number; flooding: number;
  neighbourhood: number; value: number;
}

export interface ApiProperty {
  property_id: string;
  lat: number;
  lng: number;
  lga_code: string | null;
  lga_name: string | null;
  neighbourhood_code: string | null;
  neighbourhood_name: string | null;
  address_local: string | null;
  property_type: string | null;
  bedrooms: number | null;
  w3w_address: string | null;
  /** "exact" = the building; "area" = the neighbourhood centroid only. */
  location_precision: "exact" | "area";
  flood_zone: "VeryHigh" | "High" | "Moderate" | "Low" | null;
  elevation_m: number | null;
  drainage_dist_m: number | null;
  avg_rating: number | null;
  total_reviews: number;
  verified_reviews: number;
  latest_rent_kobo: number | null;
  rent_velocity_pct: number | null;
  area_velocity_pct: number | null;
  rent_percentile: number | null;
  power_hours_avg: number | null;
  security_rating: number | null;
  high_turnover: boolean;
  traffic_score: string | null;
  agent_slug: string | null;
  rating_breakdown: ApiRatingBreakdown;
}

/** Server-side filters for GET /properties. */
export interface PropertyQuery {
  /** Free-text search over address, area and PropertyID. */
  q?: string;
  lga?: string;
  area?: string;
  min_rating?: number;
  flood_risk?: string;
  limit?: number;
  offset?: number;
}

export interface ApiReview {
  id: number;
  property_id: string;
  tenancy_start: string;
  tenancy_end: string | null;
  still_living: boolean;
  rent_amount_kobo: number | null;
  agent_fee_kobo: number | null;
  agent_name: string | null;
  ratings: ApiRatingBreakdown;
  aggregate: number;
  verification_tier: 1 | 2 | 3;
  verified_tenant: boolean;
  is_anonymous: boolean;
  display_name: string;
  text_positives: string | null;
  text_warnings: string | null;
  owner_response: { from: "landlord" | "agent"; text: string } | null;
  moderation_status: string;
  /** Only on /reviews/mine: why a moderator rejected it or asked for edits. */
  moderator_note: string | null;
  /** Set when the author amended it after posting. */
  edited_at: string | null;
  /** Seconds left in the author's 48h window; only on /reviews/mine. */
  edit_seconds_left: number;
  created_at: string;
}

export interface ApiRentPoint {
  year: number;
  rent_kobo: number;
  area_avg_kobo: number | null;
}

export interface ApiEnvironment {
  flood_zone: string | null;
  flood_report_count: number;
  elevation_m: number | null;
  drainage_dist_m: number | null;
  power_hours_avg: number | null;
  flood_events: { when: string; severity: "major" | "moderate" | "minor"; quote: string; evidence: "video" | "photo" | null }[];
}

export interface ApiAgent {
  slug: string | null;
  name: string;
  company_name: string | null;
  operating_areas: string[] | null;
  lasrera_verified: boolean;
  profile_claimed: boolean;
  avg_rating_overall: number | null;
  avg_fee_pct: number | null;
  area_avg_fee_pct: number | null;
  total_reviews: number;
  flagged: boolean;
  flag_reason: string | null;
  scores: { label: string; value: number }[];
  linked_properties: { property_id: string; address: string | null; rating: number | null }[];
}

export interface ApiNeighbourhood {
  code: string;
  name: string;
  lga_code: string | null;
  avg_rent_1bed: number | null;
  avg_rent_2bed: number | null;
  avg_rent_3bed: number | null;
  avg_rating: number | null;
  avg_power_hours: number | null;
  avg_security: number | null;
  avg_agent_fee_pct: number | null;
  commute_vi_min: number | null;
  flood_risk: string | null;
  total_properties: number;
  total_reviews: number;
}

export interface ApiCommuteWindow {
  window: string;
  label: string;
  typical_min: number;
  worst_min: number;
  best_min: number;
  report_count: number;
}

export interface ApiCommute {
  destination_code: string;
  destination_name: string;
  report_count: number;
  /** Null until a tenant has actually reported this trip — never invented. */
  typical_min: number | null;
  fastest_min: number | null;
  slowest_min: number | null;
  /** A routing engine's drive time. Null when unreachable or no drivable route. */
  google_estimate_min: number | null;
  /** What kind of number that is — "traffic" (a model of current conditions,
   *  what a phone shows) or "free_flow" (empty roads). Not interchangeable. */
  routing_kind: "traffic" | "free_flow" | null;
  /** False when no routing key is configured at all — a different message to
   *  the user than "we asked and got nothing back". */
  routing_configured: boolean;
  by_window: ApiCommuteWindow[];
  modes: string[];
  notes: string[];
  transit: { kind: string; label: string; distance_m: number | null; available: boolean }[];
  bottleneck: { title: string; detail: string } | null;
}

export interface CommuteReportPayload {
  destination_code: string;
  departure_window: "am_rush" | "midday" | "pm_rush" | "weekend";
  mode: string;
  minutes: number;
  note?: string | null;
}

export interface ApiAlert {
  kind: "review" | "flood" | "agent_flag";
  tone: "info" | "mid" | "bad";
  title: string;
  detail: string | null;
  property_id: string | null;
  agent_slug: string | null;
  area_code: string | null;
  area_name: string | null;
  hours_ago: number | null;
  unread: boolean;
}

export interface ApiWatch {
  area_code: string;
  area_name: string;
  notify_reviews: boolean;
  notify_floods: boolean;
  notify_agent_flags: boolean;
  unread_count: number;
}

export type AlertScope = "auto" | "watched" | "all";

export type ModerationAction = "approve" | "reject" | "request_edits";

export interface ApiQueueItem {
  review_id: number;
  property_id: string;
  property_address: string | null;
  status: "pending" | "flagged";
  submitted_hours_ago: number;
  text_warnings: string | null;
  text_positives: string | null;
  /** Why the automated pre-check held it — from the server's stored verdict,
   *  so the dashboard doesn't keep a second copy of the word lists. */
  flag_reasons: string[];
  aggregate: number | null;
  verified_tenant: boolean;
  reviewer_trust: number | null;
}

export interface ApiRentBenchmark {
  yoy_pct: number | null;
  period_year: number | null;
  period_month: number | null;
  /** "national" — NBS does not publish the rent index by state. */
  scope: string;
  source: string;
  url: string;
}

export interface ApiFeeLine {
  label: string;
  amount_kobo: number;
  pct_of_rent: number;
  benchmark_pct: number;
  verdict: "typical" | "high" | "very_high";
  note: string;
}

export interface ApiFeeCheck {
  rent_kobo: number;
  area_code: string | null;
  area_name: string | null;
  area_avg_agent_pct: number | null;
  lines: ApiFeeLine[];
  total_upfront_kobo: number;
  total_as_pct_of_rent: number;
  summary: string;
}

export interface ApiClaimQueueItem {
  claim_id: number;
  agent_slug: string | null;
  agent_name: string;
  company_name: string | null;
  lasrera_number: string | null;
  contact_email: string | null;
  evidence_note: string | null;
  claimant_phone_last4: string | null;
  agent_total_reviews: number;
  agent_flagged: boolean;
  submitted_hours_ago: number;
}

export interface ApiPhotoQueueItem {
  photo_id: number;
  property_id: string;
  property_address: string | null;
  url: string;
  thumb_url: string;
  caption: string | null;
  kind: string;
  submitted_hours_ago: number;
  uploader_trust: number | null;
}

export interface ApiPhoto {
  id: number;
  url: string;
  thumb_url: string;
  width: number;
  height: number;
  caption: string | null;
  kind: string;
  moderation_status: string;
  created_at: string;
}

export interface ApiSaved {
  property_id: string;
  address: string | null;
  area_name: string | null;
  avg_rating: number | null;
  total_reviews: number;
  flood_zone: string | null;
  latest_rent_kobo: number | null;
  note: string | null;
  saved_at: string;
}

export interface ApiSource {
  field: string;
  source: string;
  licence: string | null;
  url: string | null;
  fetched_at: string;
}

export interface ApiMe {
  id: number;
  display_name: string | null;
  phone_last4: string | null;
  role: string;
  review_count: number;
  trust_score: number;
  nin_verified: boolean;
  is_anonymous_default: boolean;
}

export interface ApiResolvedArea {
  lga_code: string | null;
  lga_name: string | null;
  area_code: string | null;
  area_name: string | null;
  distance_m: number | null;
}

export interface ApiPlace {
  label: string;
  lat: number;
  lng: number;
  road: string | null;
  suburb: string | null;
  resolved: ApiResolvedArea;
  /** How closely the hit matched what was typed. */
  precision: "exact" | "street" | "area";
}

export interface IdentifyRequest {
  lat: number;
  lng: number;
  lga_code: string;
  area_code: string;
  address?: string;
  photo_hash?: string;
  /** True when the point is an area centroid, not the building itself. */
  location_approximate?: boolean;
}

export interface IdentifyResponse {
  match: "existing" | "ambiguous" | "created";
  property_id: string | null;
  candidates: Array<{
    property_id: string;
    distance_m: number;
    total_reviews: number;
    avg_rating: number | null;
    phash_match: boolean;
  }>;
  message: string | null;
}

export interface ReviewCreatePayload {
  property_id: string;
  tenancy_start: string; // ISO date
  tenancy_end?: string | null;
  still_living?: boolean;
  rent_amount_kobo?: number | null;
  ratings: ApiRatingBreakdown;
  text_positives: string;
  text_warnings: string;
  is_anonymous?: boolean;
  agent_name?: string | null;
}

/* ----------------------------------------------------------------- client */

export const api = {
  // Properties
  listProperties: (query: PropertyQuery = {}) => {
    const qs = new URLSearchParams(
      Object.entries(query)
        .filter(([, v]) => v !== undefined && v !== "")
        .map(([k, v]) => [k, String(v)]),
    ).toString();
    return request<ApiProperty[]>(`/properties${qs ? `?${qs}` : ""}`);
  },
  getProperty: (propertyId: string) => request<ApiProperty>(`/properties/${propertyId}`),
  getReviews: (propertyId: string) =>
    request<ApiReview[]>(`/properties/${propertyId}/reviews`),
  getRentHistory: (propertyId: string) =>
    request<ApiRentPoint[]>(`/properties/${propertyId}/rent-history`),
  getEnvironment: (propertyId: string) =>
    request<ApiEnvironment>(`/properties/${propertyId}/environment`),
  getSources: (propertyId: string) =>
    request<ApiSource[]>(`/properties/${propertyId}/sources`),
  identifyProperty: (body: IdentifyRequest) =>
    request<IdentifyResponse>("/properties/identify", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  // Address lookup — finding and registering your own building
  searchPlaces: (q: string) =>
    request<ApiPlace[]>(`/places/search?q=${encodeURIComponent(q)}`),
  resolvePoint: (lat: number, lng: number) =>
    request<ApiResolvedArea>(`/places/resolve?lat=${lat}&lng=${lng}`),

  // Commute
  commuteDestinations: () =>
    request<{ code: string; name: string }[]>("/commute/destinations"),
  getCommute: (propertyId: string, destination: string) =>
    request<ApiCommute>(
      `/properties/${propertyId}/commute?destination=${encodeURIComponent(destination)}`,
    ),
  addCommuteReport: (propertyId: string, body: CommuteReportPayload) =>
    request<ApiCommute>(`/properties/${propertyId}/commute`, {
      method: "POST",
      body: JSON.stringify(body),
    }),

  // Photos
  getPhotos: (propertyId: string) =>
    request<ApiPhoto[]>(`/properties/${propertyId}/photos`),
  uploadPhoto: async (
    propertyId: string,
    file: File,
    opts: { caption?: string; kind?: "property" | "evidence" } = {},
  ) => {
    const body = new FormData();
    body.append("file", file);
    if (opts.caption) body.append("caption", opts.caption);
    body.append("kind", opts.kind ?? "property");
    const token = getToken();
    // No Content-Type header — the browser sets the multipart boundary.
    const res = await fetch(`${BASE}/properties/${propertyId}/photos`, {
      method: "POST",
      body,
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) throw new Error(`API ${res.status}: ${await res.text()}`);
    return (await res.json()) as {
      photo: ApiPhoto;
      message: string;
      duplicate_of_photo_id: number | null;
    };
  },
  deletePhoto: (photoId: number) =>
    request<void>(`/photos/${photoId}`, { method: "DELETE" }),

  // Saved properties
  savedProperties: () => request<ApiSaved[]>("/users/me/saved"),
  saveProperty: (propertyId: string, note?: string) =>
    request<void>(`/properties/${propertyId}/save`, {
      method: "PUT",
      body: JSON.stringify({ note: note ?? null }),
    }),
  unsaveProperty: (propertyId: string) =>
    request<void>(`/properties/${propertyId}/save`, { method: "DELETE" }),

  // Alerts & profile
  alerts: (scope: AlertScope = "auto") =>
    request<ApiAlert[]>(`/alerts?scope=${scope}`),
  unreadAlerts: () => request<{ unread: number; watching: number }>("/alerts/unread"),
  markAlertsRead: () => request<void>("/alerts/read", { method: "POST" }),

  // Area watches
  watches: () => request<ApiWatch[]>("/users/me/watches"),
  watchArea: (areaCode: string) =>
    request<void>(`/areas/${areaCode}/watch`, {
      method: "PUT",
      body: JSON.stringify({}),
    }),
  unwatchArea: (areaCode: string) =>
    request<void>(`/areas/${areaCode}/watch`, { method: "DELETE" }),
  me: () => request<ApiMe>("/users/me"),

  // Account. The phone hash is the only route back to a user row, so moving to
  // a new number is the difference between keeping an account and losing every
  // review on it.
  startPhoneChange: (newPhone: string) =>
    request<{ sent: boolean; message: string }>("/users/me/phone/start", {
      method: "POST",
      body: JSON.stringify({ new_phone: newPhone }),
    }),
  confirmPhoneChange: (newPhone: string, code: string) =>
    request<ApiMe>("/users/me/phone/confirm", {
      method: "POST",
      body: JSON.stringify({ new_phone: newPhone, code }),
    }),
  // NDPR rights. Both endpoints existed with nothing calling them, which meant
  // rights users legally have were unreachable in practice.
  exportMyData: () => request<unknown>("/users/me/export"),
  deleteMyAccount: () =>
    request<{ status: string }>("/users/me/delete", {
      method: "POST",
      body: JSON.stringify({}),
    }),

  // A review's author may amend or withdraw it for 48 hours. The Profile page
  // promised this from the start; until now no endpoint existed.
  editReview: (
    id: number,
    patch: {
      ratings?: ApiRatingBreakdown;
      text_positives?: string;
      text_warnings?: string;
      rent_amount_kobo?: number;
      is_anonymous?: boolean;
    },
  ) =>
    request<{ review_id: number; moderation_status: string; message: string }>(
      `/reviews/${id}`,
      { method: "PATCH", body: JSON.stringify(patch) },
    ),
  deleteReview: (id: number) =>
    request<void>(`/reviews/${id}`, { method: "DELETE" }),

  // Photo moderation. The endpoints existed with no UI, so every uploaded
  // photo sat pending and invisible forever.
  photoQueue: () => request<ApiPhotoQueueItem[]>("/admin/moderation/photos"),
  moderatePhoto: (id: number, action: "approve" | "reject") =>
    request<{ status: string }>(`/admin/moderation/photos/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ action }),
    }),

  // "Is this fee normal?" — needs no account and no reviews of the building,
  // so it works on day one with an empty reviews table.
  checkFees: (q: {
    rent_kobo: number;
    agent_fee_kobo?: number;
    agreement_fee_kobo?: number;
    caution_fee_kobo?: number;
    area?: string;
  }) => {
    const params = new URLSearchParams();
    Object.entries(q).forEach(([k, v]) => {
      if (v !== undefined && v !== "") params.set(k, String(v));
    });
    return request<ApiFeeCheck>(`/fees/check?${params}`);
  },

  // Agent profile claims. `profile_claimed` existed with nothing able to set
  // it, so right-of-reply was unreachable by the agents it exists for.
  claimAgent: (
    slug: string,
    body: { lasrera_number?: string; contact_email?: string; evidence_note?: string },
  ) =>
    request<{ status: string; message: string }>(`/agents/${slug}/claim`, {
      method: "POST",
      body: JSON.stringify(body),
    }),
  claimQueue: () => request<ApiClaimQueueItem[]>("/admin/moderation/claims"),
  decideClaim: (id: number, action: "approve" | "reject", note?: string) =>
    request<{ status: string }>(`/admin/moderation/claims/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ action, note }),
    }),

  // Push. Area watches drive the in-app feed; these are what make them reach
  // a phone.
  pushConfig: () =>
    request<{ public_key: string | null; enabled: boolean }>("/push/config"),
  pushSubscribe: (sub: { endpoint: string; keys: { p256dh: string; auth: string } }) =>
    request<void>("/push/subscribe", { method: "POST", body: JSON.stringify(sub) }),
  pushUnsubscribe: (sub: { endpoint: string; keys: { p256dh: string; auth: string } }) =>
    request<void>("/push/unsubscribe", { method: "POST", body: JSON.stringify(sub) }),

  // Agents
  // The default page is 50; the directory wants the lot. Requesting 20 by
  // omission silently showed a fifth of the agents with nothing saying so.
  searchAgents: (name?: string, limit = 200) => {
    const params = new URLSearchParams({ limit: String(limit) });
    if (name) params.set("name", name);
    return request<ApiAgent[]>(`/agents?${params}`);
  },

  // Agents & neighbourhoods
  getAgent: (slug: string) => request<ApiAgent>(`/agents/${slug}`),
  listNeighbourhoods: () => request<ApiNeighbourhood[]>("/neighbourhoods"),
  // Official rent inflation. The only number in the app that doesn't come from
  // a tenant, and its job is to give the tenant numbers something to sit against.
  rentBenchmark: () =>
    request<ApiRentBenchmark>("/neighbourhoods/rent-benchmark"),
  compareNeighbourhoods: (codes: string[]) =>
    request<{ areas: ApiNeighbourhood[] }>(
      `/neighbourhoods/compare?codes=${codes.join(",")}`,
    ),

  // Auth
  requestOtp: (phone: string) =>
    request<{ sent: boolean; dev_code: string | null }>("/auth/otp/request", {
      method: "POST",
      body: JSON.stringify({ phone }),
    }),
  verifyOtp: async (phone: string, code: string) => {
    const out = await request<{ access_token: string; refresh_token: string; user_id: number }>(
      "/auth/otp/verify",
      { method: "POST", body: JSON.stringify({ phone, code }) },
    );
    setToken(out.access_token);
    // Previously discarded, which is what made sessions die after 15 minutes.
    setRefreshToken(out.refresh_token);
    return out;
  },

  // Reviews
  myReviews: () => request<ApiReview[]>("/reviews/mine"),
  submitReview: (payload: ReviewCreatePayload) =>
    request<{ review_id: number; moderation_status: string; message: string }>(
      "/reviews",
      { method: "POST", body: JSON.stringify(payload) },
    ),

  // Admin
  adminQueue: () => request<ApiQueueItem[]>("/admin/moderation/reviews"),
  adminModerate: (
    reviewId: number,
    action: ModerationAction,
    note?: string,
  ) =>
    request<{ status: string }>(`/admin/moderation/reviews/${reviewId}`, {
      method: "PATCH",
      body: JSON.stringify({ action, note }),
    }),
};
