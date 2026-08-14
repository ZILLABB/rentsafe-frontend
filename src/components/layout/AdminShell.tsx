import { Link, Outlet } from "react-router-dom";
import { ShieldCheck } from "lucide-react";

/** Chrome for the moderation console.
 *
 *  Deliberately separate from AppShell: moderators were previously given the
 *  tenant bottom nav (Explore / Review / Compare / Profile / Alerts) underneath
 *  the review queue, which is neither useful nor appropriate for the role. */
export function AdminShell() {
  return (
    <div className="flex min-h-full flex-col bg-background">
      <header className="sticky top-0 z-30 border-b border-border bg-ink">
        <div className="mx-auto flex h-14 max-w-4xl items-center gap-2.5 px-4">
          <ShieldCheck size={18} className="text-aqua" aria-hidden />
          <span className="font-display text-sm font-800 text-white">RentSafe</span>
          {/* Dark text ON the gold chip — a contrast pairing, not a heading, so
              it stays pinned to the ink surface colour in both themes. */}
          <span className="rounded-sm bg-gold px-1.5 py-0.5 text-2xs font-800 uppercase tracking-wider text-ink">
            Moderation
          </span>
          <Link
            to="/"
            className="ml-auto rounded-md px-2.5 py-2 text-2xs font-600 text-white/70 transition-colors hover:text-white"
          >
            Leave console
          </Link>
        </div>
      </header>
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-5 md:px-8">
        <Outlet />
      </main>
    </div>
  );
}
