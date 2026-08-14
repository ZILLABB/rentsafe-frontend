import { motion } from "framer-motion";
import {
  BarChart3,
  Bell,
  MapPin,
  PenSquare,
  UserRound,
  type LucideIcon,
} from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import { getToken } from "@/lib/api";
import { cn } from "@/lib/cn";
import { useUnreadAlerts } from "@/lib/hooks";
import { useI18n } from "@/lib/i18n";

type Tab = {
  to: string;
  labelKey: string;
  icon: LucideIcon;
  end: boolean;
  /** Shows the unread-activity badge. Driven by real counts — this used to be
   *  a hardcoded `dot: true`, so the badge was permanently lit and told the
   *  user nothing. */
  badge?: boolean;
};

// The 5 primary tabs (design 1a): white bar, teal active, badge on Alerts.
const TABS: Tab[] = [
  { to: "/", labelKey: "nav.explore", icon: MapPin, end: true },
  { to: "/review", labelKey: "nav.review", icon: PenSquare, end: false },
  { to: "/compare", labelKey: "nav.compare", icon: BarChart3, end: false },
  { to: "/profile", labelKey: "nav.profile", icon: UserRound, end: false },
  { to: "/alerts", labelKey: "nav.alerts", icon: Bell, end: false, badge: true },
];

/** Unread count for the Alerts tab, or 0 when signed out / watching nothing. */
function useUnreadBadge(): number {
  const { data } = useUnreadAlerts(!!getToken());
  return data?.unread ?? 0;
}

export function BottomNav() {
  const { t } = useI18n();
  const unread = useUnreadBadge();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-card md:hidden">
      <div className="mx-auto flex max-w-3xl items-stretch justify-around pb-[env(safe-area-inset-bottom)]">
        {TABS.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            end={tab.end}
            className={({ isActive }) =>
              cn(
                "relative flex flex-1 flex-col items-center gap-1 py-2.5 text-2xs transition-colors",
                isActive ? "font-700 text-primary" : "font-500 text-subtle",
              )
            }
          >
            <span className="relative">
              <tab.icon size={19} strokeWidth={2.1} />
              {tab.badge && unread > 0 && (
                <span
                  aria-label={`${unread} new`}
                  className="absolute -right-2.5 -top-1.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full border-[1.5px] border-card bg-score-bad px-1 text-2xs font-800 leading-none text-white"
                >
                  {unread > 9 ? "9+" : unread}
                </span>
              )}
            </span>
            <span>{t(tab.labelKey)}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}

/** Desktop: deep-ink rail (#0B2027) with an aqua active state + area-watch card. */
export function SideNav() {
  const { pathname } = useLocation();
  const { t } = useI18n();
  const unread = useUnreadBadge();
  const isActive = (to: string, end: boolean) =>
    end ? pathname === to : pathname.startsWith(to);

  return (
    <aside className="sticky top-0 hidden h-screen w-56 shrink-0 flex-col bg-ink p-3.5 md:flex">
      <div className="mb-6 flex items-center gap-2.5 px-2.5 pt-1.5">
        <span className="flex h-[30px] w-[30px] items-center justify-center rounded-md bg-aqua">
          <span className="h-3 w-3 rounded-[3.5px] border-[2.5px] border-ink" />
        </span>
        <span className="font-display text-sm font-800 text-white">
          RentSafe <span className="text-2xs font-700 tracking-wide text-aqua">LAGOS</span>
        </span>
      </div>

      <nav className="flex flex-col gap-1">
        {TABS.map((tab) => {
          const active = isActive(tab.to, tab.end);
          return (
            <NavLink
              key={tab.to}
              to={tab.to}
              end={tab.end}
              className="relative flex items-center gap-3 rounded-md px-3 py-2.5 text-xs"
            >
              {active && (
                <motion.span
                  layoutId="nav-active"
                  className="absolute inset-0 rounded-md bg-aqua/15"
                  transition={{ type: "spring", stiffness: 400, damping: 32 }}
                />
              )}
              <tab.icon
                size={17}
                strokeWidth={2.1}
                className={cn("relative z-10", active ? "text-aqua" : "text-white/50")}
              />
              <span
                className={cn(
                  "relative z-10",
                  active ? "font-700 text-aqua" : "font-500 text-white/65",
                )}
              >
                {t(tab.labelKey)}
              </span>
              {tab.badge && unread > 0 && (
                <span className="relative z-10 ml-auto rounded-full bg-score-bad px-1.5 text-2xs font-800 text-white">
                  {unread > 9 ? "9+" : unread}
                </span>
              )}
            </NavLink>
          );
        })}
      </nav>

      <div className="mt-auto rounded-lg bg-white/[0.06] p-3">
        <p className="text-2xs font-700 text-white">{t("brand.tagline")}</p>
        <p className="mt-1 text-2xs leading-relaxed text-white/55">
          {t("brand.mission")}
        </p>
      </div>
    </aside>
  );
}
