import { useEffect, useState } from "react";
import { getToken } from "@/lib/api";
import { cn } from "@/lib/cn";

/** An `<img>` that can display images behind bearer auth.
 *
 *  Approved photos are public and load normally. A photo still awaiting
 *  moderation is only readable by its uploader, and the check is on the
 *  Authorization header — which a plain `<img src>` never sends, so those came
 *  back 404 and rendered as broken images. Here we fetch the bytes with the
 *  token and hand the element an object URL instead.
 *
 *  Signed URLs would be the other option; this keeps the access rule in exactly
 *  one place on the server rather than splitting it across a token scheme. */
export function AuthedImage({
  src,
  alt,
  className,
  needsAuth,
}: {
  src: string;
  alt: string;
  className?: string;
  /** Skip the fetch for public images — most photos are approved. */
  needsAuth?: boolean;
}) {
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!needsAuth) return;
    let revoked = false;
    let url: string | null = null;

    (async () => {
      try {
        const token = getToken();
        const res = await fetch(src, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (!res.ok) throw new Error(String(res.status));
        const blob = await res.blob();
        if (revoked) return;
        url = URL.createObjectURL(blob);
        setObjectUrl(url);
      } catch {
        setFailed(true);
      }
    })();

    return () => {
      revoked = true;
      // Object URLs pin their blob in memory until explicitly released.
      if (url) URL.revokeObjectURL(url);
    };
  }, [src, needsAuth]);

  if (failed) {
    return (
      <div
        className={cn(
          "flex items-center justify-center bg-muted text-center text-2xs text-subtle",
          className,
        )}
        role="img"
        aria-label={alt}
      >
        Unavailable
      </div>
    );
  }

  const resolved = needsAuth ? objectUrl : src;
  if (!resolved) {
    return <div className={cn("skeleton", className)} aria-label={alt} role="img" />;
  }

  return <img src={resolved} alt={alt} className={className} />;
}
