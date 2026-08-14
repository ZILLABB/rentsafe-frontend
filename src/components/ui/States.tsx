/** Loading, empty and error states.
 *
 *  These exist because the app used to fall back to fixture data whenever the
 *  API failed — showing invented properties and ratings to someone deciding
 *  whether to sign a lease. Showing nothing, honestly, is always better. */

import { AlertTriangle, Inbox } from "lucide-react";
import type { ReactNode } from "react";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/cn";
import { useI18n } from "@/lib/i18n";

/** Shimmering placeholder block. Uses the `.skeleton` utility in index.css. */
export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("skeleton rounded-md", className)} />;
}

/** Generic full-page loading shape for detail routes. */
export function PageSkeleton() {
  return (
    <div className="space-y-3" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading</span>
      <Skeleton className="-mx-4 -mt-4 h-40 md:mx-0 md:mt-0 md:rounded-2xl" />
      <Card>
        <div className="space-y-2.5">
          <Skeleton className="h-5 w-2/3" />
          <Skeleton className="h-3.5 w-1/2" />
          <Skeleton className="h-3.5 w-1/3" />
        </div>
      </Card>
      <Card>
        <div className="space-y-2">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-4 w-full" />
          ))}
        </div>
      </Card>
    </div>
  );
}

/** Something went wrong fetching. Says what failed and offers the way out. */
export function PageError({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  const { t } = useI18n();
  return (
    <Card>
      <div className="flex flex-col items-center gap-2 py-6 text-center">
        <AlertTriangle size={22} className="text-score-bad" aria-hidden />
        <p className="text-sm font-700 text-heading">{t("error.title")}</p>
        <p className="max-w-xs text-xs leading-relaxed text-muted-foreground">{message}</p>
        {onRetry && (
          <button
            onClick={onRetry}
            className="mt-1.5 rounded-md border border-border px-4 py-2 text-xs font-700 text-primary transition-colors hover:bg-muted"
          >
            {t("error.retry")}
          </button>
        )}
      </div>
    </Card>
  );
}

/** Nothing here yet. On a review platform this is a recruiting moment, so it
 *  takes an action rather than just apologising for the void. */
export function EmptyState({
  title,
  body,
  action,
  icon,
}: {
  title: string;
  body: string;
  action?: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-border px-4 py-8 text-center">
      {icon ?? <Inbox size={22} className="text-subtle" aria-hidden />}
      <p className="text-sm font-700 text-heading">{title}</p>
      <p className="max-w-xs text-xs leading-relaxed text-muted-foreground">{body}</p>
      {action}
    </div>
  );
}
