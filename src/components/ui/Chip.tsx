import { cva, type VariantProps } from "class-variance-authority";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/** Small uppercase stat chip — "FLOOD: HIGH", "POWER ~12h/day", "₦1.5M/YR". */
const chip = cva(
  "inline-flex items-center gap-1 rounded-sm px-2.5 py-1 text-2xs font-700 uppercase tracking-wide",
  {
    variants: {
      tone: {
        neutral: "bg-muted text-primary-deep",
        good: "bg-score-good/10 text-score-good",
        mid: "bg-score-mid/10 text-score-mid",
        bad: "bg-score-bad/10 text-score-bad",
        aqua: "bg-aqua-soft text-primary-deep",
        info: "bg-info/10 text-info",
        subtle: "bg-muted text-subtle",
      },
    },
    defaultVariants: { tone: "neutral" },
  },
);

export interface ChipProps extends VariantProps<typeof chip> {
  children: ReactNode;
  className?: string;
}

export function Chip({ children, tone, className }: ChipProps) {
  return <span className={cn(chip({ tone }), className)}>{children}</span>;
}

/** Mono PropertyID chip on an aqua tint. */
export function PropertyIdChip({ id, className }: { id: string; className?: string }) {
  return (
    <span
      className={cn(
        "inline-block rounded-sm bg-aqua-soft px-2 py-0.5 font-mono text-2xs font-600 text-primary-deep",
        className,
      )}
    >
      {id}
    </span>
  );
}

/** Blue-tinted, bordered evidence pill: "▶ VIDEO — Flooding, Oct 2024". */
export function EvidenceChip({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-sm border border-info/25 bg-info/[0.08] px-2 py-1 text-2xs font-700 uppercase tracking-wide text-info",
        className,
      )}
    >
      {children}
    </span>
  );
}
