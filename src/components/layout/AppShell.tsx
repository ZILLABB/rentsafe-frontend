import { Outlet, useLocation } from "react-router-dom";
import { PageTransition } from "@/components/motion";
import { BottomNav, SideNav } from "./BottomNav";
import { TopBar } from "./TopBar";

/** Routes that keep a reading-width column. Everything else uses the viewport. */
const NARROW_PREFIXES = ["/review", "/legal"];

/** Whether this route should use the whole viewport.
 *
 *  The split is by *what the page is for*, not by taste. A page that is read
 *  straight through — the terms, the privacy policy — wants a ~65-character
 *  measure, and so does a form: a six-step wizard whose inputs stretch to
 *  1400px is harder to fill in, not easier. Everything else here is browsed,
 *  compared or worked with, and a phone column centred on a desktop just wastes
 *  the space it was given.
 */
function isWide(pathname: string): boolean {
  return !NARROW_PREFIXES.some((p) => pathname.startsWith(p));
}

/** App chrome: ink rail on desktop, white top bar everywhere, bottom tabs on
 *  mobile. Each route fades up on navigation via PageTransition (keyed by path). */
export function AppShell() {
  const { pathname } = useLocation();
  const wide = isWide(pathname);
  return (
    <div className="flex min-h-full">
      <SideNav />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar />
        <main
          className={
            wide
              ? "w-full flex-1 px-4 py-4 pb-safe md:px-6 md:py-5 2xl:px-10"
              : "mx-auto w-full max-w-3xl flex-1 px-4 py-4 pb-safe md:px-8 md:py-6"
          }
        >
          <PageTransition key={pathname}>
            <Outlet />
          </PageTransition>
        </main>
      </div>
      <BottomNav />
    </div>
  );
}
