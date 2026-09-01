"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { DefaultAvatar } from "@/components/dashboard/settings/DefaultAvatar";

// ============================================================================
// Avatar - single reusable identity avatar
// ============================================================================
// One component for every place Prosventa shows a person's avatar:
// - renders the signed image when an avatarUrl is available
// - falls back to initials derived from the display name otherwise
// - falls back to initials if the image fails to load (no broken-image icon)
// - keeps the existing neutral DefaultAvatar silhouette when no name exists
//
// Client component only because of the onError recovery; it still renders
// identically on the server (initials/image markup), so hydration is safe.
// ============================================================================

export type AvatarSize = "xs" | "sm" | "md" | "lg" | "xl";

const SIZE_CLASSES: Record<AvatarSize, { box: string; text: string }> = {
  xs: { box: "h-6 w-6", text: "text-[9px]" },
  sm: { box: "h-7 w-7", text: "text-[10px]" },
  md: { box: "h-9 w-9", text: "text-[11px]" },
  lg: { box: "h-10 w-10", text: "text-xs" },
  xl: { box: "h-12 w-12", text: "text-sm" },
};

/**
 * Derives up-to-two-letter initials from a display name.
 * Mirrors the existing getInitials helpers ("Ada Lovelace" -> "AL").
 */
function getInitials(name: string | null | undefined): string {
  if (!name) return "?";
  const trimmed = name.trim();
  if (!trimmed) return "?";
  const words = trimmed.split(/\s+/);
  if (words.length >= 2 && words[0][0] && words[1][0]) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  return trimmed.slice(0, 2).toUpperCase();
}

interface AvatarProps {
  /** Signed, directly loadable URL — omit/null shows initials. */
  src?: string | null;
  /** Display name used for fallback initials. Falls back to "?" then silhouette. */
  name?: string | null;
  size?: AvatarSize;
  /**
   * Accessible label. Pass undefined when the avatar is purely decorative
   * (e.g. the user's name is rendered right next to it).
   */
  alt?: string;
  className?: string;
}

export function Avatar({ src, name, size = "md", alt, className }: AvatarProps) {
  const [failed, setFailed] = useState(false);

  // Reset recovery state when the URL changes (upload/replace/remove).
  useEffect(() => {
    setFailed(false);
  }, [src]);

  const showImage = Boolean(src) && !failed;
  const hasName = Boolean(name && name.trim());
  const { box, text } = SIZE_CLASSES[size];

  return (
    <div
      role={alt ? "img" : undefined}
      aria-label={alt}
      aria-hidden={alt ? undefined : true}
      title={hasName ? (name ?? undefined) : undefined}
      className={cn(
        "relative flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-slate-200 to-slate-300",
        box,
        className
      )}
    >
      {showImage ? (
        // eslint-disable-next-line @next/next/no-img-element -- signed Storage URLs, dynamic per-user
        <img
          src={src as string}
          alt=""
          aria-hidden="true"
          loading="lazy"
          decoding="async"
          className="h-full w-full object-cover"
          onError={() => setFailed(true)}
        />
      ) : hasName ? (
        <span className={cn("select-none font-semibold text-slate-600", text)}>
          {getInitials(name)}
        </span>
      ) : (
        <DefaultAvatar size="md" className="absolute inset-0 h-full w-full rounded-full" />
      )}
    </div>
  );
}