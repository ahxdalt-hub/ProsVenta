import { cn } from "@/lib/utils";

interface DefaultAvatarProps {
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

const SIZES = {
  sm: "w-8 h-8",
  md: "w-12 h-12",
  lg: "w-20 h-20",
  xl: "w-28 h-28",
};

/**
 * Professional default avatar — clean neutral silhouette.
 * No initials, no random colors, no social-media style.
 * Used when a user has not uploaded a profile image.
 */
export function DefaultAvatar({ size = "lg", className = "" }: DefaultAvatarProps) {
  return (
    <div
      className={cn(
        "relative flex items-center justify-center rounded-full bg-gradient-to-b from-slate-100 to-slate-200 ring-1 ring-slate-200/80 overflow-hidden",
        SIZES[size],
        className
      )}
      aria-hidden="true"
    >
      {/* Neutral silhouette */}
      <svg
        viewBox="0 0 24 24"
        fill="none"
        className="w-[55%] h-[55%] text-slate-400"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    </div>
  );
}