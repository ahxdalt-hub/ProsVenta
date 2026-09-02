"use client";

import { useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";

// ============================================================================
// SettingsSectionHighlighter — "jump to settings section" deep link
// ============================================================================
// Rendered (invisibly) on the Settings landing page. When the URL carries a
// `?section=<sectionId>` query param (e.g. # a button elsewhere in the app
// that says "Configure ICP" → /dashboard/settings?section=icp) this component:
//
//   1. scrolls the matching settings card into view (centered, smooth), and
//   2. flashes a glowing border around that card twice, then settles.
//
// The glow is a pure CSS animation (`.settings-card-glow`) so it is cheap,
// GPU-friendly and reduced-motion safe via globals.css' global rule that
// collapses animation durations when reduced motion is requested.
// ============================================================================

/** How long one glow blink lasts (the `.settings-card-glow` iteration). */
const BLINK_DURATION_MS = 750;
/** Number of blinks before the glow settles. */
const BLINK_COUNT = 2;
/** How many times to retry finding the card before giving up (~1s total). */
const MAX_RETRIES = 10;
const RETRY_DELAY_MS = 100;

export function SettingsSectionHighlighter() {
  const searchParams = useSearchParams();
  const section = searchParams.get("section");
  // Prevent re-applying the same highlight on every render while the query
  // param stays present (e.g. React re-renders from unrelated state changes).
  const lastAppliedRef = useRef<string | null>(null);

  useEffect(() => {
    if (!section) return;
    if (lastAppliedRef.current === section) return;
    lastAppliedRef.current = section;

    let cancelled = false;
    let retries = 0;
    let glowTimer: ReturnType<typeof setTimeout> | undefined;

    const findCard = (): HTMLElement | null => {
      try {
        return document.querySelector<HTMLElement>(
          `[data-settings-card="${CSS.escape(section)}"]`
        );
      } catch {
        return null;
      }
    };

    const apply = () => {
      if (cancelled) return;
      const el = findCard();
      if (!el) {
        if (retries < MAX_RETRIES) {
          retries += 1;
          // The landing uses a transition; retry briefly so the card exists.
          window.setTimeout(apply, RETRY_DELAY_MS);
        }
        return;
      }

      el.scrollIntoView({ behavior: "smooth", block: "center" });

      // Reset then force a reflow so the animation restarts cleanly even if
      // the class survived a previous run.
      el.classList.remove("settings-card-glow");
      void el.offsetWidth;
      el.classList.add("settings-card-glow");

      glowTimer = setTimeout(() => {
        el.classList.remove("settings-card-glow");
      }, BLINK_DURATION_MS * BLINK_COUNT + 120);
    };

    // Wait one frame so the landing transition has settled position.
    const raf = requestAnimationFrame(apply);

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      if (glowTimer) clearTimeout(glowTimer);
      lastAppliedRef.current = null;
    };
  }, [section]);

  return null;
}