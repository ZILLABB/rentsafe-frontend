import { Compass } from "lucide-react";
import { Link } from "react-router-dom";

/** Catch-all route. Without this an unknown path rendered the shell with an
 *  empty body — no message and no way back. */
export default function NotFoundPage() {
  return (
    <div className="flex flex-col items-center gap-2 py-20 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted">
        <Compass size={28} className="text-muted-foreground" aria-hidden />
      </div>
      <h1 className="mt-2 font-display text-xl font-800 text-heading">Page not found</h1>
      <p className="max-w-xs text-sm text-muted-foreground">
        That link doesn't lead anywhere on RentSafe. It may have moved, or the
        address may be mistyped.
      </p>
      <Link
        to="/"
        className="mt-3 rounded-lg bg-primary px-5 py-3 text-sm font-700 text-white"
      >
        Back to Explore
      </Link>
    </div>
  );
}
