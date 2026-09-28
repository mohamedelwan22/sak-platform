import { useQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Megaphone, ExternalLink } from "lucide-react";
import { apiClient } from "@/api/client";
import { t, getLanguage, isRTL } from "@/i18n";

export interface TickerAnnouncement {
  id: string;
  title: string;
  message: string;
  ctaLabel: string | null;
  externalUrl: string | null;
}

/**
 * Phase 10.6 / Phase F — announcement ticker driven by live broadcast data.
 *
 * - variant="public": PUBLIC website ticker (above the navbar, unauthenticated).
 * - variant="portal": authenticated, audience-scoped ticker.
 * - Renders nothing when there are no active announcements.
 * - External CTA links are server-validated http(s) URLs and open safely with
 *   target=_blank rel="noopener noreferrer".
 *
 * SEAMLESSNESS
 * ------------
 * The track is filled with as many copies of the announcement sequence as are
 * needed to exceed the viewport by at least one full copy, and the animation
 * translates by EXACTLY one copy width. Because every copy is identical, the
 * moment the first copy leaves the viewport an identical copy is already in
 * place, so the loop is mathematically seamless for any content length,
 * viewport width, or number of announcements.
 *
 * A fixed repetition count cannot provide this guarantee: with a short
 * announcement a fixed count yields a track narrower than the viewport and an
 * empty band appears once the content has scrolled past.
 *
 * Direction follows the language: English scrolls left → right, Arabic
 * right → left. Nothing about the direction is hardcoded per locale.
 */

/** Pixels per second. Constant speed regardless of content length. */
const PX_PER_SECOND = 55;
/** Never spin faster than this, nor slower than this. */
const MIN_DURATION_MS = 8_000;
const MAX_DURATION_MS = 90_000;
/** Breathing room between repeated items, in px on each side. */
const ITEM_GAP = 64;

function useTickerData(variant: "public" | "portal") {
  return useQuery({
    queryKey: ["announcement-ticker", variant],
    queryFn: async () => {
      const lang = getLanguage();
      const res =
        variant === "public"
          ? await apiClient.get("/public/ticker", { params: { lang } })
          : await apiClient.get("/notifications/ticker", { params: { lang } });
      return (res.data?.data ?? []) as TickerAnnouncement[];
    },
    staleTime: 60_000,
    refetchInterval: 120_000,
    retry: false,
  });
}

function TickerItem({
  announcement,
  rtl,
}: {
  announcement: TickerAnnouncement;
  rtl: boolean;
}) {
  return (
    <span
      className="flex shrink-0 items-center gap-2 whitespace-nowrap"
      style={{ paddingInline: ITEM_GAP / 2, direction: rtl ? "rtl" : "ltr" }}
    >
      <Megaphone className="h-3.5 w-3.5 shrink-0 text-gold" aria-hidden />
      <span className="text-sm font-semibold text-foreground">{announcement.title}</span>
      {announcement.message && (
        <span className="text-sm text-muted-foreground">— {announcement.message}</span>
      )}
      {announcement.externalUrl && (
        <a
          href={announcement.externalUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="inline-flex shrink-0 items-center gap-1 rounded-full border border-gold/40 bg-gold/10 px-2.5 py-0.5 text-xs font-bold text-gold transition hover:bg-gold/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
        >
          {announcement.ctaLabel || t("ticker.readMore")}
          <ExternalLink className="h-3 w-3" aria-hidden />
        </a>
      )}
    </span>
  );
}

export function AnnouncementTicker({ variant = "public" }: { variant?: "public" | "portal" }) {
  const { data } = useTickerData(variant);
  const announcements = data ?? [];

  const trackRef = useRef<HTMLDivElement | null>(null);
  const measureRef = useRef<HTMLDivElement | null>(null);
  const [copyCount, setCopyCount] = useState(2);
  const [copyWidth, setCopyWidth] = useState(0);

  const rtl = isRTL();

  /**
   * Measures one copy of the sequence and derives how many copies are required
   * to cover the viewport plus one full copy. Runs on mount, on content change
   * and on resize.
   */
  const recompute = useCallback(() => {
    const measure = measureRef.current;
    if (!measure) return;

    // Measure the intrinsic width of exactly one copy of the sequence.
    const width = measure.getBoundingClientRect().width;
    if (!width || width < 1) return;

    const viewport = window.innerWidth;
    // Guarantee: copies * width >= viewport + width
    const needed = Math.ceil(viewport / width) + 1;
    setCopyWidth(width);
    setCopyCount(Math.max(2, needed));
  }, []);

  useLayoutEffect(() => {
    if (announcements.length === 0) return;
    recompute();

    const observer = new ResizeObserver(() => recompute());
    if (measureRef.current) observer.observe(measureRef.current);
    window.addEventListener("resize", recompute);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", recompute);
    };
  }, [announcements, recompute]);

  /**
   * Drives the loop with the Web Animations API so the translation distance is
   * the measured copy width rather than a percentage of an arbitrarily wide
   * track. Exactly one copy width per iteration = seamless.
   */
  useEffect(() => {
    const track = trackRef.current;
    if (!track || copyWidth < 1 || announcements.length === 0) return;

    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

    if (reduced) return; // static, fully readable presentation

    // The track is ALWAYS laid out left-to-right internally, regardless of the
    // document direction. In an RTL container a right-anchored track would slide
    // entirely out of view once it translated leftwards, emptying the ticker at
    // the end of every cycle. Laying the track out LTR and pinning it to the left
    // edge guarantees the trailing copy is always positioned to enter from the
    // right, so the direction of MOTION can still follow the language.
    //
    // LTR: content moves left → right  (negative → 0)
    // RTL: content moves right → left  (0 → negative)
    const from = rtl ? 0 : -copyWidth;
    const to = rtl ? -copyWidth : 0;

    const distance = Math.abs(to - from);
    const duration = Math.min(
      MAX_DURATION_MS,
      Math.max(MIN_DURATION_MS, (distance / PX_PER_SECOND) * 1000),
    );

    const animation = track.animate(
      [
        { transform: `translateX(${from}px)` },
        { transform: `translateX(${to}px)` },
      ],
      {
        duration,
        iterations: Infinity,
        easing: "linear",
      },
    );

    const pause = () => animation.pause();
    const resume = () => animation.play();
    track.addEventListener("mouseenter", pause);
    track.addEventListener("mouseleave", resume);
    track.addEventListener("focusin", pause);
    track.addEventListener("focusout", resume);

    return () => {
      track.removeEventListener("mouseenter", pause);
      track.removeEventListener("mouseleave", resume);
      track.removeEventListener("focusin", pause);
      track.removeEventListener("focusout", resume);
      animation.cancel();
    };
  }, [copyWidth, rtl, announcements.length]);

  if (announcements.length === 0) return null;

  return (
    <aside
      aria-label={t("ticker.announcements")}
      dir={rtl ? "rtl" : "ltr"}
      data-testid="announcement-ticker"
      className="group relative z-40 overflow-hidden border-b border-gold/25 bg-gold/5"
      // The clipping container is forced to LTR layout in BOTH languages.
      // In an RTL block context a `width: max-content` track is anchored to the
      // RIGHT edge, so translating it leftwards moves the whole track out of the
      // container and the ticker renders empty at the end of every cycle.
      // Text direction inside each item is restored on the item itself.
      style={{ direction: "ltr" }}
    >
      {/* Off-screen single copy used purely as the measurement reference. */}
      <div
        ref={measureRef}
        aria-hidden
        dir="ltr"
        className="pointer-events-none absolute top-0 left-0 flex -translate-y-[9999px] items-center whitespace-nowrap"
      >
        {announcements.map((a) => (
          <TickerItem key={`measure-${a.id}`} announcement={a} rtl={rtl} />
        ))}
      </div>

      <div
        ref={trackRef}
        className="flex w-max items-center py-1.5"
        dir="ltr"
        style={{
          ...(typeof window !== "undefined" &&
          window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
            ? { flexWrap: "wrap", width: "100%" }
            : {}),
        }}
        tabIndex={0}
        role="region"
      >
        {Array.from({ length: copyCount }).map((_, copyIndex) => (
          <div
            key={copyIndex}
            className="flex shrink-0 items-center"
            // Only the first copy is announced; the rest are decorative duplicates.
            aria-hidden={copyIndex > 0 || undefined}
          >
            {announcements.map((a) => (
              <TickerItem key={`${copyIndex}-${a.id}`} announcement={a} rtl={rtl} />
            ))}
          </div>
        ))}
      </div>
    </aside>
  );
}
