/**
 * Context-aware loading messages keyed by route.
 * Each route shows only appropriate messages.
 */
export const LOADING_MESSAGES: Record<string, string[]> = {
  "/dashboard": ["Preparing your workspace...", "Loading your dashboard...", "Almost ready..."],
  "/dashboard/prospects": ["Loading your dashboard...", "Opening prospects...", "Almost ready..."],
  "/dashboard/saved-lists": ["Loading your dashboard...", "Opening saved lists...", "Almost ready..."],
  "/dashboard/analytics": ["Loading your dashboard...", "Opening analytics...", "Almost ready..."],
  "/dashboard/organization": ["Loading your dashboard...", "Loading organization...", "Almost ready..."],
  "/dashboard/organization/members": ["Loading your dashboard...", "Loading members...", "Almost ready..."],
  "/dashboard/settings": ["Loading your dashboard...", "Loading settings...", "Almost ready..."],
  "/dashboard/help": ["Loading your dashboard...", "Opening help...", "Almost ready..."],
};

/**
 * Messages shown by the AuthLoadingOverlay when an unauthenticated user
 * navigates to an authentication page (signup / login / forgot-password).
 * These are distinct from the dashboard loading messages.
 */
export const AUTH_NAV_MESSAGES: string[] = [
  "Preparing your workspace...",
  "Creating your secure session...",
  "Almost there...",
  "Taking you to account setup...",
];

/**
 * Messages shown by the dashboard LoadingOverlay during the
 * authenticated auth-success → dashboard transition.
 */
export const AUTH_MESSAGES = [
  "Preparing your workspace...",
  "Loading your dashboard...",
  "Almost ready...",
];

/**
 * Routes that should use the AuthLoadingOverlay (for unauthenticated users).
 * Never used for dashboard routes.
 */
const AUTH_ROUTES = ["/signup", "/login", "/forgot-password"];

export function isAuthRoute(href: string): boolean {
  return AUTH_ROUTES.includes(href);
}

export function getLoadingMessages(href: string): string[] {
  // Exact match first
  if (LOADING_MESSAGES[href]) return LOADING_MESSAGES[href];

  // Prefix match for nested routes
  const prefix = Object.keys(LOADING_MESSAGES)
    .filter((key) => key !== "/dashboard")
    .sort((a, b) => b.length - a.length)
    .find((key) => href.startsWith(`${key}/`));

  if (prefix) return LOADING_MESSAGES[prefix];

  return LOADING_MESSAGES["/dashboard"];
}
