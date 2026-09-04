import { Fragment } from "react";

import type { LegalSectionData } from "@/components/marketing/legal/LegalPage";
import LegalPage, {
  LegalCallout,
  LegalH3,
  LegalLink,
  LegalList,
  LegalP,
  RelatedLink,
} from "@/components/marketing/legal/LegalPage";
import {
  ArchitectureFlow,
  IsolationLayers,
  SecurityCardGrid,
  SecurityNote,
  TrustChips,
} from "@/components/marketing/legal/SecurityVisuals";

// ============================================================================
// Security — /security
// ============================================================================
// Full page rebuild (Phase 3 of the legal/trust redesign). Content + UI only:
// no application logic, auth, database, billing, or RLS changes.
//
// Every security statement below is grounded in the existing Prosventa
// implementation:
//   - Supabase Auth email/password sign-in + server-managed session cookies
//     (src/lib/actions/auth.ts, src/lib/supabase/*)
//   - Route guards for /dashboard + /onboarding (src/proxy.ts → middleware)
//   - Organization membership model + RLS org isolation across workspace
//     tables (supabase/migrations/*)
//   - Role hierarchy (owner/admin/member) enforced server-side
//   - server-only modules guarding privileged code (credits, payments,
//     plans, enrichment, admin client)
//   - Service-role credential confined to server-side webhook processing
//     (src/lib/supabase/admin.ts)
//   - Stripe hosted checkout; card data never stored by Prosventa
//     (src/features/payments/provider/stripe.ts)
//   - Webhook HMAC signature verification + replay tolerance + event
//     idempotency + transactional credit grant (payments service + tests)
//   - Credit ledger: append-only, idempotency keys, SECURITY DEFINER RPCs,
//     no client write policies (credits migrations + CreditService)
//   - Server-side import validation + plan-limit enforcement
//     (src/features/io/actions.ts)
// Claims deliberately EXCLUDED (not implemented/verified): SOC 2 / ISO 27001
// / GDPR / HIPAA / PCI certifications, penetration tests, MFA / SSO /
// passwordless auth, malware scanning of imports, security-header claims,
// formal incident-response program, uptime/threat metrics, trust badges.
// ============================================================================

export const metadata = {
  title: "Security — Prosventa",
  description:
    "How Prosventa protects your data, controls access, and operates its infrastructure.",
};

const UPDATED = "September 4, 2026";

const sections: LegalSectionData[] = [
  /* ------------------------------ 01 Overview ----------------------------- */
  {
    id: "overview",
    number: "01",
    title: "Overview",
    tocLabel: "Overview",
    content: (
      <>
        <LegalP>
          Security is part of how Prosventa earns the trust required to hold
          your commercial data. This page explains how Prosventa protects
          customer data, how access decisions are made, and how the
          platform&apos;s infrastructure operates. It describes the controls
          that are implemented today — not aspirational ones.
        </LegalP>
        <LegalP>
          Prosventa runs on three building blocks: a managed PostgreSQL
          database, authentication, and storage platform operated by Supabase;
          a Next.js server application; and Stripe for payment processing.
          Workspace data is scoped to your organization and enforced at the
          database layer, and sensitive operations run server-side, where
          credentials and privileged code stay out of the browser.
        </LegalP>
        <LegalH3>How access flows through Prosventa</LegalH3>
        <ArchitectureFlow
          stages={[
            {
              icon: "user",
              title: "You",
              children:
                "Sign in to Prosventa with your email address and password.",
            },
            {
              icon: "lock",
              title: "Authentication",
              children:
                "Supabase Auth verifies your credentials and issues a session that the application validates on every request.",
            },
            {
              icon: "building",
              title: "Organization membership",
              children:
                "Your account is linked to a workspace through a membership record stored in the database.",
            },
            {
              icon: "user-check",
              title: "Authorization",
              children:
                "Server-side checks confirm your membership and role before privileged operations run.",
            },
            {
              icon: "database",
              title: "Database security",
              children:
                "PostgreSQL Row Level Security scopes every query to your organization's rows.",
            },
            {
              icon: "server",
              title: "Prosventa application",
              children:
                "Server-only services handle imports, enrichment, intelligence, and billing.",
            },
            {
              icon: "globe",
              title: "External services",
              children:
                "Stripe processes payments; configured providers are called from the server, with credentials that stay there.",
            },
          ]}
        />
        <LegalH3>At a glance</LegalH3>
        <SecurityCardGrid
          items={[
            {
              icon: "layers",
              title: "Data isolation",
              children:
                "Workspace data is scoped to your organization and enforced by database policies, not just the interface.",
            },
            {
              icon: "key",
              title: "Protected credentials",
              children:
                "Payment, webhook, and provider credentials are server-only and are never shipped to the browser.",
            },
            {
              icon: "database",
              title: "Database controls",
              children:
                "Row Level Security evaluates organization membership on every query.",
            },
            {
              icon: "credit-card",
              title: "Secure billing",
              children:
                "Credit and billing operations are validated and executed server-side, with an append-only transaction ledger.",
            },
            {
              icon: "shield",
              title: "Controlled access",
              children:
                "Signed-in identity, verified membership, and role checks gate every privileged operation.",
            },
            {
              icon: "eye",
              title: "Transparency",
              children:
                "This page describes what is implemented — and what is not.",
            },
          ]}
        />
      </>
    ),
  },

  /* --------------------------- 02 Data isolation -------------------------- */
  {
    id: "data-isolation",
    number: "02",
    title: "Data isolation",
    tocLabel: "Data isolation",
    content: (
      <>
        <LegalP>
          Every Prosventa account is a member of an organization — the shared
          workspace where your team&apos;s prospect records, intelligence,
          imports, credit balance, and purchase history live. Each of those
          records carries your organization&apos;s identity, and that identity
          is the boundary access is evaluated against.
        </LegalP>
        <LegalP>
          Prosventa is designed so that access to organization data is
          evaluated at the database authorization layer rather than relying
          only on the frontend to hide information. Row Level Security
          policies check the authenticated user&apos;s membership on every
          query, so a request for another organization&apos;s records is
          denied by the database itself — whether it comes from the
          application or from a hand-crafted request.
        </LegalP>
        <IsolationLayers
          items={[
            {
              title: "Identity",
              meta: "Authenticated session",
              children:
                "You sign in with an email address and password; the authentication platform verifies your credentials and issues a session the server validates.",
            },
            {
              title: "Organization membership",
              meta: "Verified in the database",
              children:
                "Every account is linked to a workspace through a membership record stored in the database — not a claim kept in the browser.",
            },
            {
              title: "Authorization",
              meta: "Role-based checks",
              children:
                "Owner, admin, and member roles are verified server-side before privileged operations run.",
            },
            {
              title: "Database policies",
              meta: "Row Level Security",
              children:
                "PostgreSQL policies scope every query to the rows that belong to your organization.",
            },
          ]}
        />
        <LegalH3>What this means in practice</LegalH3>
        <LegalList
          items={[
            <Fragment key="item-1">
              A member of one organization cannot read, create, modify, or
              delete another organization&apos;s prospects, intelligence, or
              workspace records.
            </Fragment>,
            <Fragment key="item-2">
              Scoping applies to reads and writes alike — writing data into
              another workspace is rejected by the same policies that hide it.
            </Fragment>,
            <Fragment key="item-3">
              Within your workspace, roles decide what members can change —
              see Authorization below.
            </Fragment>,
            <Fragment key="item-4">
              Workspace administrators control their workspace — its members,
              settings, and data.
            </Fragment>,
          ]}
        />
      </>
    ),
  },

  /* --------------------------- 03 Authentication -------------------------- */
  {
    id: "authentication",
    number: "03",
    title: "Authentication",
    tocLabel: "Authentication",
    content: (
      <>
        <LegalP>
          Prosventa uses account authentication provided by Supabase Auth. You
          sign in with an email address and password; credentials are verified
          by the authentication platform, and the resulting session is kept in
          cookies managed by the server application — the browser never
          handles raw credentials.
        </LegalP>
        <LegalH3>How sessions and routes are protected</LegalH3>
        <LegalList
          items={[
            <Fragment key="item-1">
              Application routes that expose workspace data — the dashboard
              and onboarding — require a valid session; unauthenticated visits
              are redirected to sign in.
            </Fragment>,
            <Fragment key="item-2">
              Sessions are re-validated on the server for every request, not
              trusted from the browser alone.
            </Fragment>,
            <Fragment key="item-3">
              Signed-in users who open the sign-in or sign-up pages are
              redirected to their workspace.
            </Fragment>,
            <Fragment key="item-4">
              Sign-up enforces a minimum password length, and password resets
              are handled through emailed links so reset tokens do not pass
              through application forms.
            </Fragment>,
          ]}
        />
        <LegalCallout title="Authentication methods today">
          Prosventa currently supports email and password sign-in.
          Multi-factor authentication (MFA), single sign-on (SSO), and
          passwordless sign-in are not offered yet. We describe authentication
          methods on this page only when they are implemented.
        </LegalCallout>
      </>
    ),
  },

  /* --------------------------- 04 Authorization --------------------------- */
  {
    id: "authorization",
    number: "04",
    title: "Authorization",
    tocLabel: "Authorization",
    content: (
      <>
        <LegalP>
          Authentication establishes who you are; authorization establishes
          what you can do. Access inside a workspace is organized around three
          roles: owner, admin, and member.
        </LegalP>
        <LegalList
          items={[
            <Fragment key="item-1">
              Organization settings and profile changes are restricted to the
              owner role.
            </Fragment>,
            <Fragment key="item-2">
              Member management — invitations, role changes, and removals — is
              restricted to administrative roles, and the role hierarchy
              prevents members from granting themselves higher access.
            </Fragment>,
            <Fragment key="item-3">
              Sensitive credit operations, such as administrative balance
              adjustments, are restricted to owner and admin roles.
            </Fragment>,
            <Fragment key="item-4">
              Before a privileged operation runs, server-side code re-checks
              your membership and role against the database — a role stated by
              the client is never trusted.
            </Fragment>,
          ]}
        />
        <LegalP>
          These application checks sit on top of the database&apos;s own
          policies. If an application-level check were ever bypassed, Row
          Level Security would still scope every row to your organization —
          the two layers are deliberately independent.
        </LegalP>
      </>
    ),
  },

  /* ------------------------- 05 Database security ------------------------- */
  {
    id: "database-security",
    number: "05",
    title: "Database security",
    tocLabel: "Database",
    content: (
      <>
        <LegalP>
          Prosventa&apos;s data lives in a managed PostgreSQL database operated
          by Supabase. Row Level Security is enabled on workspace tables, and
          access policies evaluate the authenticated identity and organization
          membership for every query.
        </LegalP>
        <LegalH3>How database access is structured</LegalH3>
        <LegalList
          items={[
            <Fragment key="item-1">
              <strong className="font-semibold text-slate-800">
                Organization-scoped policies
              </strong>{" "}
              — workspace data can only be read or changed by members of the
              organization the data belongs to.
            </Fragment>,
            <Fragment key="item-2">
              <strong className="font-semibold text-slate-800">
                Authenticated access
              </strong>{" "}
              — the application reaches the database with your verified
              session; anonymous access to workspace data is not granted.
            </Fragment>,
            <Fragment key="item-3">
              <strong className="font-semibold text-slate-800">
                Read-only financial visibility
              </strong>{" "}
              — credit balances, transactions, and purchase records are
              visible to organization members, but there is no client write
              path to them; balance changes happen only inside controlled
              server-side database functions.
            </Fragment>,
            <Fragment key="item-4">
              <strong className="font-semibold text-slate-800">
                Protected server records
              </strong>{" "}
              — records created by server-side processing, such as payment
              provider events, are not accessible to clients at all.
            </Fragment>,
            <Fragment key="item-5">
              <strong className="font-semibold text-slate-800">
                Append-only financial history
              </strong>{" "}
              — the credit ledger and subscription history are designed to be
              appended to, not rewritten.
            </Fragment>,
          ]}
        />
        <LegalH3>Privileged access</LegalH3>
        <LegalP>
          A separate, highly privileged database credential exists for
          operations that run outside a user session — currently, payment
          webhook processing. It is kept server-side, is not exposed to the
          browser, and is limited to narrowly scoped server operations that
          perform their own validation. Database credentials and
          infrastructure endpoints are never embedded in client code.
        </LegalP>
      </>
    ),
  },

  /* -------------------------- 06 Server security -------------------------- */
  {
    id: "server-security",
    number: "06",
    title: "Server security",
    tocLabel: "Server security",
    content: (
      <>
        <LegalP>
          Prosventa&apos;s codebase is deliberately split into a browser-facing
          tier and a server tier. The browser receives the interface and only
          publishable configuration — for example, the Supabase project URL
          and its public, browser-safe key that is designed for client use.
        </LegalP>
        <LegalH3>What stays on the server</LegalH3>
        <LegalList
          items={[
            <Fragment key="item-1">
              <strong className="font-semibold text-slate-800">
                Provider credentials
              </strong>{" "}
              — the payment secret, the webhook signing secret, and
              lead-provider API keys are server-only environment values and
              are never sent to the browser.
            </Fragment>,
            <Fragment key="item-2">
              <strong className="font-semibold text-slate-800">
                Privileged modules
              </strong>{" "}
              — sensitive operations such as billing, credits, and provider
              access live behind server-only module boundaries that the build
              excludes from client bundles.
            </Fragment>,
            <Fragment key="item-3">
              <strong className="font-semibold text-slate-800">
                Database access
              </strong>{" "}
              — workspace data operations run through server-side functions;
              the browser never queries the database with privileged
              credentials.
            </Fragment>,
            <Fragment key="item-4">
              <strong className="font-semibold text-slate-800">
                Webhook processing
              </strong>{" "}
              — payment events are received and processed entirely
              server-side.
            </Fragment>,
          ]}
        />
        <LegalP>
          Error handling follows the same discipline: failures are surfaced
          safely, logs avoid secrets, tokens, and credentials, and external
          provider outages degrade gracefully rather than corrupting state —
          if the payment provider is unavailable, for example, purchases are
          left unchanged rather than half-completed.
        </LegalP>
      </>
    ),
  },

  /* -------------------------- 07 External services ------------------------ */
  {
    id: "external-services",
    number: "07",
    title: "External services",
    tocLabel: "External services",
    content: (
      <>
        <LegalP>
          Prosventa relies on external services to operate. Supabase provides
          the database, authentication, and storage platform. Stripe processes
          payments. And workspace-configured providers supply lead discovery,
          enrichment, and research capabilities — including an
          Apollo.io-compatible lead discovery provider and optional
          OpenAI-compatible AI reasoning.
        </LegalP>
        <LegalH3>How external integrations are handled</LegalH3>
        <LegalList
          items={[
            <Fragment key="item-1">
              Credentials for external providers are held in server-side
              configuration and used server-to-server; they are not exposed
              to the browser.
            </Fragment>,
            <Fragment key="item-2">
              External calls are made from the server application, and a
              provider outage degrades the affected feature rather than the
              whole workspace.
            </Fragment>,
            <Fragment key="item-3">
              Each provider operates under its own security controls,
              availability, privacy policy, and terms. Prosventa does not
              control third-party infrastructure.
            </Fragment>,
          ]}
        />
        <LegalCallout title="Data shared with providers">
          For details on what information is shared with these providers and
          why, see the <LegalLink href="/privacy">Privacy Policy</LegalLink>.
        </LegalCallout>
      </>
    ),
  },

  /* ------------------------- 08 Billing & credits ------------------------- */
  {
    id: "billing-and-credits",
    number: "08",
    title: "Billing & credits",
    tocLabel: "Billing & credits",
    content: (
      <>
        <LegalP>
          Prosventa uses a credit-based system, so billing operations are held
          to a strict standard: they are server-authoritative. Clients can
          request operations and read their own organization&apos;s balances —
          they cannot set values or move credits themselves.
        </LegalP>
        <LegalH3>How credits are protected</LegalH3>
        <LegalList
          items={[
            <Fragment key="item-1">
              <strong className="font-semibold text-slate-800">
                Authorized actors only
              </strong>{" "}
              — every credit operation requires an authenticated session,
              verified organization membership, and an appropriate role,
              checked against the database rather than client claims.
            </Fragment>,
            <Fragment key="item-2">
              <strong className="font-semibold text-slate-800">
                Atomic balance changes
              </strong>{" "}
              — balance mutations execute inside controlled database functions
              that lock the balance row, validate amounts, reject negative
              balances, and honor idempotency keys so retries cannot spend
              twice.
            </Fragment>,
            <Fragment key="item-3">
              <strong className="font-semibold text-slate-800">
                Append-only ledger
              </strong>{" "}
              — the transaction history is never rewritten; refunds add
              compensating entries and record any shortfall for review.
            </Fragment>,
            <Fragment key="item-4">
              <strong className="font-semibold text-slate-800">
                Server-side entitlements
              </strong>{" "}
              — plan limits are enforced on the server, so an import that
              would exceed your organization&apos;s capacity is rejected
              outright.
            </Fragment>,
          ]}
        />
        <LegalH3>Payments</LegalH3>
        <LegalP>
          Payments for credit packages are processed by Stripe through hosted
          checkout. Payment details are collected and stored by Stripe on its
          own infrastructure; Prosventa records the outcome of a purchase —
          provider-reported fields such as status, amount, and currency — and
          never receives or stores card numbers. Amount, currency, and credits
          are snapshotted when the purchase is created, so later catalog
          changes cannot rewrite what you agreed to pay.
        </LegalP>
        <LegalH3>Payment verification</LegalH3>
        <LegalList
          items={[
            <Fragment key="item-1">
              Incoming payment events are verified cryptographically before
              anything is processed — a signature check that includes a
              timestamp and replay-protection window. Unsigned or invalid
              requests are rejected.
            </Fragment>,
            <Fragment key="item-2">
              Duplicate event deliveries are recognized and ignored, so a
              replayed event cannot grant credits twice.
            </Fragment>,
            <Fragment key="item-3">
              A confirmed payment is validated against the recorded
              purchase&apos;s amount and currency before credits are granted.
            </Fragment>,
            <Fragment key="item-4">
              Confirmation and credit granting run in a single transaction, so
              the system cannot end up with a payment that never granted
              credits, or credits that were never paid for.
            </Fragment>,
            <Fragment key="item-5">
              This behavior is covered by automated tests, including tampered,
              unsigned, and stale payloads.
            </Fragment>,
          ]}
        />
      </>
    ),
  },

  /* ---------------------------- 09 Data imports --------------------------- */
  {
    id: "data-imports",
    number: "09",
    title: "Data imports",
    tocLabel: "Data imports",
    content: (
      <>
        <LegalP>
          Importing prospects — from CSV or Excel files — is a core workflow,
          and it is designed to be controlled and organization-scoped from
          start to finish.
        </LegalP>
        <LegalH3>What happens when you import</LegalH3>
        <LegalList
          items={[
            <Fragment key="item-1">
              Your file is parsed in the browser into structured rows, and you
              map its columns to Prosventa fields.
            </Fragment>,
            <Fragment key="item-2">
              The server re-validates the import: an authenticated session,
              verified organization membership, and a required column mapping
              are checked before anything is stored.
            </Fragment>,
            <Fragment key="item-3">
              Plan capacity is enforced server-side — imports that would
              exceed your organization&apos;s prospect limit are rejected
              outright rather than silently trimmed.
            </Fragment>,
            <Fragment key="item-4">
              Rows are normalized and validated before persistence, and
              per-row failures are reported to you without corrupting records
              that were already stored.
            </Fragment>,
            <Fragment key="item-5">
              Imported prospects are stored in your organization and inherit
              the same database-level isolation as everything else in your
              workspace.
            </Fragment>,
            <Fragment key="item-6">
              An import history record is kept so your team can see what was
              imported, and when.
            </Fragment>,
          ]}
        />
        <LegalCallout title="Imports are not virus-scanned">
          Imported files are parsed as data, not executed — but they are not
          scanned for malware. As with any spreadsheet tool, only import files
          from sources you trust.
        </LegalCallout>
      </>
    ),
  },

  /* ------------------------- 10 Security practices ------------------------ */
  {
    id: "security-practices",
    number: "10",
    title: "Security practices",
    tocLabel: "Practices",
    content: (
      <>
        <LegalP>
          The controls described on this page are backed by day-to-day
          engineering practices, each of which is part of the codebase today:
        </LegalP>
        <LegalList
          items={[
            <Fragment key="item-1">
              <strong className="font-semibold text-slate-800">
                TypeScript throughout
              </strong>{" "}
              — application code is written in TypeScript with type-checked
              boundaries.
            </Fragment>,
            <Fragment key="item-2">
              <strong className="font-semibold text-slate-800">
                Strict server/client separation
              </strong>{" "}
              — privileged modules are guarded so they cannot be bundled for
              the browser.
            </Fragment>,
            <Fragment key="item-3">
              <strong className="font-semibold text-slate-800">
                Server-side validation
              </strong>{" "}
              — input for imports, credit operations, and provider events is
              validated on the server before it is acted on.
            </Fragment>,
            <Fragment key="item-4">
              <strong className="font-semibold text-slate-800">
                Authorization before action
              </strong>{" "}
              — privileged operations verify identity, membership, and role
              server-side.
            </Fragment>,
            <Fragment key="item-5">
              <strong className="font-semibold text-slate-800">
                Database-level enforcement
              </strong>{" "}
              — Row Level Security policies are part of the schema, with
              automated tests checking their structure.
            </Fragment>,
            <Fragment key="item-6">
              <strong className="font-semibold text-slate-800">
                Tests for security-critical behavior
              </strong>{" "}
              — including webhook signature verification and credit
              authorization gates.
            </Fragment>,
            <Fragment key="item-7">
              <strong className="font-semibold text-slate-800">
                Careful logging
              </strong>{" "}
              — errors are logged without secrets, tokens, or credentials.
            </Fragment>,
            <Fragment key="item-8">
              <strong className="font-semibold text-slate-800">
                Managed dependencies
              </strong>{" "}
              — packages are tracked with a lockfile and updated over time.
            </Fragment>,
          ]}
        />
        <LegalP>
          These practices evolve with the product, and we describe them here
          only as far as they are implemented.
        </LegalP>
      </>
    ),
  },

  /* ---------------------------- 11 Transparency --------------------------- */
  {
    id: "transparency",
    number: "11",
    title: "Transparency",
    tocLabel: "Transparency",
    content: (
      <>
        <LegalP>
          Security is an ongoing process. While Prosventa is designed with
          multiple security controls, no internet-connected service can
          guarantee absolute security — and we believe trust starts with being
          specific about what we do and do not guarantee.
        </LegalP>
        <LegalH3>What we do not claim</LegalH3>
        <LegalList
          items={[
            <Fragment key="item-1">
              <strong className="font-semibold text-slate-800">
                No certifications.
              </strong>{" "}
              Prosventa does not hold SOC 2, ISO 27001, or similar compliance
              certifications, and it has not been audited by an independent
              security firm.
            </Fragment>,
            <Fragment key="item-2">
              <strong className="font-semibold text-slate-800">
                No advanced authentication methods yet.
              </strong>{" "}
              MFA, SSO, and passwordless sign-in are not available today.
            </Fragment>,
            <Fragment key="item-3">
              <strong className="font-semibold text-slate-800">
                No malware scanning of imports.
              </strong>{" "}
              Imported files are parsed as data but not scanned for malicious
              content.
            </Fragment>,
            <Fragment key="item-4">
              <strong className="font-semibold text-slate-800">
                No formal incident-response certification.
              </strong>{" "}
              Reports are handled through the contact channel below, not
              through a certified program.
            </Fragment>,
            <Fragment key="item-5">
              <strong className="font-semibold text-slate-800">
                No live security metrics.
              </strong>{" "}
              You will not find threat counters or uptime figures on this
              page, because we do not fabricate numbers.
            </Fragment>,
          ]}
        />
        <LegalP>When our practices change, this page changes with them.</LegalP>
      </>
    ),
  },

  /* -------------------------- 12 Incident response ------------------------ */
  {
    id: "incident-response",
    number: "12",
    title: "Incident response",
    tocLabel: "Incident response",
    content: (
      <>
        <LegalP>
          If you believe you have found a security issue in Prosventa — in the
          product, the website, or your account — please tell us. Reports are
          reviewed by the team, and we take them seriously.
        </LegalP>
        <LegalCallout title="Found a security issue?">
          <LegalList
            items={[
              <Fragment key="item-1">
                Email{" "}
                <LegalLink href="mailto:support@prosventa.com">
                  support@prosventa.com
                </LegalLink>{" "}
                with enough detail for us to reproduce and assess the issue:
                what you observed, the steps to reproduce it, and the area
                affected.
              </Fragment>,
              <Fragment key="item-2">
                Practice responsible disclosure — give us a reasonable
                opportunity to investigate before publicly posting details.
              </Fragment>,
              <Fragment key="item-3">
                Please do not access data that is not yours, test against
                other customers&apos; workspaces, or send us credentials,
                passwords, API keys, or private customer data.
              </Fragment>,
            ]}
          />
        </LegalCallout>
        <LegalP>
          Prosventa does not currently run a formal bug bounty program or
          offer rewards for reports — but every report we receive is read and
          investigated.
        </LegalP>
      </>
    ),
  },
];

/* ------------------------------------------------------------------------------
 * Page shell — reuses the shared legal design system (LegalPage) with the
 * Security-specific visuals (hero chips, flow diagram, layer stack).
 * ---------------------------------------------------------------------------- */

export default function SecurityPage() {
  return (
    <LegalPage
      eyebrow="Trust"
      title="Security"
      description="Built to protect the data behind your sales workflow — with organization-level isolation, controlled data access, secure server boundaries, and protection of sensitive application credentials."
      updated={UPDATED}
      sections={sections}
      hero={
        <TrustChips
          items={[
            "Organization-level access control",
            "Row Level Security",
            "Server-side credential protection",
            "Server-authoritative billing",
            "Signed payment webhooks",
          ]}
        />
      }
      footer={
        <div>
          <p className="max-w-3xl text-lg font-medium tracking-tight text-slate-900">
            Security is an ongoing responsibility.
          </p>
          <p className="mt-2 max-w-3xl text-[15px] leading-relaxed text-slate-600">
            We keep this page current as the platform evolves. Questions about
            anything described here? Reach us at{" "}
            <LegalLink href="mailto:support@prosventa.com">
              support@prosventa.com
            </LegalLink>
            .
          </p>
          <div className="mt-6 grid max-w-3xl gap-3 sm:grid-cols-2">
            <RelatedLink
              href="/privacy"
              title="Privacy Policy"
              description="How Prosventa collects, uses, and protects information."
            />
            <RelatedLink
              href="/terms"
              title="Terms of Service"
              description="The rules that govern using Prosventa."
            />
          </div>
          <div className="mt-8">
            <SecurityNote>
              This page describes Prosventa&apos;s security architecture and
              practices at a high level, as of the date shown above. It may
              change as Prosventa evolves and does not replace the contractual
              terms in the{" "}
              <LegalLink href="/terms">Terms of Service</LegalLink>.
            </SecurityNote>
          </div>
        </div>
      }
    />
  );
}