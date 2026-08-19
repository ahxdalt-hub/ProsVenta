export const APP_NAME = "Prosventa";
export const APP_DESCRIPTION = "Modern prospect discovery for growing businesses.";

export const NAV_LINKS = [
  { label: "Features", href: "#features" },
  { label: "Pricing", href: "#pricing" },
  { label: "About", href: "#about" },
] as const;

export const ROUTES = {
  HOME: "/",
  LOGIN: "/login",
  SIGNUP: "/signup",
  DASHBOARD: "/dashboard",
  DASHBOARD_PROSPECTS: "/dashboard/prospects",
  DASHBOARD_PROSPECTS_NEW: "/dashboard/prospects/new",
  DASHBOARD_SAVED_LISTS: "/dashboard/saved-lists",
  DASHBOARD_ANALYTICS: "/dashboard/analytics",
  DASHBOARD_SETTINGS: "/dashboard/settings",
  DASHBOARD_HELP: "/dashboard/help",
} as const;
