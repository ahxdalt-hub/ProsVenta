import { cn } from "@/lib/utils";

// ============================================================================
// Prosventa Credit Token ("prosventa-credit")
// Stage 8 — Phase 1: Prosventa Credits Architecture
// ============================================================================
// The custom visual identity for Prosventa Credits. NOT a generic currency
// emoji: a rounded soft-diamond token silhouette with a stylized "P" and a
// subtle orbital accent in Prosventa's light-blue language.
//
// Designed to stay legible at 16 / 20 / 24 / 32 px. Transparent-friendly
// (current-color strokes; the accent fill uses brand blue at low opacity).
// No dollar symbol, no crypto aesthetic, no neon, no heavy glow.
// ============================================================================

export const CREDIT_TOKEN_ID = "prosventa-credit";

interface CreditTokenProps {
  /** 16 | 20 | 24 | 32 | 48 are the supported display sizes. */
  size?: 16 | 20 | 24 | 32 | 48;
  className?: string;
  /** Accessible label; defaults to no label (decorative). */
  title?: string;
}

export function CreditToken({ size = 20, className, title }: CreditTokenProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
      className={cn("shrink-0", className)}
    >
      {title ? <title>{title}</title> : null}
      {/* Subtle orbital accent — behind the token body */}
      <ellipse
        cx="13.2"
        cy="11"
        rx="9.6"
        ry="4.4"
        transform="rotate(-24 13.2 11)"
        stroke="currentColor"
        strokeOpacity="0.28"
        strokeWidth="1.1"
      />
      {/* Rounded soft-diamond token silhouette */}
      <rect
        x="3.6"
        y="3.6"
        width="16.8"
        height="16.8"
        rx="5.4"
        transform="rotate(45 12 12)"
        fill="currentColor"
        fillOpacity="0.12"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      {/* Stylized Prosventa P */}
      <path
        d="M10 17V7h3.4a3.05 3.05 0 0 1 0 6.1H10"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
