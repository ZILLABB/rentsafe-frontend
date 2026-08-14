import { Bookmark, ChevronRight, ShieldCheck, Star } from "lucide-react";
import { Link } from "react-router-dom";
import { FadeIn } from "@/components/motion";
import { AccountCard } from "@/components/profile/AccountCard";
import { ReviewActions } from "@/components/profile/ReviewActions";
import { Card, SectionLabel } from "@/components/ui/Card";
import { scoreColor } from "@/components/ui/Score";
import { getToken } from "@/lib/api";
import { useMe, useMyReviews, useSavedProperties, useWatches } from "@/lib/hooks";
import { useI18n } from "@/lib/i18n";
import { EmptyState, PageError, Skeleton } from "@/components/ui/States";

export default function ProfilePage() {
  const signedIn = !!getToken();
  const { data: mine, isLoading, isError, refetch } = useMyReviews(signedIn);
  const { data: me } = useMe(signedIn);
  const { data: saved, isLoading: savedLoading } = useSavedProperties(signedIn);
  const { data: watches } = useWatches(signedIn);
  const { t } = useI18n();

  const initial = (me?.display_name ?? "").trim().charAt(0).toUpperCase() || "?";

  return (
    // The hero spans; the cards below are independent of each other and tile
    // into two columns rather than forming one very long scroll.
    <div className="space-y-3 xl:grid xl:grid-cols-2 xl:items-start xl:gap-4 xl:space-y-0">
      <div className="xl:col-span-2">
      {/* Dark hero */}
      <FadeIn>
        <div className="-mx-4 -mt-4 bg-ink px-4 py-5 text-white md:mx-0 md:mt-0 md:rounded-2xl">
          <div className="flex items-center gap-3.5">
            <span className="flex h-14 w-14 flex-none items-center justify-center rounded-full bg-primary-deep font-display text-2xl font-800 text-aqua">
              {initial}
            </span>
            <div className="min-w-0 flex-1">
              <h1 className="truncate font-display text-lg font-800">
                {me?.display_name ?? "Your profile"}
              </h1>
              <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                {signedIn && (
                  <span className="inline-flex items-center gap-1 rounded-sm border border-aqua/50 px-1.5 py-0.5 text-2xs font-700 text-aqua">
                    <ShieldCheck size={10} strokeWidth={2.6} /> PHONE VERIFIED
                    {me?.phone_last4 ? ` ····${me.phone_last4}` : ""}
                  </span>
                )}
                {me && (
                  <span className="rounded-sm border border-white/25 px-1.5 py-0.5 text-2xs font-700 text-white/80">
                    TRUST {me.trust_score.toFixed(2)}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2">
            {[
              { label: "Reviews", value: signedIn ? String(mine?.length ?? "—") : "—" },
              { label: "Saved", value: signedIn ? String(saved?.length ?? "—") : "—" },
              { label: "Areas watched", value: signedIn ? String(watches?.length ?? "—") : "—" },
            ].map((s) => (
              <div key={s.label} className="rounded-md bg-white/[0.06] px-3 py-2.5 text-center">
                <p className="font-display text-xl font-800 text-white">{s.value}</p>
                <p className="text-2xs text-white/55">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </FadeIn>

      </div>

      {/* Your reviews */}
      <FadeIn delay={0.08} className="xl:row-span-2">
        <Card>
          <SectionLabel className="mb-1">Your reviews</SectionLabel>
          <p className="mb-2.5 text-2xs text-subtle">
            You can edit or delete a review within 48 hours of posting.
          </p>
          {!signedIn && (
            <EmptyState
              title="You're not signed in"
              body="Write a review and verify your phone, and your reviews will show up here."
              action={
                <Link
                  to="/review"
                  className="mt-1.5 rounded-lg bg-primary px-5 py-2.5 text-xs font-700 text-white"
                >
                  {t("explore.writeReview")}
                </Link>
              }
            />
          )}

          {signedIn && isLoading && (
            <div className="flex flex-col gap-2">
              <Skeleton className="h-11 w-full" />
              <Skeleton className="h-11 w-full" />
            </div>
          )}

          {signedIn && isError && (
            <PageError message={t("error.reviews")} onRetry={() => refetch()} />
          )}

          {signedIn && !isLoading && !isError && mine?.length === 0 && (
            <EmptyState
              title="No reviews yet"
              body="Your first review helps the next Lagos tenant know before they sign."
              action={
                <Link
                  to="/review"
                  className="mt-1.5 rounded-lg bg-primary px-5 py-2.5 text-xs font-700 text-white"
                >
                  {t("explore.writeReview")}
                </Link>
              }
            />
          )}

          <div className="flex flex-col gap-2">
            {mine?.map(({ review, propertyId, status, moderatorNote, editSecondsLeft, editedAt }) => (
              <div key={review.id} className="rounded-md bg-inset">
                <Link
                  to={`/property/${propertyId}`}
                  className="flex items-center gap-2.5 rounded-md px-2.5 py-2 transition-colors hover:bg-aqua-soft/60"
                >
                  <span className={`w-9 flex-none text-center font-display text-sm font-800 ${scoreColor(review.aggregate)}`}>
                    {review.aggregate.toFixed(1)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-600 text-foreground">
                      {review.tenancyStart}
                      {review.tenancyEnd ? ` – ${review.tenancyEnd}` : " – present"}
                    </p>
                    <p className="font-mono text-2xs text-subtle">{propertyId}</p>
                  </div>
                  <ModerationChip status={status} />
                  <ChevronRight size={14} className="flex-none text-subtle" />
                </Link>
                {/* A moderator's decision is one the author is owed a reason for. */}
                {moderatorNote && status !== "approved" && (
                  <p className="border-t border-border px-2.5 py-2 text-2xs leading-relaxed text-muted-foreground">
                    <strong className="text-foreground">Moderator:</strong>{" "}
                    {moderatorNote}
                  </p>
                )}
                {editedAt && (
                  <p className="border-t border-border px-2.5 py-1.5 text-2xs text-subtle">
                    {t("review.editedNote")}
                  </p>
                )}
                <ReviewActions
                  reviewId={review.id}
                  secondsLeft={editSecondsLeft}
                  positives={review.positives ?? ""}
                  warnings={review.warnings ?? ""}
                />
              </div>
            ))}
          </div>
        </Card>
      </FadeIn>

      {/* Saved */}
      <FadeIn delay={0.14}>
        <Card>
          <div className="mb-2.5 flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-md bg-aqua-soft">
              <Bookmark size={16} className="text-primary" />
            </span>
            <div>
              <SectionLabel>Saved properties</SectionLabel>
              <p className="text-2xs text-subtle">
                Tap the bookmark on any property to keep it here.
              </p>
            </div>
          </div>

          {signedIn && savedLoading && (
            <div className="flex flex-col gap-2">
              <Skeleton className="h-11 w-full" />
              <Skeleton className="h-11 w-full" />
            </div>
          )}

          {signedIn && !savedLoading && saved?.length === 0 && (
            <p className="py-3 text-center text-2xs text-subtle">
              Nothing saved yet.
            </p>
          )}

          <div className="flex flex-col gap-2">
            {saved?.map((s) => (
              <Link
                key={s.property_id}
                to={`/property/${s.property_id}`}
                className="flex items-center gap-2.5 rounded-md bg-inset px-2.5 py-2 transition-colors hover:bg-aqua-soft/60"
              >
                <span
                  className={`w-9 flex-none text-center font-display text-sm font-800 ${scoreColor(s.avg_rating ?? 0)}`}
                >
                  {s.avg_rating !== null ? s.avg_rating.toFixed(1) : "—"}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-600 text-foreground">
                    {s.address ?? s.property_id}
                  </p>
                  <p className="truncate text-2xs text-subtle">
                    {s.area_name ?? s.property_id}
                    {s.note ? ` · ${s.note}` : ""}
                  </p>
                </div>
                <ChevronRight size={14} className="flex-none text-subtle" />
              </Link>
            ))}
          </div>
        </Card>
      </FadeIn>

      {/* Account */}
      {signedIn && (
        <FadeIn delay={0.18}>
          <AccountCard phoneLast4={me?.phone_last4 ?? null} />
        </FadeIn>
      )}

      {/* Legal. Reachable rather than buried: a review platform that hosts
          accusations owes its users the terms they are writing under. */}
      <FadeIn delay={0.24}>
        <Card>
          <SectionLabel className="mb-2">Terms & privacy</SectionLabel>
          <div className="flex flex-col">
            {[
              { to: "/legal/terms", label: "Terms of use", hint: "What you may write, and how moderation works" },
              { to: "/legal/privacy", label: "Privacy policy", hint: "Your number is stored as a hash we cannot read back" },
            ].map((l) => (
              <Link
                key={l.to}
                to={l.to}
                className="flex items-center gap-2.5 rounded-md px-2.5 py-2 transition-colors hover:bg-aqua-soft/60"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-600 text-foreground">{l.label}</p>
                  <p className="truncate text-2xs text-subtle">{l.hint}</p>
                </div>
                <ChevronRight size={14} className="flex-none text-subtle" />
              </Link>
            ))}
          </div>
        </Card>
      </FadeIn>

      {/* Trust explainer */}
      <FadeIn delay={0.2}>
        <Card>
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-md bg-aqua-soft">
              <Star size={16} className="text-primary" />
            </span>
            <div>
              <SectionLabel>Trust score</SectionLabel>
              <p className="text-2xs leading-relaxed text-subtle">
                Verified tenancies and confirmed evidence raise your score — and how
                much weight your reviews carry.
              </p>
            </div>
          </div>
        </Card>
      </FadeIn>
    </div>
  );
}

/** Where a review currently sits in moderation. Un-approved reviews are only
 *  visible to their author, so the author needs to know why. */
function ModerationChip({ status }: { status: string }) {
  const map: Record<string, { label: string; className: string }> = {
    approved: { label: "PUBLISHED", className: "bg-score-good/10 text-score-good" },
    pending: { label: "IN REVIEW", className: "bg-score-mid/10 text-score-mid" },
    flagged: { label: "IN REVIEW", className: "bg-score-mid/10 text-score-mid" },
    needs_edits: { label: "NEEDS EDITS", className: "bg-info/10 text-info" },
    rejected: { label: "NOT PUBLISHED", className: "bg-score-bad/10 text-score-bad" },
  };
  const s = map[status] ?? map.pending;
  return (
    <span className={`flex-none rounded-[5px] px-1.5 py-0.5 text-2xs font-700 ${s.className}`}>
      {s.label}
    </span>
  );
}
