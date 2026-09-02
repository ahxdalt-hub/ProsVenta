/**
 * Route-specific status text shown during navigation.
 * Keeps the loading experience calm and contextual.
 */

export const ROUTE_STATUS_TEXT: Record<string, string> = {
  "/dashboard": "Preparing workspace...",
  "/dashboard/intelligence": "Gathering intelligence...",
  "/dashboard/prospects": "Loading prospects...",
  "/dashboard/find-leads": "Preparing lead search...",
  "/dashboard/saved-lists": "Opening saved lists...",
  "/dashboard/import": "Opening import...",
  "/dashboard/export": "Opening export...",
  "/dashboard/analytics": "Opening analytics...",
  "/dashboard/automation": "Opening automation...",
  "/dashboard/notifications": "Opening notifications...",
  "/dashboard/organization": "Updating organization...",
  "/dashboard/settings": "Updating settings...",
  "/dashboard/help": "Opening help...",
};

export function getRouteStatusText(href: string): string {
  // Exact match first
  if (ROUTE_STATUS_TEXT[href]) return ROUTE_STATUS_TEXT[href];

  // Prefix match for nested routes
  const prefix = Object.keys(ROUTE_STATUS_TEXT)
    .filter((key) => key !== "/dashboard")
    .sort((a, b) => b.length - a.length)
    .find((key) => href.startsWith(`${key}/`));

  if (prefix) return ROUTE_STATUS_TEXT[prefix];

  return "Preparing workspace...";
}