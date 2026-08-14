import { motion } from "framer-motion";
import { scoreBg } from "@/components/ui/Score";

/** Grid-aligned rating row: label · 6px band-coloured bar · mono value.
 *  Used inside "RATING BREAKDOWN" style cards. */
export function ScoreBar({
  label,
  value,
  labelWidth = "w-[88px]",
}: {
  label: string;
  value: number;
  labelWidth?: string;
}) {
  const pct = (value / 5) * 100;
  return (
    <div className="flex items-center gap-2.5">
      <span className={`${labelWidth} shrink-0 text-2xs text-muted-foreground`}>{label}</span>
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className={`h-full rounded-full ${scoreBg(value)}`}
        />
      </div>
      <span className="w-[26px] shrink-0 text-right font-mono text-2xs font-700 text-foreground">
        {value.toFixed(1)}
      </span>
    </div>
  );
}
