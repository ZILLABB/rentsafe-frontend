import { motion } from "framer-motion";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/** White card, hairline border, 10px radius — the design's base surface. */
export function Card({
  children,
  className,
  interactive = false,
  onClick,
}: {
  children: ReactNode;
  className?: string;
  interactive?: boolean;
  onClick?: () => void;
}) {
  const base = cn("rounded-lg border border-border bg-card p-4", className);

  if (interactive || onClick) {
    return (
      <motion.div
        whileHover={{ y: -2 }}
        transition={{ type: "spring", stiffness: 350, damping: 26 }}
        onClick={onClick}
        className={cn(base, "cursor-pointer hover:shadow-lift")}
      >
        {children}
      </motion.div>
    );
  }

  return <div className={base}>{children}</div>;
}

/** Uppercase card heading — "RATING BREAKDOWN", "FLOOD HISTORY", … */
export function SectionLabel({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("section-label", className)}>{children}</div>;
}

/** Deep-ink panel with an aqua overline label — key facts (total cost, verdicts). */
export function InkPanel({
  label,
  children,
  className,
}: {
  label?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("rounded-lg bg-ink p-4 text-white", className)}>
      {label && (
        <div className="mb-3 font-display text-2xs font-700 uppercase tracking-[0.06em] text-aqua">
          {label}
        </div>
      )}
      {children}
    </div>
  );
}

/** Amber insight banner with a "!" dot — turnover warnings, fee disputes. */
export function InsightBanner({
  children,
  tone = "warning",
  className,
}: {
  children: ReactNode;
  tone?: "warning" | "danger";
  className?: string;
}) {
  const styles =
    tone === "danger"
      ? "border-score-bad/25 bg-score-bad/[0.06]"
      : "border-score-mid/30 bg-insight";
  const dot = tone === "danger" ? "bg-score-bad" : "bg-score-mid";
  const text = tone === "danger" ? "text-foreground" : "text-insight-foreground";
  return (
    <div className={cn("flex items-start gap-2.5 rounded-lg border p-3", styles, className)}>
      <span
        className={cn(
          "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-2xs font-800 text-white",
          dot,
        )}
      >
        !
      </span>
      <div className={cn("text-2xs leading-relaxed", text)}>{children}</div>
    </div>
  );
}

/** Quoted response inset — "LANDLORD RESPONSE" / "AGENT RESPONSE". */
export function ResponseInset({
  from,
  children,
  className,
}: {
  from: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-r-md border-l-[2.5px] border-primary-deep bg-inset px-3 py-2.5",
        className,
      )}
    >
      <div className="mb-1 text-2xs font-700 uppercase tracking-[0.05em] text-primary-deep">
        {from}
      </div>
      <div className="text-2xs leading-relaxed text-muted-foreground">{children}</div>
    </div>
  );
}
