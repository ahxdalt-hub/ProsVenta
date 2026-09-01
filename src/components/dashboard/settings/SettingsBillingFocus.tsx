"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

// ============================================================================
// SettingsBillingFocus — deep-link focus behavior for /dashboard/settings
// ============================================================================
// Consumes the "?focus=billing" instruction emitted by the topbar Credits
// popover: smooth-scrolls the Billing section into view, then highlights its
// border EXACTLY TWO times before returning fully to normal. The query param
// is stripped immediately after handling, so refreshing the page never
// re-triggers the animation. Respects prefers-reduced-motion with a single
// static emphasis instead of pulsing.
// ============================================================================

const PULSE_MS = 2100; // must cover the full two-cycle keyframe animation
const STATIC_MS = 3000;

export function SettingsBillingFocus() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const handled = useRef(false);

  useEffect(() => {
    if (handled.current) return;
    if (searchParams.get("focus") !== "billing") return;
    handled.current = true;

    const target = document.querySelector<HTMLElement>(
      '[data-settings-section="billing"]'
    );

    // Strip the instruction FIRST so a refresh can never re-trigger it.
    router.replace(pathname, { scroll: false });

    if (!target) return;

    const reduce = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    const timers: ReturnType<typeof setTimeout>[] = [];

    // Let the URL replace land, then bring Billing in with breathing room.
    requestAnimationFrame(() => {
      target.scrollIntoView({
        behavior: reduce ? "auto" : "smooth",
        block: "start",
      });
    });

    timers.push(
      setTimeout(
        () => {
          if (reduce) {
            target.classList.add("billing-focus-static");
            timers.push(
              setTimeout(() => {
                target.classList.remove("billing-focus-static");
              }, STATIC_MS)
            );
            return;
          }
          target.classList.add("billing-focus-pulse");
          timers.push(
            setTimeout(() => {
              target.classList.remove("billing-focus-pulse");
            }, PULSE_MS)
          );
        },
        reduce ? 150 : 700
      )
    );

    return () => {
      timers.forEach(clearTimeout);
      target.classList.remove("billing-focus-pulse", "billing-focus-static");
    };
  }, [searchParams, pathname, router]);

  return null;
}