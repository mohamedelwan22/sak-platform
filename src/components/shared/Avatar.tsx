import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { profileApi } from "@/api/profile.api";

function getInitials(name: string | null | undefined): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? "";
  const second = parts[1]?.[0] ?? parts[0]?.[1] ?? "";
  return (first + second).toUpperCase();
}

export function Avatar({
  name,
  avatarUrl,
  size = 40,
  className,
}: {
  name?: string | null;
  avatarUrl?: string | null;
  size?: number;
  className?: string;
}) {
  const [src, setSrc] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let objectUrl: string | null = null;

    if (!avatarUrl) {
      setSrc(null);
      setLoaded(false);
      return;
    }

    setLoaded(false);
    profileApi
      .downloadAvatar()
      .then((res) => {
        if (cancelled) return;
        const data = res.data;
        if (data instanceof Blob && data.size > 0) {
          objectUrl = URL.createObjectURL(data);
          setSrc(objectUrl);
        } else {
          setSrc(null);
        }
      })
      .catch(() => {
        if (!cancelled) setSrc(null);
      });

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [avatarUrl]);

  const showImage = !!src;
  const initials = getInitials(name);

  return (
    <div
      className={cn(
        "relative shrink-0 overflow-hidden rounded-full bg-gold/15 text-gold",
        className,
      )}
      style={{ width: size, height: size, fontSize: Math.max(size * 0.36, 12) }}
    >
      {showImage ? (
        <img
          src={src}
          alt={name ?? "avatar"}
          className="h-full w-full object-cover"
          onLoad={() => setLoaded(true)}
          onError={() => {
            setSrc(null);
            setLoaded(false);
          }}
          style={{ opacity: loaded ? 1 : 0 }}
        />
      ) : null}
      {(!showImage || !loaded) && (
        <span className="flex h-full w-full items-center justify-center font-bold select-none">
          {initials}
        </span>
      )}
    </div>
  );
}
