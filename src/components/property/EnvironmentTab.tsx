import { Camera, Play } from "lucide-react";
import { FadeIn } from "@/components/motion";
import { Card, SectionLabel } from "@/components/ui/Card";
import { EvidenceChip } from "@/components/ui/Chip";
import { useI18n } from "@/lib/i18n";
import { DataSources } from "@/components/property/DataSources";
import type { FloodEvent, PropertySummary } from "@/lib/types";

const FLOOD_HEADLINE = {
  VeryHigh: "FLOOD RISK: VERY HIGH",
  High: "FLOOD RISK: HIGH",
  Moderate: "FLOOD RISK: MODERATE",
  Low: "FLOOD RISK: LOW",
} as const;

const FLOOD_BG = {
  VeryHigh: "bg-score-bad",
  High: "bg-score-bad",
  Moderate: "bg-score-mid",
  Low: "bg-score-good",
} as const;

const SEVERITY_DOT: Record<FloodEvent["severity"], string> = {
  major: "bg-score-bad",
  moderate: "bg-score-mid",
  minor: "bg-score-mid",
};

const SEVERITY_TEXT: Record<FloodEvent["severity"], string> = {
  major: "text-score-bad",
  moderate: "text-score-mid",
  minor: "text-score-mid",
};

/** Environment tab (design 1d): solid flood banner with NIHSA context, the
 *  environmental profile table, and the tenant-reported flood timeline. */
export function EnvironmentTab({ p }: { p: PropertySummary }) {
  const { t } = useI18n();
  const b = p.ratingBreakdown;

  // Only rows we can actually derive from data. The previous version listed
  // waste collection, internet and pests as facts about the building, none of
  // which anything in the system knows — and attributed "(4/5 reviews)" to a
  // count nobody had made.
  const profile: [string, string, string?][] = [];
  if (p.powerHoursAvg > 0) {
    profile.push([
      "Power",
      `~${p.powerHoursAvg} hrs/day`,
      p.totalReviews > 0 ? `(tenant-reported, ${p.totalReviews} reviews)` : undefined,
    ]);
  }
  if (b.water > 0) profile.push(["Water", `${b.water.toFixed(1)} / 5`, "(rated by tenants)"]);
  if (b.noise > 0) profile.push(["Noise", `${b.noise.toFixed(1)} / 5`, "(5 = quiet)"]);
  if (b.security > 0) {
    profile.push(["Security", `${b.security.toFixed(1)} / 5`, "(rated by tenants)"]);
  }
  if (p.elevationM !== null) {
    profile.push(["Ground elevation", `${p.elevationM.toFixed(1)} m above sea level`, "(SRTM)"]);
  }
  if (p.drainageDistM !== null) {
    profile.push(["Nearest drainage", `${Math.round(p.drainageDistM)} m`]);
  }

  return (
    <FadeIn>
      <div className="space-y-3">
        {/* Flood banner */}
        <div className={`rounded-lg p-4 text-white ${FLOOD_BG[p.floodZone]}`}>
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="font-display text-base font-800">{FLOOD_HEADLINE[p.floodZone]}</p>
              <p className="mt-0.5 text-2xs opacity-85">
                NIHSA banding from measured elevation · {p.floodEvents.length} tenant
                report{p.floodEvents.length === 1 ? "" : "s"}
              </p>
            </div>
            <p className="text-right font-mono text-2xs leading-relaxed opacity-90">
              {p.elevationM !== null ? `elev. ${p.elevationM.toFixed(1)}m ASL` : "elev. —"}
              <br />
              {p.drainageDistM !== null
                ? `drain ${Math.round(p.drainageDistM)}m away`
                : "drainage —"}
            </p>
          </div>
        </div>

        {/* Environmental profile */}
        <Card className="overflow-hidden p-0">
          <SectionLabel className="px-4 pb-1 pt-3">{t("env.profile")}</SectionLabel>
          <div className="grid grid-cols-[96px_1fr] text-xs">
            {profile.map(([label, value, note]) => (
              <div key={label} className="contents">
                <div className="border-t border-muted py-2.5 pl-4 text-muted-foreground">{label}</div>
                <div className="border-t border-muted py-2.5 pr-4 font-600 text-foreground">
                  {value} {note && <span className="font-normal text-subtle">{note}</span>}
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Flood timeline */}
        <Card>
          <SectionLabel className="mb-3.5">{t("env.floodHistory")}</SectionLabel>
          <div className="flex flex-col">
            {p.floodEvents.map((e, i) => (
              <div key={e.when} className="flex gap-3">
                <div className="flex w-3 flex-none flex-col items-center">
                  <span className={`mt-[3px] h-2.5 w-2.5 flex-none rounded-full ${SEVERITY_DOT[e.severity]}`} />
                  {i < p.floodEvents.length - 1 && <span className="w-0.5 flex-1 bg-muted" />}
                </div>
                <div className={i < p.floodEvents.length - 1 ? "pb-4" : ""}>
                  <p className={`font-mono text-2xs font-700 ${SEVERITY_TEXT[e.severity]}`}>{e.when}</p>
                  <p className="mt-0.5 text-xs text-foreground">
                    "{e.quote}"{" "}
                    {e.evidence === "video" && (
                      <EvidenceChip className="ml-1 align-middle">
                        <Play size={9} strokeWidth={2.6} /> VIDEO
                      </EvidenceChip>
                    )}
                    {e.evidence === "photo" && (
                      <EvidenceChip className="ml-1 align-middle">
                        <Camera size={9} strokeWidth={2.6} /> PHOTO
                      </EvidenceChip>
                    )}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <DataSources propertyId={p.propertyId} />
      </div>
    </FadeIn>
  );
}
