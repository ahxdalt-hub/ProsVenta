import { cn } from "@/lib/utils";

/**
 * Shared Warped Orbit glyph path data — the single source of truth for the
 * Prosventa brand mark. Reused by BrandOrigin's decorative echo so the brand
 * shape never drifts between implementations.
 */
export const BRAND_ORBIT_PATHS = [
  "M9.2 17.6C6.4 15.4 5 12.2 5.6 9.2C6.2 6.1 8.8 4.2 11.9 3.9C15.2 3.6 18 5.6 18.9 8.7C19.7 11.4 19.1 14.7 16.9 16.9C16.1 17.7 14.9 18.3 13.8 18.4",
  "M9.4 8.8C11 10.8 11.4 13.6 10.2 15.6",
  "M3.8 12.4C5.2 13.3 7.4 13.6 9.2 12.8",
  "M20.4 14.6C20.2 16.2 19.4 17.6 18.8 18.6",
] as const;

interface BrandIconProps {
  className?: string;
  size?: number;
  strokeWidth?: number;
}

/**
 * Prosventa brand icon — "The Warped Orbit" glyph.
 *
 * An abstract orbit in five separable pieces:
 *   1. A sweeping orbit ring, open at the bottom-left, with an inward hook curl.
 *   2. An inner opposing crescent nesting against the ring's left wall.
 *   3. A small tick that crosses through the ring from outside to inside.
 *   4. A comet dash trailing off the lower-right for subtle asymmetry.
 *   5. A floating satellite dot above the top-right.
 *
 * The negative gaps between pieces are intentional — the "prospect"
 * where a venture lands. Each piece is independently animatable:
 * draw the ring → fade in the crescent → flick the tick across →
 * sweep the comet dash → pop the dot → settle.
 *
 * This is the raw SVG icon without any container.
 * Defaults to white strokes (matches the navy brand tile); pass a
 * className like "text-blue-400" for a monochrome recolor.
 */
export function BrandIcon({ className, size = 18, strokeWidth = 2 }: BrandIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("text-white", className)}
      aria-hidden="true"
    >
      {/* Piece 1 — orbit ring with inward bottom hook */}
      <path
        d={BRAND_ORBIT_PATHS[0]}
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Piece 2 — inner opposing crescent */}
      <path
        d={BRAND_ORBIT_PATHS[1]}
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Piece 3 — crossing tick (the surprise hook) */}
      <path
        d={BRAND_ORBIT_PATHS[2]}
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Piece 4 — comet dash trailing lower-right */}
      <path
        d={BRAND_ORBIT_PATHS[3]}
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Piece 5 — floating satellite dot */}
      <circle cx="16.2" cy="3" r="1.05" fill="currentColor" />
    </svg>
  );
}