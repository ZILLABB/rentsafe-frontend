/** Money + rating helpers. All money is handled in kobo (1 naira = 100 kobo). */

const NAIRA = "₦"; // ₦

/** Format kobo as a compact Naira string: 150_000_000 kobo -> "₦1.5M". */
export function formatNaira(kobo: number | null | undefined): string {
  if (kobo == null) return "—";
  const naira = kobo / 100;
  if (naira >= 1_000_000) return `${NAIRA}${trim(naira / 1_000_000)}M`;
  if (naira >= 1_000) return `${NAIRA}${trim(naira / 1_000)}K`;
  return `${NAIRA}${Math.round(naira).toLocaleString("en-NG")}`;
}

/** Full Naira amount with thousands separators: "₦1,950,000". */
export function formatNairaFull(kobo: number | null | undefined): string {
  if (kobo == null) return "—";
  return `${NAIRA}${Math.round(kobo / 100).toLocaleString("en-NG")}`;
}

function trim(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

/** Colour band for an aggregate rating (Section III): green ≥4, yellow 3–3.9, red <3. */
export function ratingBand(rating: number | null | undefined): "success" | "warning" | "danger" | "muted" {
  if (rating == null) return "muted";
  if (rating >= 4) return "success";
  if (rating >= 3) return "warning";
  return "danger";
}
