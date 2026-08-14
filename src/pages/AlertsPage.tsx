import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  Bell,
  CloudRain,
  MessageSquareText,
  Plus,
  X,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { FadeIn, StaggerContainer, StaggerItem } from "@/components/motion";
import { Card, SectionLabel } from "@/components/ui/Card";
import { EmptyState, PageError, Skeleton } from "@/components/ui/States";
import { api, getToken, type AlertScope, type ApiAlert } from "@/lib/api";
import { cn } from "@/lib/cn";
import { useMarkAlertsRead, useToggleWatch, useWatches } from "@/lib/hooks";
import { useI18n } from "@/lib/i18n";

const ICON: Record<ApiAlert["kind"], LucideIcon> = {
  review: MessageSquareText,
  flood: CloudRain,
  agent_flag: AlertTriangle,
};

const TONE_BG: Record<ApiAlert["tone"], string> = {
  bad: "bg-score-bad/10",
  info: "bg-info/10",
  mid: "bg-score-mid/10",
};

const TONE_TEXT: Record<ApiAlert["tone"], string> = {
  bad: "text-score-bad",
  info: "text-info",
  mid: "text-score-mid",
};

function ago(hours: number | null): string {
  if (hours === null) return "";
  if (hours < 1) return "just now";
  if (hours < 24) return `${Math.round(hours)}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

/** Activity across Lagos, narrowed to the areas you watch.
 *
 *  Still an in-app feed rather than push or SMS — the page says so instead of
 *  implying a subscription that would text you. */
export default function AlertsPage() {
  const { t } = useI18n();
  const signedIn = !!getToken();
  const [scope, setScope] = useState<AlertScope>("auto");

  const { data: watches = [] } = useWatches(signedIn);
  const markRead = useMarkAlertsRead();

  const effectiveScope: AlertScope =
    scope === "auto" ? (watches.length > 0 ? "watched" : "all") : scope;

  const { data: alerts, isLoading, isError, refetch } = useQuery({
    queryKey: ["alerts", effectiveScope],
    queryFn: () => api.alerts(effectiveScope),
  });

  // Opening the page is what "reading" means, so clear the badge once the
  // feed has actually rendered.
  useEffect(() => {
    if (signedIn && watches.length > 0 && alerts && !markRead.isPending) {
      markRead.mutate();
    }
    // Only on first successful load — re-running on every render would spam.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signedIn, watches.length, !!alerts]);

  return (
    <div className="space-y-3.5">
      <FadeIn>
        <div>
          <h1 className="font-display text-xl font-800 text-heading">
            {t("alerts.title")}
          </h1>
          <p className="mt-0.5 text-xs text-muted-foreground">{t("alerts.subtitle")}</p>
        </div>
      </FadeIn>

      {signedIn && <WatchedAreas watches={watches} />}

      {/* Scope switch — only meaningful once something is being watched. */}
      {signedIn && watches.length > 0 && (
        <div className="flex gap-2">
          {(
            [
              ["watched", t("alerts.scopeWatched")],
              ["all", t("alerts.scopeAll")],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              onClick={() => setScope(value)}
              aria-pressed={effectiveScope === value}
              className={cn(
                "rounded-full px-3.5 py-1.5 text-xs font-600 transition-colors",
                effectiveScope === value
                  ? "bg-ink text-white"
                  : "bg-muted text-primary-deep hover:bg-aqua-soft",
              )}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {isLoading && (
        <Card>
          <div className="space-y-2.5">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        </Card>
      )}

      {isError && <PageError message={t("error.alerts")} onRetry={() => refetch()} />}

      {!isLoading && !isError && alerts?.length === 0 && (
        <EmptyState
          title={t("alerts.empty")}
          body={
            effectiveScope === "watched"
              ? t("alerts.emptyWatched")
              : t("alerts.emptyBody")
          }
        />
      )}

      {/* Independent items, so they tile into columns on a wide screen rather
          than forming one very tall single-file feed. */}
      {alerts && alerts.length > 0 && (
        <StaggerContainer className="grid gap-2 lg:grid-cols-2 xl:grid-cols-3">
          {alerts.map((a, i) => {
            const Icon = ICON[a.kind];
            const href = a.property_id
              ? `/property/${a.property_id}`
              : a.agent_slug
                ? `/agent/${a.agent_slug}`
                : null;

            const body = (
              <div
                className={cn(
                  "flex items-start gap-3 rounded-lg border bg-card p-3 transition-colors hover:border-primary/40",
                  a.unread ? "border-primary/40" : "border-border",
                )}
              >
                <span
                  className={`flex h-9 w-9 flex-none items-center justify-center rounded-md ${TONE_BG[a.tone]}`}
                >
                  <Icon size={16} className={TONE_TEXT[a.tone]} aria-hidden />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-600 text-foreground">
                    {a.unread && (
                      <span
                        className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-primary align-middle"
                        aria-label="New"
                      />
                    )}
                    {a.title}
                  </p>
                  {a.detail && (
                    <p className="mt-0.5 line-clamp-2 text-2xs leading-relaxed text-muted-foreground">
                      {a.detail}
                    </p>
                  )}
                </div>
                {a.hours_ago !== null && (
                  <span className="flex-none text-2xs text-subtle">
                    {ago(a.hours_ago)}
                  </span>
                )}
              </div>
            );

            return (
              <StaggerItem key={`${a.kind}-${a.property_id ?? a.agent_slug}-${i}`}>
                {href ? <Link to={href}>{body}</Link> : body}
              </StaggerItem>
            );
          })}
        </StaggerContainer>
      )}

      <p className="px-1 pb-2 pt-1 text-2xs leading-relaxed text-subtle">
        {t("alerts.noPush")}
      </p>
    </div>
  );
}

/** Watched-area chips with an add/remove control. */
function WatchedAreas({
  watches,
}: {
  watches: { area_code: string; area_name: string; unread_count: number }[];
}) {
  const { t } = useI18n();
  const [picking, setPicking] = useState(false);
  const toggle = useToggleWatch();

  const { data: areas = [] } = useQuery({
    queryKey: ["neighbourhoods"],
    queryFn: api.listNeighbourhoods,
    staleTime: 60 * 60 * 1000,
  });

  const watched = new Set(watches.map((w) => w.area_code));
  const available = areas.filter((a) => !watched.has(a.code));

  return (
    <Card>
      <div className="mb-2 flex items-center gap-2">
        <Bell size={14} className="text-primary" aria-hidden />
        <SectionLabel>{t("alerts.watching")}</SectionLabel>
      </div>

      {watches.length === 0 ? (
        <p className="mb-2 text-2xs leading-relaxed text-muted-foreground">
          {t("alerts.watchNone")}
        </p>
      ) : (
        <div className="mb-2 flex flex-wrap gap-1.5">
          {watches.map((w) => (
            <span
              key={w.area_code}
              className="flex items-center gap-1.5 rounded-full bg-aqua-soft py-1 pl-3 pr-1.5 text-2xs font-600 text-primary-deep"
            >
              {w.area_name}
              {w.unread_count > 0 && (
                <span className="rounded-full bg-primary px-1.5 text-2xs font-800 text-white">
                  {w.unread_count}
                </span>
              )}
              <button
                onClick={() =>
                  toggle.mutate({ areaCode: w.area_code, next: false })
                }
                aria-label={`Stop watching ${w.area_name}`}
                className="flex h-5 w-5 items-center justify-center rounded-full text-primary-deep/60 transition-colors hover:bg-card hover:text-score-bad"
              >
                <X size={11} />
              </button>
            </span>
          ))}
        </div>
      )}

      {picking ? (
        <div className="flex flex-wrap gap-1.5">
          {available.map((a) => (
            <button
              key={a.code}
              onClick={() => {
                toggle.mutate({ areaCode: a.code, next: true });
                setPicking(false);
              }}
              className="rounded-full bg-muted px-3 py-1.5 text-2xs font-600 text-primary-deep transition-colors hover:bg-aqua-soft"
            >
              {a.name}
            </button>
          ))}
          {available.length === 0 && (
            <p className="text-2xs text-subtle">You're watching every area.</p>
          )}
          <button
            onClick={() => setPicking(false)}
            className="rounded-full px-3 py-1.5 text-2xs font-600 text-subtle"
          >
            Cancel
          </button>
        </div>
      ) : (
        <button
          onClick={() => setPicking(true)}
          className="flex items-center gap-1 rounded-full border border-dashed border-border px-3 py-1.5 text-2xs font-700 text-primary transition-colors hover:border-primary/50"
        >
          <Plus size={12} /> {t("alerts.watchAdd")}
        </button>
      )}
    </Card>
  );
}
