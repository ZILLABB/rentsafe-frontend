import { cn } from "@/lib/cn";

/** Band colour for a 0–5 rating: green ≥4, orange 3–3.9, red <3. */
export function scoreColor(rating: number): string {
  if (rating >= 4) return "text-score-good";
  if (rating >= 3) return "text-score-mid";
  return "text-score-bad";
}

export function scoreBg(rating: number): string {
  if (rating >= 4) return "bg-score-good";
  if (rating >= 3) return "bg-score-mid";
  return "bg-score-bad";
}

const SIZES = {
  sm: "text-lg",
  md: "text-2xl",
  lg: "text-4xl",
  xl: "text-4xl",
} as const;

/** The big band-coloured score number — the focal rating element everywhere. */
export function ScoreNumber({
  rating,
  size = "md",
  sub,
  className,
  /** Reviews behind the score. Zero renders as "–" in grey rather than a red
   *  0.0 — an unreviewed property is unknown, not bad, and the difference
   *  matters to somebody deciding whether to sign a lease. */
  reviews,
}: {
  rating: number;
  size?: keyof typeof SIZES;
  sub?: string;
  className?: string;
  reviews?: number;
}) {
  const unrated = reviews === 0;
  return (
    <div className={cn("text-center", className)}>
      <div
        className={cn(
          "font-display font-800 leading-none",
          SIZES[size],
          unrated ? "text-subtle" : scoreColor(rating),
        )}
      >
        {unrated ? "–" : rating.toFixed(1)}
      </div>
      {sub && (
        <div className="mt-1 whitespace-pre-line text-2xs leading-tight text-muted-foreground">
          {sub}
        </div>
      )}
    </div>
  );
}
