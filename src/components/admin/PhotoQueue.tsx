import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, CheckCircle2, ImageOff, X } from "lucide-react";
import { useState } from "react";
import { AuthedImage } from "@/components/ui/AuthedImage";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/States";
import { api } from "@/lib/api";

/** Photo moderation queue.
 *
 *  Uploads default to `moderation_status="pending"` and the property page only
 *  renders `approved`. Both endpoints existed from the start and the admin page
 *  had no photo section at all — so every photo a tenant ever uploaded went into
 *  a queue no human could reach, and was invisible forever.
 *
 *  Photos need reviewing for different reasons than text does: a photo of a
 *  flooded compound is evidence, a photo through a neighbour's window is a
 *  privacy problem, and neither is something a word filter can catch.
 */
export function PhotoQueue() {
  const queryClient = useQueryClient();
  const [acted, setActed] = useState<Record<number, "approve" | "reject">>({});
  const [error, setError] = useState<string | null>(null);

  const { data: queue = [], isLoading } = useQuery({
    queryKey: ["admin", "photos"],
    queryFn: api.photoQueue,
  });

  async function act(photoId: number, action: "approve" | "reject") {
    setError(null);
    try {
      await api.moderatePhoto(photoId, action);
      setActed((a) => ({ ...a, [photoId]: action }));
      await queryClient.invalidateQueries({ queryKey: ["admin", "photos"] });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not apply that decision.");
    }
  }

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (queue.length === 0) {
    return (
      <Card className="py-10 text-center">
        <CheckCircle2 size={26} className="mx-auto text-score-good" />
        <p className="mt-2 text-sm font-600 text-foreground">No photos waiting</p>
        <p className="text-xs text-subtle">
          Uploads land here before they appear on a property page.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-2.5">
      {error && (
        <p className="rounded-md bg-score-bad/[0.08] px-3 py-2 text-xs text-score-bad">
          {error}
        </p>
      )}

      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
        {queue.map((p) => {
          const decision = acted[p.photo_id];
          return (
            <div
              key={p.photo_id}
              className="overflow-hidden rounded-lg border border-border bg-card"
            >
              <div className="relative aspect-[4/3] bg-inset">
                <AuthedImage
                  src={p.thumb_url}
                  alt={p.caption ?? `Photo awaiting review for ${p.property_id}`}
                  className="h-full w-full object-cover"
                />
                {p.kind === "evidence" && (
                  <span className="absolute left-1.5 top-1.5 rounded-sm bg-ink/85 px-1.5 py-0.5 text-2xs font-700 text-white">
                    EVIDENCE
                  </span>
                )}
              </div>

              <div className="p-2.5">
                <p className="truncate text-2xs font-600 text-foreground">
                  {p.property_address ?? p.property_id}
                </p>
                <p className="truncate font-mono text-2xs text-subtle">
                  {p.property_id}
                </p>
                {p.caption && (
                  <p className="mt-1 line-clamp-2 text-2xs text-muted-foreground">
                    “{p.caption}”
                  </p>
                )}
                <p className="mt-1 text-2xs text-subtle">
                  {Math.round(p.submitted_hours_ago)}h ago
                  {p.uploader_trust != null &&
                    ` · trust ${Number(p.uploader_trust).toFixed(2)}`}
                </p>

                {decision ? (
                  <p
                    className={`mt-2 text-2xs font-700 ${
                      decision === "approve" ? "text-score-good" : "text-score-bad"
                    }`}
                  >
                    {decision === "approve" ? "Published" : "Rejected"}
                  </p>
                ) : (
                  <div className="mt-2 flex gap-1.5">
                    <button
                      onClick={() => act(p.photo_id, "approve")}
                      className="inline-flex flex-1 items-center justify-center gap-1 rounded-md bg-score-good/10 py-1.5 text-2xs font-700 text-score-good transition-colors hover:bg-score-good/20"
                    >
                      <Check size={11} /> Publish
                    </button>
                    <button
                      onClick={() => act(p.photo_id, "reject")}
                      className="inline-flex flex-1 items-center justify-center gap-1 rounded-md bg-score-bad/10 py-1.5 text-2xs font-700 text-score-bad transition-colors hover:bg-score-bad/20"
                    >
                      <X size={11} /> Reject
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <p className="flex items-start gap-1.5 px-1 text-2xs leading-relaxed text-subtle">
        <ImageOff size={12} className="mt-px flex-none" aria-hidden />
        <span>
          Location metadata is stripped from every upload before it is stored, so
          these images carry no GPS tag. Reject anything showing a person, a
          neighbour's window, or a document with a name on it.
        </span>
      </p>
    </div>
  );
}
