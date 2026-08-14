import { AnimatePresence, motion } from "framer-motion";
import { Bookmark, ChevronLeft, Clock, Share2 } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AuthedImage } from "@/components/ui/AuthedImage";
import { getToken } from "@/lib/api";
import { cn } from "@/lib/cn";
import { usePropertyPhotos, useSavedProperties, useToggleSaved } from "@/lib/hooks";
import type { PropertySummary } from "@/lib/types";

/** Property hero: real tenant photos where they exist, the texture placeholder
 *  where they don't, plus back / save / share.
 *
 *  The photo count used to read "1 / 6" on every property regardless of how
 *  many photos existed — which was none, since there was no upload path. */
export function PhotoHero({ p }: { p: PropertySummary }) {
  const navigate = useNavigate();
  const [index, setIndex] = useState(0);
  const signedIn = !!getToken();

  const { data: photos = [] } = usePropertyPhotos(p.propertyId);
  const { data: saved = [] } = useSavedProperties(signedIn);
  const toggleSaved = useToggleSaved(p.propertyId);

  const isSaved = saved.some((s) => s.property_id === p.propertyId);
  const current = photos[Math.min(index, photos.length - 1)];

  const shareText = `Check this property on RentSafe Lagos before you rent: ${p.addressLocal} — rated ${p.avgRating.toFixed(1)}/5 by ${p.totalReviews} tenants. ${window.location.href}`;

  return (
    <div className="tex-photo relative -mx-4 -mt-4 h-[190px] overflow-hidden md:mx-0 md:mt-0 md:rounded-t-2xl">
      {current ? (
        <AnimatePresence mode="wait">
          <motion.div
            key={current.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="h-full w-full"
          >
            <AuthedImage
              src={current.url}
              alt={current.caption ?? `Photo of ${p.addressLocal}`}
              needsAuth={current.moderation_status !== "approved"}
              className="h-full w-full object-cover"
            />
          </motion.div>
        </AnimatePresence>
      ) : (
        <span className="absolute inset-0 flex items-center justify-center font-mono text-2xs text-muted-foreground">
          No tenant photos yet
        </span>
      )}

      <button
        onClick={() => navigate(-1)}
        className="absolute left-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-ink/80 text-white"
        aria-label="Back"
      >
        <ChevronLeft size={18} />
      </button>

      <div className="absolute right-3 top-3 flex gap-2">
        {signedIn && (
          <button
            onClick={() => toggleSaved.mutate(!isSaved)}
            disabled={toggleSaved.isPending}
            aria-pressed={isSaved}
            aria-label={isSaved ? "Remove from saved" : "Save this property"}
            className={cn(
              "flex h-9 w-9 items-center justify-center rounded-full shadow-lift transition-transform active:scale-95",
              isSaved ? "bg-primary text-white" : "bg-card text-primary-deep",
              toggleSaved.isPending && "opacity-60",
            )}
          >
            <Bookmark size={16} fill={isSaved ? "currentColor" : "none"} />
          </button>
        )}
        <a
          href={`https://wa.me/?text=${encodeURIComponent(shareText)}`}
          target="_blank"
          rel="noreferrer"
          aria-label="Share on WhatsApp"
          className="flex h-9 w-9 items-center justify-center rounded-full bg-[#25D366] text-white shadow-lift transition-transform active:scale-95"
        >
          <Share2 size={15} strokeWidth={2.2} />
        </a>
      </div>

      {toggleSaved.isError && (
        <p
          role="status"
          className="absolute inset-x-3 top-14 rounded-md bg-score-bad px-2.5 py-1.5 text-2xs font-600 text-white"
        >
          Couldn't save that — your session may have expired. Sign in again from
          the review form.
        </p>
      )}

      {/* Caption + pending badge for the author's own unapproved uploads. */}
      {current && (
        <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-2 bg-gradient-to-t from-ink/80 to-transparent p-3">
          <p className="min-w-0 flex-1 truncate text-2xs text-white/90">
            {current.caption ?? ""}
          </p>
          {current.moderation_status !== "approved" && (
            <span className="flex flex-none items-center gap-1 rounded-sm bg-score-mid px-1.5 py-0.5 text-2xs font-700 text-white">
              <Clock size={10} /> AWAITING REVIEW
            </span>
          )}
        </div>
      )}

      {photos.length > 1 && (
        <>
          <div className="absolute bottom-2.5 right-3 rounded-sm bg-ink/75 px-2 py-0.5 font-mono text-2xs text-white">
            {Math.min(index, photos.length - 1) + 1} / {photos.length}
          </div>
          <div className="absolute inset-x-0 bottom-9 flex justify-center gap-1.5">
            {photos.map((photo, i) => (
              <button
                key={photo.id}
                onClick={() => setIndex(i)}
                aria-label={`Photo ${i + 1}`}
                aria-current={i === index}
                className={cn(
                  "h-1.5 rounded-full transition-all",
                  i === index ? "w-5 bg-white" : "w-1.5 bg-white/50",
                )}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
