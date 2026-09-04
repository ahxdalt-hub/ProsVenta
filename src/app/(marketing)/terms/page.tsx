import { Fragment } from "react";

import type { LegalSectionData } from "@/components/marketing/legal/LegalPage";
import LegalPage, {
  LegalCallout,
  LegalInfoGrid,
  LegalLink,
  LegalList,
  LegalP,
  LegalSourceList,
  RelatedLink,
} from "@/components/marketing/legal/LegalPage";

// ============================================================================
// Terms of Service — /terms
// ============================================================================
// Content + UI redesign only (Phase 2 of the legal-page redesign). Every
// factual statement below is grounded in the existing Prosventa implementation
// and reuses the shared legal-page shell + primitives from Phase 1:
//   - Shared LegalPage shell: sticky contents nav, mobile contents, section
//     entrance animations, smooth anchor scrolling (prefers-reduced-motion safe)
//   - Prospects: management, saved lists, CSV/Excel import, manual entry,
//     CSV export via the Export Center
//   - Lead discovery via workspace-configured external lead providers + ICP
//   - Workspace-configured enrichment/research providers; intent signals;
//     ICP scoring; recommendations and an AI assistant (decision support)
//   - Organizations/workspaces with roles/permissions and RLS org isolation
//   - Credits: organization wallet; billable operations = company/contact
//     enrichment, company/prospect research, signal detection, automation
//     steps; operations consume credits only on success
//   - Billing: free + paid tiers, monthly/annual billing via an external
//     payment provider; allowances published on the pricing page
//   - Support contact: support@prosventa.com (used in-app)
// Deliberately NOT claimed anywhere: credit prices, credit expiry, refund or
// cancellation policies, SLA/uptime guarantees, provider names, company
// address, or a governing jurisdiction (pending legal confirmation).
// ============================================================================

export const metadata = {
  title: "Terms of Service — Prosventa",
  description:
    "The rules and conditions that govern your use of Prosventa — agreements, accounts, credits, billing, and fair use.",
};

const UPDATED = "September 4, 2026";

const sections: LegalSectionData[] = [
  /* ----------------------------- 01 Agreement ----------------------------- */
  {
    id: "agreement",
    number: "01",
    title: "Agreement to These Terms",
    tocLabel: "Agreement",
    content: (
      <>
        <LegalP>
          These Terms of Service, together with the Privacy Policy, form the
          agreement between you and Prosventa. They govern your access to and
          use of the Prosventa website, the Prosventa application, and any
          related services we provide.
        </LegalP>
        <LegalP>
          By creating an account, accessing, or using Prosventa, you agree to
          these Terms. If you use Prosventa on behalf of a company or other
          organization, you confirm that you are authorized to accept these
          Terms on its behalf, and references to you in these Terms then
          include that organization.
        </LegalP>
        <LegalP>
          If you do not agree to these Terms, do not use Prosventa. If you
          have questions, contact us — Section 19 explains how.
        </LegalP>
      </>
    ),
  },

  /* ------------------------- 02 About Prosventa --------------------------- */
  {
    id: "about",
    number: "02",
    title: "About Prosventa",
    tocLabel: "About",
    content: (
      <>
        <LegalP>
          Prosventa is a prospecting and sales-intelligence platform. Teams use
          it to find and organize commercial prospects — companies and the
          professional contacts connected to them — evaluate them against an
          ideal customer profile (ICP), enrich records with information from
          external data providers, and work with intelligence features such as
          research briefs, intent signals, and recommendations.
        </LegalP>
        <LegalP>
          Prosventa is a tool that supports your sales work. It does not
          promise any particular business result — we make no guarantee of
          sales, revenue, conversions, lead quality, or responses. Section 15
          explains this in more detail.
        </LegalP>
      </>
    ),
  },

  /* -------------------- 03 Eligibility and Accounts ----------------------- */
  {
    id: "accounts",
    number: "03",
    title: "Eligibility and Accounts",
    tocLabel: "Accounts",
    content: (
      <>
        <LegalP>
          To use Prosventa you need an account. You can create one yourself or
          be invited into an existing workspace. Accounts are intended for
          business use, and you should be able to enter into a binding contract
          under the law that applies to you.
        </LegalP>
        <LegalList
          items={[
            "Provide accurate, current information when you create your account, and keep it up to date.",
            "Keep your sign-in credentials confidential and do not share your account with others.",
            "You are responsible for the activity that happens through your account.",
            "Tell us promptly if you believe someone has gained unauthorized access to your account.",
          ]}
        />
        <LegalP>
          We may suspend or restrict accounts that put the service, its users,
          or its security at risk — Section 14 explains when and how.
        </LegalP>
      </>
    ),
  },

  /* ----------------- 04 Organizations and Workspaces ---------------------- */
  {
    id: "workspaces",
    number: "04",
    title: "Organizations and Workspaces",
    tocLabel: "Workspaces",
    content: (
      <>
        <LegalP>
          Prosventa is organized around workspaces (organizations). Prospect
          records, saved lists, ICP configurations, and workspace settings live
          in the shared workspace rather than in personal accounts, and most
          people join a workspace by invitation.
        </LegalP>
        <LegalP>
          What you can see and do in a workspace depends on your membership and
          your role. Workspace roles control who can manage members, change
          settings, and access configuration. Administrators can invite or
          remove members and change roles, and their actions can affect what
          you can access.
        </LegalP>
        <LegalP>
          If you join a workspace created by someone else — for example, your
          employer — the workspace administrator controls that workspace and
          the data in it. When your membership in a workspace ends, your access
          to its data ends with it.
        </LegalP>
        <LegalP>
          You are responsible for the activity performed through your
          authorized account, including the operations you run in a workspace.
        </LegalP>
      </>
    ),
  },

  /* ------------------------- 05 Using Prosventa --------------------------- */
  {
    id: "usage",
    number: "05",
    title: "Using Prosventa",
    tocLabel: "Usage",
    content: (
      <>
        <LegalP>
          Prosventa is built for prospecting work. To keep the platform
          reliable and safe for everyone, use it lawfully and respect the
          access controls around it. You agree not to:
        </LegalP>
        <LegalList
          items={[
            "use the service in a way that breaks applicable laws or regulations;",
            "attempt to access accounts, workspaces, or data that are not yours — including data belonging to other organizations;",
            "interfere with or disrupt the service, or try to overload, probe, or scan our infrastructure;",
            "circumvent technical restrictions such as access controls, usage limits, or credit checks;",
            "send excessive or abusive automated requests in a way that degrades the service for others;",
            "introduce malicious code into the service; or",
            "use the service to harm Prosventa, its users, or third parties.",
          ]}
        />
        <LegalP>
          We may apply reasonable technical measures — such as rate limits — to
          protect the service and its users from abuse.
        </LegalP>
      </>
    ),
  },

  /* -------------------- 06 Prospect and Customer Data --------------------- */
  {
    id: "customer-data",
    number: "06",
    title: "Prospect and Customer Data",
    tocLabel: "Customer Data",
    content: (
      <>
        <LegalP>
          Prospecting is the core of the product, so it is worth being precise
          about the data involved. In Prosventa you can:
        </LegalP>
        <LegalList
          items={[
            "import prospect information from CSV or Excel files, or add records manually;",
            "manage and organize your prospect database — statuses, tags, saved lists, and views;",
            "associate prospects with your ideal customer profile (ICP) configuration;",
            "run enrichment, research, and intelligence operations on your records; and",
            "export your prospect data, for example as CSV from the Export Center.",
          ]}
        />
        <LegalP>
          Two origins of information matter, and it helps to keep them apart:
        </LegalP>
        <LegalSourceList
          items={[
            {
              label: "Information you provide",
              children:
                "Prospect records your team creates or imports — company details, contacts, notes, statuses, tags, and lists. This is data your organization chooses to put into Prosventa.",
            },
            {
              label: "Information retrieved through external providers",
              children:
                "When you run enrichment, research, or lead discovery, Prosventa may request information about a company or contact from the external data providers configured for your workspace. Retrieved information is stored alongside — but separately from — the records you create, so provider data never overwrites what you entered.",
            },
          ]}
        />
        <LegalP>
          Prosventa does not claim ownership of the prospect information you
          submit. Your workspace data stays yours to manage, and you can
          export or delete it.
        </LegalP>
        <LegalCallout title="Customer responsibility">
          You remain responsible for the information you submit to Prosventa —
          including making sure you have the necessary rights and permissions
          to collect, submit, and process it, and that your use of the
          platform complies with the laws that apply to you.
        </LegalCallout>
      </>
    ),
  },

  /* ---------------------- 07 Third-Party Services ------------------------- */
  {
    id: "third-party",
    number: "07",
    title: "Third-Party Services",
    tocLabel: "Third Parties",
    content: (
      <>
        <LegalP>
          Prosventa relies on external services in several places:
          infrastructure for hosting, database, and authentication; a payment
          provider for billing; and — where configured for your workspace —
          external data providers used for enrichment, research, and lead
          discovery.
        </LegalP>
        <LegalList
          items={[
            "Availability and performance of parts of the service can depend on these providers.",
            "Information retrieved from third-party providers may be incomplete, out of date, or inaccurate.",
            "Third-party services may have their own terms and privacy policies, and their handling of information is governed by those.",
          ]}
        />
        <LegalCallout title="Important">
          We do not guarantee that enrichment or discovery information is
          accurate, complete, or current. Treat retrieved information as a
          starting point, and verify important details independently before
          relying on them.
        </LegalCallout>
      </>
    ),
  },

  /* ------------------- 08 Intelligence and AI-Assisted Features ------------ */
  {
    id: "intelligence",
    number: "08",
    title: "Intelligence and AI-Assisted Features",
    tocLabel: "Intelligence",
    content: (
      <>
        <LegalP>
          Prosventa includes intelligence features that work with your prospect
          data: ICP evaluation and scoring, company and contact enrichment,
          research briefs, intent-signal detection, and recommendations for
          possible next steps. Some of this processing is deterministic; some
          is assisted by AI where it is configured.
        </LegalP>
        <LegalP>
          These features combine the information in your workspace with
          information retrieved through external providers to help you evaluate
          prospects, prioritize opportunities, and understand signals.
        </LegalP>
        <LegalInfoGrid
          items={[
            {
              title: "Decision support, not decisions",
              children:
                "Intelligence outputs are decision-support tools. They may be incomplete, delayed, or wrong, and they do not guarantee accuracy, lead quality, prospect responses, or any business outcome.",
            },
            {
              title: "Not professional advice",
              children:
                "Outputs are not professional, legal, or financial advice. Evaluate them in context before acting on them.",
            },
            {
              title: "You stay in charge",
              children:
                "You remain responsible for the decisions you make using Prosventa and for how you act on its outputs.",
            },
            {
              title: "Grounded in your data",
              children:
                "Intelligence is built from your workspace data plus information retrieved through providers. The quality of both shapes the quality of the output.",
            },
          ]}
        />
      </>
    ),
  },

  /* ------------------------------- 09 Credits ------------------------------ */
  {
    id: "credits",
    number: "09",
    title: "Credits",
    tocLabel: "Credits",
    content: (
      <>
        <LegalP>
          Prosventa uses a credit system for usage-based operations. Certain
          operations consume credits from the balance of your organization —
          for example company and contact enrichment, company and prospect
          research, intent-signal detection, and automation steps.
        </LegalP>
        <LegalP>
          The cost of an operation depends on what it is. The product shows the
          credit cost before you run a billable operation, and your workspace
          usage records show what has been consumed.
        </LegalP>
        <LegalP>
          Operations consume credits only when they complete. If a billable
          operation fails, the reservation is released and nothing is consumed.
        </LegalP>
        <LegalCallout title="Usage-based operations">
          Everyday prospecting — managing records, importing, organizing lists
          — does not consume credits. Enrichment, research, signal detection,
          and automation are usage-based: running them consumes credits
          according to the operation performed.
        </LegalCallout>
        <LegalP>
          Plans include a monthly credit allowance, and credits are shared
          across the workspace rather than tracked per person. For current
          plans, allowances, and pricing, see the{" "}
          <LegalLink href="/pricing">pricing page</LegalLink>.
        </LegalP>
      </>
    ),
  },

  /* --------------------- 10 Subscriptions and Billing ---------------------- */
  {
    id: "billing",
    number: "10",
    title: "Subscriptions and Billing",
    tocLabel: "Billing",
    content: (
      <>
        <LegalP>
          Prosventa offers a free plan and paid plans. Paid plans are billed
          monthly or annually, and each plan includes a monthly credit
          allowance together with access to specific features. Current plans
          and prices are published on the{" "}
          <LegalLink href="/pricing">pricing page</LegalLink> — this page does
          not restate them, because pricing can change.
        </LegalP>
        <LegalP>
          Payments are handled by our payment provider. Payment card details
          are entered directly at the provider during checkout and are not
          stored by Prosventa. Credits included with a paid plan become
          available once payment is confirmed.
        </LegalP>
        <LegalP>
          A plan includes its monthly credit allowance for each billing period;
          unused allowance does not carry over to the next period. What each
          plan includes, and how billing is presented, is shown before you
          complete a purchase.
        </LegalP>
        <LegalP>
          If you have a question about a charge or your plan, contact us at{" "}
          <LegalLink href="mailto:support@prosventa.com">
            support@prosventa.com
          </LegalLink>
          .
        </LegalP>
      </>
    ),
  },

  /* ------------------------ 11 Intellectual Property ----------------------- */
  {
    id: "ip",
    number: "11",
    title: "Intellectual Property",
    tocLabel: "IP",
    content: (
      <>
        <LegalP>
          The Prosventa service — including its software, visual design,
          branding, logos, and the proprietary systems and infrastructure
          behind it — is protected by applicable intellectual-property rights.
          Those rights belong to Prosventa or its licensors.
        </LegalP>
        <LegalP>
          We grant you a limited, non-exclusive, non-transferable right to use
          Prosventa for its intended purpose, in accordance with these Terms.
          Everything else stays reserved.
        </LegalP>
        <LegalP>
          As for your data: you keep whatever rights you hold in the
          information you submit, and Prosventa does not claim ownership of
          it. Prosventa uses workspace data to provide and support the
          service, as described in the{" "}
          <LegalLink href="/privacy">Privacy Policy</LegalLink>.
        </LegalP>
      </>
    ),
  },

  /* ------------------------------ 12 Feedback ------------------------------ */
  {
    id: "feedback",
    number: "12",
    title: "Feedback",
    tocLabel: "Feedback",
    content: (
      <>
        <LegalP>
          We welcome ideas, suggestions, and bug reports. If you send us
          feedback, you keep the rights in it — submitting feedback does not
          transfer ownership of your ideas or proprietary information to
          Prosventa.
        </LegalP>
        <LegalP>
          You allow us to use feedback to improve Prosventa, without any
          obligation on our part to compensate you or to act on it.
        </LegalP>
      </>
    ),
  },

  /* -------------------------- 13 Service Availability ---------------------- */
  {
    id: "availability",
    number: "13",
    title: "Service Availability",
    tocLabel: "Availability",
    content: (
      <>
        <LegalP>
          We work to keep Prosventa available on an ongoing basis, but
          availability can occasionally be affected by maintenance,
          infrastructure problems, third-party outages, technical failures, or
          events outside our reasonable control.
        </LegalP>
        <LegalP>
          We do not promise uninterrupted or error-free availability. Custom
          service-level commitments, where they exist, are agreed separately in
          writing.
        </LegalP>
      </>
    ),
  },

  /* ---------------------- 14 Suspension and Termination -------------------- */
  {
    id: "termination",
    number: "14",
    title: "Suspension and Termination",
    tocLabel: "Termination",
    content: (
      <>
        <LegalP>
          You can stop using Prosventa at any time. If you want your account or
          workspace data deleted, contact us — the{" "}
          <LegalLink href="/privacy">Privacy Policy</LegalLink> explains how
          deletion requests are handled.
        </LegalP>
        <LegalP>
          We may suspend or terminate access to Prosventa if:
        </LegalP>
        <LegalList
          items={[
            "you materially breach these Terms;",
            "the platform is used abusively or in a way that creates a security risk;",
            "use of the service is unlawful; or",
            "payment obligations remain unmet, where applicable.",
          ]}
        />
        <LegalP>
          Where reasonably practical, we will tell you before or shortly after
          a suspension — unless doing so would compromise security or violate
          the law.
        </LegalP>
        <LegalP>
          When access ends, your right to use the service ends, and access to
          workspace data governed by your membership ends with it. What happens
          to data after termination — including deletion on request — is
          described in the Privacy Policy.
        </LegalP>
        <LegalP>
          Sections of these Terms that should reasonably survive termination —
          such as intellectual property, disclaimers, and limitation of
          liability — remain in effect.
        </LegalP>
      </>
    ),
  },

  /* ----------------------------- 15 Disclaimers ---------------------------- */
  {
    id: "disclaimers",
    number: "15",
    title: "Disclaimers",
    tocLabel: "Disclaimers",
    content: (
      <>
        <LegalP>
          To the maximum extent permitted by law, Prosventa is provided as is
          and as available, without warranties of any kind beyond those that
          cannot lawfully be excluded.
        </LegalP>
        <LegalP>In particular, Prosventa does not guarantee:</LegalP>
        <LegalList
          items={[
            "any business outcome, including sales, revenue, or conversions;",
            "lead quality, prospect responses, or prospecting success;",
            "the accuracy, completeness, or currency of enrichment or discovery information; or",
            "uninterrupted or error-free availability of the service.",
          ]}
        />
        <LegalP>
          Intelligence and recommendation features are tools that assist your
          work — they do not replace your judgment, and they are not
          professional, legal, or financial advice.
        </LegalP>
      </>
    ),
  },

  /* ------------------------ 16 Limitation of Liability --------------------- */
  {
    id: "liability",
    number: "16",
    title: "Limitation of Liability",
    tocLabel: "Liability",
    content: (
      <>
        <LegalP>
          To the maximum extent permitted by law, neither you nor Prosventa
          will be liable to the other for indirect, incidental, special, or
          consequential damages — including lost profits, lost revenue, lost
          data, or business interruption — arising from or related to the
          service, even if advised of the possibility of those damages.
        </LegalP>
        <LegalP>
          To the maximum extent permitted by law, the total liability of
          Prosventa for any claim relating to the service is limited to the
          amounts you paid to Prosventa for the service in the twelve months
          before the event giving rise to the claim.
        </LegalP>
        <LegalP>
          Nothing in these Terms limits liability that cannot be limited under
          applicable law.
        </LegalP>
      </>
    ),
  },

  /* ------------------------ 17 Changes to These Terms ---------------------- */
  {
    id: "changes",
    number: "17",
    title: "Changes to These Terms",
    tocLabel: "Changes",
    content: (
      <>
        <LegalP>
          We may update these Terms as Prosventa evolves. The Updated date at
          the top of this page shows when the current version took effect.
        </LegalP>
        <LegalP>
          When changes are significant, we may also highlight them in the
          product. Continuing to use Prosventa after an update takes effect
          means you accept the updated Terms. If you disagree with a change,
          you can stop using the service and contact us about your account.
        </LegalP>
      </>
    ),
  },

  /* ---------------------------- 18 Governing Law --------------------------- */
  {
    id: "governing-law",
    number: "18",
    title: "Governing Law",
    tocLabel: "Governing Law",
    content: (
      <>
        <LegalP>
          These Terms are subject to the laws applicable to Prosventa and its
          operation. A specific governing jurisdiction and venue will be
          confirmed here as the commercial and legal structure of the business
          is finalized.
        </LegalP>
        <LegalP>
          Nothing in these Terms affects mandatory rights you may have under
          the law that applies to you, including consumer-protection rights
          that cannot be waived.
        </LegalP>
      </>
    ),
  },

  /* ------------------------------ 19 Contact ------------------------------- */
  {
    id: "contact",
    number: "19",
    title: "Contact",
    tocLabel: "Contact",
    content: (
      <>
        <LegalP>
          Questions about these Terms, or about how Prosventa works? Get in
          touch:
        </LegalP>
        <LegalList
          items={[
            <Fragment key="item-1">
              <strong className="font-semibold text-slate-800">Email</strong> —{" "}
              <LegalLink href="mailto:support@prosventa.com">
                support@prosventa.com
              </LegalLink>
              . Our team answers by email, usually within business hours.
            </Fragment>,
            <Fragment key="item-2">
              <strong className="font-semibold text-slate-800">
                In the product
              </strong>{" "}
              — open the Help Center under Settings → Help &amp; Support for
              guides and troubleshooting.
            </Fragment>,
          ]}
        />
      </>
    ),
  },
];

/* ----------------------------------------------------------------------------
 * Related legal pages — rendered after the article.
 * -------------------------------------------------------------------------- */

export default function TermsOfServicePage() {
  return (
    <LegalPage
      eyebrow="Legal"
      title="Terms of Service"
      description="The rules and conditions that govern your use of Prosventa."
      updated={UPDATED}
      sections={sections}
      footer={
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Related
          </p>
          <div className="mt-4 grid max-w-3xl gap-3 sm:grid-cols-2">
            <RelatedLink
              href="/privacy"
              title="Privacy Policy"
              description="How Prosventa handles information and protects user privacy."
            />
            <RelatedLink
              href="/security"
              title="Security"
              description="How Prosventa protects your data and accounts."
            />
          </div>
        </div>
      }
    />
  );
}
