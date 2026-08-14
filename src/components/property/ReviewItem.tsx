import { motion } from "framer-motion";
import { Camera, FileText, MessageSquare, Play, Volume2, type LucideIcon } from "lucide-react";
import { ResponseInset } from "@/components/ui/Card";
import { EvidenceChip } from "@/components/ui/Chip";
import { scoreColor } from "@/components/ui/Score";
import { formatNaira } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import type { EvidenceBadge, Review } from "@/lib/types";

const EVIDENCE_ICON: Record<EvidenceBadge, LucideIcon> = {
  video: Play,
  photo: Camera,
  audio: Volume2,
  chat: MessageSquare,
  doc: FileText,
};

function TierBadge({ tier }: { tier: Review["tier"] }) {
  const { t } = useI18n();
  if (tier >= 2)
    return (
      <span className="rounded-[5px] bg-score-good/10 px-1.5 py-0.5 text-2xs font-700 uppercase text-score-good">
        {t("prop.verifiedTenant")}
      </span>
    );
  return (
    <span className="rounded-[5px] bg-muted px-1.5 py-0.5 text-2xs font-600 uppercase text-subtle">
      {t("prop.unverified")}
    </span>
  );
}

/** A single review card (design 1b): avatar initial, tier badge, tenancy line,
 *  band-coloured score, Loved / Know-before-you-rent, evidence chips, agent
 *  footer and optional landlord/agent response inset. */
export function ReviewItem({ r }: { r: Review }) {
  const { t } = useI18n();
  const end = r.stillLiving ? "present" : (r.tenancyEnd ?? "—");
  const initial = r.displayName.charAt(0).toUpperCase();

  return (
    <motion.article
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="rounded-lg border border-border bg-card p-4"
    >
      <div className="mb-2 flex items-center gap-2">
        <span
          className={`flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full font-display text-xs font-800 ${
            r.tier >= 2 ? "bg-aqua-soft text-primary-deep" : "bg-muted text-muted-foreground"
          }`}
        >
          {initial}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-700 text-foreground">{r.displayName}</span>
            <TierBadge tier={r.tier} />
          </div>
          <p className="text-2xs text-subtle">
            {t("prop.livedHere")} {r.tenancyStart} – {end} · {t("prop.paid")} {formatNaira(r.rentKobo)}/yr
          </p>
        </div>
        <span className={`font-display text-lg font-800 ${scoreColor(r.aggregate)}`}>
          {r.aggregate.toFixed(1)}
        </span>
      </div>

      <p className="mb-1.5 text-xs leading-relaxed text-foreground">
        <strong className="text-score-good">{t("prop.loved")}</strong> {r.positives}
      </p>
      <p className="mb-2.5 text-xs leading-relaxed text-foreground">
        <strong className="text-score-bad">{t("prop.knowBefore")}</strong> {r.warnings}
      </p>

      {r.evidence.length > 0 && (
        <div className="mb-2.5 flex flex-wrap gap-1.5">
          {r.evidence.map((e) => {
            const Icon = EVIDENCE_ICON[e.kind];
            return (
              <EvidenceChip key={e.label}>
                <Icon size={10} strokeWidth={2.4} /> {e.label}
              </EvidenceChip>
            );
          })}
        </div>
      )}

      {r.agentName && (
        <p className="border-t border-muted pt-2 text-2xs text-muted-foreground">
          Agent for this tenancy:{" "}
          <span className="font-700 text-primary-deep">{r.agentName}</span>
          {r.agentFeeKobo != null && <> · fee {formatNaira(r.agentFeeKobo)}</>}
        </p>
      )}

      {r.ownerResponse && (
        <ResponseInset
          from={r.ownerResponse.from === "landlord" ? "Landlord response" : "Agent response"}
          className="mt-2.5"
        >
          {r.ownerResponse.text}
        </ResponseInset>
      )}
    </motion.article>
  );
}
