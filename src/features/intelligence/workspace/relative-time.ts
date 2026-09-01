// ============================================================================
// Prosventa Intelligence Workspace — Relative Time Formatting
// ============================================================================
// Pure formatting helper. Rendered ONCE on the server per request (the page is
// dynamic), so the resulting strings are hydration-stable.
// ============================================================================

export function formatRelativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const diffMinutes = Math.max(0, Math.round((Date.now() - then) / 60_000));

  if (diffMinutes < 1) return "Just now";
  if (diffMinutes < 60) return `${diffMinutes} min ago`;

  const hours = Math.round(diffMinutes / 60);
  if (hours < 24) return `${hours} hr ago`;

  const days = Math.round(hours / 24);
  if (days < 7) return days === 1 ? "1 day ago" : `${days} days ago`;

  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}
