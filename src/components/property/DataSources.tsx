import { useQuery } from "@tanstack/react-query";
import { Info } from "lucide-react";
import { api } from "@/lib/api";

const FIELD_LABEL: Record<string, string> = {
  elevation_m: "Ground elevation",
  flood_zone: "Flood banding",
  transit: "Public transport",
};

/** Where the imported figures on this property came from.
 *
 *  Two reasons this is on the page rather than buried in a docs folder: a
 *  platform asking people to trust its numbers should show its working, and
 *  OpenStreetMap's ODbL licence requires attribution wherever its data is
 *  used. */
export function DataSources({ propertyId }: { propertyId: string }) {
  const { data: sources = [] } = useQuery({
    queryKey: ["sources", propertyId],
    queryFn: () => api.getSources(propertyId),
    staleTime: 60 * 60 * 1000,
  });

  if (sources.length === 0) return null;

  return (
    <div className="rounded-lg border border-border bg-inset px-3.5 py-3">
      <div className="mb-1.5 flex items-center gap-1.5">
        <Info size={13} className="text-subtle" aria-hidden />
        <p className="text-2xs font-700 uppercase tracking-[0.06em] text-subtle">
          Where this data comes from
        </p>
      </div>
      <ul className="space-y-1">
        {sources.map((s) => (
          <li key={s.field} className="text-2xs leading-relaxed text-muted-foreground">
            <span className="font-600 text-foreground">
              {FIELD_LABEL[s.field] ?? s.field}
            </span>{" "}
            —{" "}
            {s.url ? (
              <a
                href={s.url}
                target="_blank"
                rel="noreferrer"
                className="text-primary underline underline-offset-2"
              >
                {s.source}
              </a>
            ) : (
              s.source
            )}
            {s.licence && <span className="text-subtle"> · {s.licence}</span>}
          </li>
        ))}
      </ul>
      <p className="mt-2 text-2xs leading-relaxed text-subtle">
        Reviews, rents and commute times are reported by tenants — never imported.
      </p>
    </div>
  );
}
