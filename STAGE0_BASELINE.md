# Prosventa — Stage 0 / Phase 0.3 Baseline

Product Freeze baseline established 2026-08-21. Inspection-first; no architectural changes made.

---

## Working

- **Authentication** — email/password signup, login, forgot/reset password, signout. Supabase SSR via `src/lib/supabase/{client,server,middleware}.ts` + `src/middleware.ts` route guards (`/dashboard`, `/onboarding` protected; auth pages redirect authed users).
- **Onboarding** — `src/app/(onboarding)/onboarding/` flow; `ensureOrganization()` creates org + owner membership for pre-workspace users.
- **Dashboard** — `/dashboard` home (Welcome, QuickActions, Overview, Activity, GettingStarted).
- **Prospects** — create, view, edit, delete, search, filter, pagination, notes, saved-list membership, detail panel. Data layer: `src/lib/db/prospects.ts`; UI: `src/features/prospects/components/`.
- **Saved Lists** — CRUD + list items. Data layer: `src/lib/db/lists.ts`.
- **Organization page** — profile, members, roles, invites, leave/delete. Data layer: `src/lib/db/organizations.ts` + `src/lib/db/collaboration.ts`; actions: `src/features/organization/actions/organization.ts`.
- **Settings** — profile, appearance, notifications, accessibility, workspace, ICP, security, billing (UI only), integrations (UI only). Data layer: `src/lib/db/settings.ts`, `src/lib/db/user-settings.ts`.
- **Import/Export** — CSV/Excel parse + validate + column map + preview; export CSV/Excel/PDF. Persistence: `import_history`/`export_history` via `src/lib/db/io.ts`. **Prospect persistence from import is NOT yet wired** (see Fake/Simulated).
- **Intelligence** — ICP scoring, company/prospect enrichment, company/prospect research, signals, recommendations, workflows. Canonical server boundary: `src/features/intelligence/service.ts`; providers registry with mock provider.
- **Hidden-but-functional routes** (not in launch nav): `/dashboard/analytics`, `/dashboard/automation`, `/dashboard/export`, `/dashboard/notifications`, `/dashboard/team`.
- **API routes** — `POST /api/prospects/process` and `POST /api/prospects/search` both enforce auth + org membership.

## Broken

- **Lint**: 63 problems (19 errors, 44 warnings). Errors are `react/no-unescaped-entities`, `@typescript-eslint/no-explicit-any`, `prefer-const`. Not fixed in this phase (Stage 2 will stabilize).
- **TypeScript**: `npx tsc --noEmit` passes clean (no output).
- No known functional regressions from Phase 0.2 were found.

## Security

- **CRITICAL — anonymous-executable SECURITY DEFINER functions** (Supabase advisor `anon_security_definer_function_executable`): `create_notification`, `create_reminder`, `create_task`, `record_activity`, `record_workflow_execution`, `record_workflow_action_execution`, `update_workflow_stats`, `get_profile_avatar_url`, `is_org_admin`, `is_org_member`, `handle_new_user`, `update_updated_at_column`. These accept org/user IDs as parameters and are callable via `/rest/v1/rpc/*` without authentication. **Recommend revoking `EXECUTE` from `anon` (and `authenticated` where not needed) in Stage 1.**
- **WARN — mutable search_path** on `record_activity`, `create_notification`, `record_workflow_execution`, `update_workflow_stats`, `create_reminder`, `record_workflow_action_execution`, `create_task`.
- **WARN — leaked-password protection disabled** in Supabase Auth.
- **Server actions trust RLS** for org-scoped writes (`updateOrganization`, `updateMemberRole`, `removeMember`, prospect update/delete). Actions do verify actor role/membership before calling, but the underlying `lib/db` functions do not re-verify org ownership — they rely on RLS. Acceptable today; flag for defense-in-depth in Stage 1.
- **No service-role key usage** found in `src/`. Only `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY` are used (safe for client exposure).
- **Middleware skips auth when Supabase env vars are unset** — dev-only convenience; ensure env is always set in prod.

## Fake / Simulated

- **Import → prospect persistence**: parser/validation/mapping/preview work, but imported rows are NOT persisted to `prospects`. `import_history` is written; the pipeline stops there.
- **Prospect discovery** (`/api/prospects/search`): creates a `prospect_searches` row with status `pending`; no provider connected, no results processed.
- **Intelligence providers**: `src/features/intelligence/providers/mock.ts` is the only provider; enrichment/research/signals return simulated data.
- **AI Assistant** (`src/features/assistant/`), **Automation engine** (`src/features/automation/`), **Workflows** (`src/features/intelligence/workflows/`): engines exist but are not connected to external services or live triggers.
- **Billing/Integrations settings sections**: UI only, no Stripe/integration backend.
- **Explore page** (`/explore`): branded "in progress" placeholder (`ExploreInProgress.tsx`); `ExplorePageLegacy.tsx` is the archived original.

## Deferred (excluded from launch)

- CSV/import persistence to prospects
- Enrichment provider connection
- LLM research execution
- Command Center rebuild
- Prospects redesign
- Stripe / enterprise billing
- Discovery engine
- Automation / workflows live execution
- AI Assistant
- Integrations
- New navigation items

## High-risk files (modify carefully)

- `src/lib/db/organizations.ts` — org/member writes rely on RLS; used by org page + actions.
- `src/lib/db/prospects.ts` — central prospect data access; `queryProspects` has complex filter builder with `any` casts.
- `src/features/intelligence/service.ts` — canonical intelligence boundary; org derived from session (good).
- `src/features/organization/actions/organization.ts` — role hierarchy guards; owner protection.
- `src/app/api/prospects/process/route.ts` + `search/route.ts` — auth + org checks present; future pipeline entry points.
- `src/middleware.ts` + `src/lib/supabase/middleware.ts` — route protection; env-gated.
- `src/components/dashboard/navigation/config.ts` — canonical nav; feature-gated items.
- `src/features/entitlement/features.ts` — feature/plan definitions; drives nav gating.

## Launch-critical files (next stages)

- `src/lib/db/prospects.ts` — prospect persistence for import pipeline.
- `src/features/io/import/parser.ts` + `src/features/io/components/ImportClient.tsx` — import UI/parse; needs persistence wiring.
- `src/features/prospects/services/prospect-processor.ts` — normalize→validate→map pipeline (already used by API).
- `src/lib/db/io.ts` — import/export history persistence.
- `src/features/intelligence/service.ts` + `src/features/intelligence/providers/registry.ts` — provider connection point.
- `src/lib/db/intelligence.ts` — intelligence job/record persistence.
- `src/features/entitlement/` — feature gating for nav + upgrade UX.

## Duplicates / Legacy

- `src/comp` and `src/compo` — orphaned stray files (DashboardShell + PageTransitionOverlay copies). Zero imports. Safe to delete after confirmation.
- `archive/dashboard-v1/` — contains only a README; empty shell.
- `src/components/marketing/explore/ExplorePageLegacy.tsx` — legacy explore page, superseded by `ExploreInProgress.tsx` (route uses InProgress).
- `src/components/dashboard/layout/sidebar-nav.tsx` — NOT a duplicate; imports canonical `navigation/config.ts`.
- `src/components/marketing/routes.ts` — marketing route constants only; not a nav system.
- No duplicate DB helper functions found across `src/lib/db/`.

## Build Health

- `npx tsc --noEmit` — **passes** (no output).
- `npm run lint` — **fails**: 19 errors / 44 warnings (see Broken).
- Scripts: `dev`, `build`, `start`, `lint`. No test script configured (test files exist: `foundation.test.ts`, `engine.test.ts`, `company-enrichment.test.ts`).
- Env required: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (see `.env.local.example`).
- Supabase project: `fqznwnoesagaxrbyxdxx` (ProsVenta, ap-southeast-1). All 30+ public tables have RLS enabled.

## Data Flow (current)

```
User → Auth (Supabase SSR) → Organization (organization_members) → Prospects (RLS org-scoped)
  → Scoring/Intelligence (service.ts, org from session) → Dashboard (aggregates)
Import: File → parser.ts (validate/sanitize) → ColumnMapper → Preview → import_history
  → [prospect persistence NOT wired — Stage 1]