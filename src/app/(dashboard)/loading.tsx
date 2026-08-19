// The dashboard no longer uses a separate loading page.
// Loading is handled by the fullscreen LoadingOverlay rendered at the root,
// which covers the viewport while the dashboard renders beneath it.
// This file exists as an empty placeholder (no loading UI) to avoid
// any separate loading screen being displayed during route transitions.
export default function DashboardLoading() {
  return null;
}