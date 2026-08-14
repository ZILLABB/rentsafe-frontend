/** Shared domain types mirroring the backend schemas. */

export interface RatingBreakdown {
  landlord: number;
  agent: number;
  property: number;
  water: number;
  power: number;
  security: number;
  noise: number;
  flooding: number;
  neighbourhood: number;
  value: number;
}

export type VerificationTier = 1 | 2 | 3;
export type EvidenceBadge = "video" | "photo" | "audio" | "chat" | "doc";

export interface Review {
  id: number;
  tier: VerificationTier;
  isAnonymous: boolean;
  displayName: string;
  tenancyStart: string; // "2022-03"
  tenancyEnd: string | null;
  stillLiving: boolean;
  rentKobo: number;
  ratings: RatingBreakdown;
  aggregate: number;
  positives: string;
  warnings: string;
  evidence: { kind: EvidenceBadge; label: string }[];
  agentName: string | null;
  agentFeeKobo: number | null;
  ownerResponse: { from: "landlord" | "agent"; text: string } | null;
  createdAt: string;
}

export interface RentPoint {
  year: number;
  rentKobo: number;
  areaAvgKobo: number;
}

export interface FloodEvent {
  when: string; // "OCT 2024"
  severity: "major" | "moderate" | "minor";
  quote: string;
  evidence: EvidenceBadge | null;
}

export interface PropertySummary {
  propertyId: string;
  lat: number;
  lng: number;
  addressLocal: string;
  neighbourhood: string;
  lga: string;
  unitType: string;
  what3words: string | null;
  /** False when the coordinate is only the neighbourhood centroid. */
  locationExact: boolean;
  avgRating: number;
  totalReviews: number;
  verifiedReviews: number;
  /** Null until a tenant reports what they actually paid. */
  latestRentKobo: number | null;
  floodZone: "VeryHigh" | "High" | "Moderate" | "Low";
  /** Measured ground height (SRTM). Null where it hasn't been imported. */
  elevationM: number | null;
  drainageDistM: number | null;
  powerHoursAvg: number;
  securityRating: number;
  highTurnover: boolean;
  ratingBreakdown: RatingBreakdown;
  rentHistory: RentPoint[];
  rentIncreasePct: number;
  areaIncreasePct: number;
  rentPercentile: number;
  floodEvents: FloodEvent[];
  agentSlug: string | null;
}

export interface AgentProfile {
  slug: string;
  name: string;
  initials: string;
  agency: string;
  areas: string[];
  lasreraVerified: boolean;
  claimed: boolean;
  avgRating: number;
  totalReviews: number;
  warning: string | null;
  scores: { label: string; value: number }[];
  avgFeePct: number;
  /** Area benchmark from the API; null when there's nothing to compare against. */
  areaAvgFeePct: number | null;
  linkedProperties: { propertyId: string; address: string; rating: number }[];
  sampleComplaint: { text: string; evidence: string } | null;
  response: string | null;
}
