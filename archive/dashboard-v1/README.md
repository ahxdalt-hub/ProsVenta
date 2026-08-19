# Dashboard V1 (Archived)

This directory is reserved for the archived Dashboard V1 presentation layer.

## Status

The Dashboard V1 UI has been fully removed from the active source tree under `src/` in
preparation for Dashboard V2.

The V1 files were untracked in git and were removed during the archive operation (the
untracked source was not recoverable from version control). The backend, authentication,
Supabase integration, server actions, API routes, database code, organization system,
RLS policies, middleware, types, and business logic remain fully intact.

## What was removed (V1 presentation only)

- `src/app/(dashboard)/` — all V1 dashboard routes, layout, shell, page/loading/error/not-found
- `src/components/dashboard/` — Sidebar, Topbar, UserMenu, DashboardReveal, DashboardCard
- `src/components/prospects/` — ProspectTable, PageHeader, StatsCard, ProspectCard, SearchBar, FilterBar (V1-only view components)
- `src/components/ui/Breadcrumbs.tsx`, `src/components/ui/Motion.tsx` — V1-only UI primitives
- `src/hooks/use-active-section.ts`, `src/hooks/use-scroll.ts` — unused V1 hooks
- V1-only CSS classes in `src/app/globals.css` (premium-sidebar, premium-topbar, premium-nav-item, premium-search, premium-icon-btn, premium-badge, premium-dropdown, nav-active-glow, notification-dot, topbar-shadow)

## Preserved (shared / business logic)

- All shared UI primitives: `Button`, `Input`, `Card`, `Alert`, `Badge`, `Skeleton`, `Spinner`, `EmptyState`
- All marketing, auth, and onboarding components
- All prospect feature business logic and its UI components under `src/features/prospects/`
- Entire backend: `src/lib/`, `src/app/api/`, `src/app/auth/`, `src/middleware.ts`, `supabase/`

## Next Steps

Rebuild the dashboard from scratch under:

```
app/(dashboard)/dashboard/
components/dashboard/