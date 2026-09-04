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
// Privacy Policy — /privacy
// ============================================================================
// Content + UI redesign only. Every factual statement below is grounded in the
// existing Prosventa implementation:
//   - Supabase (database, auth, storage) with RLS org isolation and RBAC
//   - Stripe (server-side checkout; card data never touches Prosventa)
//   - CSV/Excel imports, manual entry, Apollo.io-compatible lead discovery
//   - Workspace-configured enrichment/research providers, optional
//     OpenAI-compatible AI reasoning (deterministic analysis without it)
//   - Research workflows avoid inferring sensitive personal characteristics
//   - Essential session cookies only; no ad / third-party analytics trackers
//   - Support contact: support@prosventa.com (used in-app)
// No certifications, retention timelines, or vendor relationships are claimed
// beyond what the codebase verifies.
// ============================================================================

export const metadata = {
  title: "Privacy Policy — Prosventa",
  description:
    "How Prosventa collects, uses, shares, and protects information — and the choices you have.",
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
          Prosventa is a prospecting intelligence platform. Business teams use
          it to find, organize, enrich, and understand commercial prospects —
          companies and the professional contacts connected to them — in one
          shared workspace.
        </LegalP>
        <LegalP>
          This Privacy Policy explains what information Prosventa collects, how
          that information is used and shared, and the choices available to
          you. It applies to the Prosventa website, the Prosventa application,
          and any interaction you have with us in connection with the product.
        </LegalP>
        <LegalP>
          If you use Prosventa within a company workspace, your workspace
          administrator controls that workspace — its members, settings, and
          the prospect data in it. When you add or manage prospect information
          in Prosventa, you are responsible for that information, including
          having an appropriate basis to process it, and Prosventa processes it
          on your behalf in order to provide the service.
        </LegalP>
      </>
    ),
  },

  /* ------------------------ 02 Information We Collect --------------------- */
  {
    id: "information-we-collect",
    number: "02",
    title: "Information We Collect",
    tocLabel: "Information",
    content: (
      <>
        <LegalP>
          We keep collection deliberately limited to what the product needs.
          Most of it falls into two groups: information you or your
          organization provide, and information generated as the product is
          used.
        </LegalP>
        <LegalInfoGrid
          items={[
            {
              title: "Account information",
              children:
                "Your name, email address, and password. Sign-in and password handling are managed by our authentication layer. You can optionally add a profile photo and role details to your profile.",
            },
            {
              title: "Workspace information",
              children:
                "Your organization's name, the members you invite, the roles assigned to them, and shared workspace configuration such as your ideal customer profile (ICP) definition.",
            },
            {
              title: "Prospect data you provide",
              children:
                "Information about companies and professional contacts that you add manually or import from CSV or Excel files — for example company names, websites, industries, locations, and business contact details.",
            },
            {
              title: "Product configuration",
              children:
                "Workspace settings, including the intelligence and enrichment providers your workspace connects to and the credentials used with them. Provider credentials are stored server-side and are never exposed to the browser.",
            },
            {
              title: "Usage information",
              children:
                "Records of what happens in your workspace — imports, enrichment and research operations, saved lists, and the Credits consumed by those operations — plus basic interaction data that helps us understand how features are used.",
            },
            {
              title: "Technical information",
              children:
                "Standard technical logs created when you use Prosventa, such as IP address, browser type, and request times, retained by our infrastructure providers for reliability and security.",
            },
            {
              title: "Billing-related information",
              children:
                "Records of Credit package purchases — amount, currency, status, and date. Payment card details are entered directly at our payment provider during checkout and are not stored by Prosventa.",
            },
            {
              title: "Communications",
              children:
                "Messages you send us, such as support emails, along with any information you choose to include in them.",
            },
          ]}
        />
      </>
    ),
  },

  /* ----------------------- 03 Prospect and Customer Data ------------------ */
  {
    id: "prospect-data",
    number: "03",
    title: "Prospect and Customer Data",
    tocLabel: "Prospect Data",
    content: (
      <>
        <LegalP>
          Prospecting is the core of Prosventa, so it is worth being precise
          about the data involved and where each piece comes from. Three
          distinct origins matter:
        </LegalP>
        <LegalSourceList
          items={[
            {
              label: "Information submitted by you",
              children:
                "Prospect records your team creates — imported spreadsheets, manual entries, notes, statuses, tags, and saved lists. This is data your organization chooses to put into Prosventa.",
            },
            {
              label: "Information retrieved through external providers",
              children:
                "When you run enrichment, research, or lead discovery, Prosventa may request information about a company or contact from the external data providers configured for your workspace — for example business search and enrichment services, or public job boards used for hiring signals. What comes back depends on the providers your workspace connects to and the fields they return.",
            },
            {
              label: "Information generated by Prosventa",
              children:
                "Scores, fit ratings, intent signals, recommendations, and research summaries that Prosventa produces from the data above. These are outputs created for your workspace as part of the product — not records collected about people elsewhere.",
            },
          ]}
        />
        <LegalCallout title="Sensitive personal characteristics">
          Prosventa research is designed to describe businesses and
          professional roles — not people&apos;s private lives. Our research
          workflows are explicitly built to avoid inferring sensitive personal
          characteristics such as religion, political opinions, health, or
          ethnicity.
        </LegalCallout>
        <LegalP>
          We do not sell prospect data. Prospect information in your workspace
          is yours to manage: you can edit it, export it, or remove it at any
          time from the product.
        </LegalP>
      </>
    ),
  },

  /* ------------------------ 04 How We Use Information --------------------- */
  {
    id: "how-we-use-information",
    number: "04",
    title: "How We Use Information",
    tocLabel: "Data Usage",
    content: (
      <>
        <LegalP>
          We use the information described above to operate Prosventa and to
          keep it safe and useful. Specifically, to:
        </LegalP>
        <LegalList
          items={[
            <Fragment key="item-1">
              <strong className="font-semibold text-slate-800">
                Provide the product
              </strong>{" "}
              — accounts and sign-in, workspaces, prospect management, imports
              and exports, and saved lists.
            </Fragment>,
            <Fragment key="item-2">
              <strong className="font-semibold text-slate-800">
                Run intelligence operations
              </strong>{" "}
              — enrichment, research, hiring and business signals, scoring, and
              recommendations, metered through Credits.
            </Fragment>,
            <Fragment key="item-3">
              <strong className="font-semibold text-slate-800">
                Process payments
              </strong>{" "}
              — complete Credit purchases through our payment provider and
              maintain your purchase history.
            </Fragment>,
            <Fragment key="item-4">
              <strong className="font-semibold text-slate-800">
                Support you
              </strong>{" "}
              — respond to requests, diagnose problems, and help your team get
              unblocked.
            </Fragment>,
            <Fragment key="item-5">
              <strong className="font-semibold text-slate-800">
                Keep the service secure
              </strong>{" "}
              — protect accounts, detect and prevent abuse, and enforce
              role-based access within workspaces.
            </Fragment>,
            <Fragment key="item-6">
              <strong className="font-semibold text-slate-800">
                Improve the product
              </strong>{" "}
              — understand which features are used, investigate issues, and
              guide what we build next, using aggregated information where
              practical.
            </Fragment>,
            <Fragment key="item-7">
              <strong className="font-semibold text-slate-800">
                Meet legal obligations
              </strong>{" "}
              — respond to lawful requests and keep the records we are required
              to keep.
            </Fragment>,
          ]}
        />
        <LegalCallout title="About AI-assisted intelligence">
          Some intelligence features can use AI models through providers
          configured for your workspace to add explanations and summaries on
          top of Prosventa&apos;s own analysis. AI assistance is optional —
          where no AI provider is configured, the product&apos;s deterministic
          analysis still works on its own.
        </LegalCallout>
      </>
    ),
  },

  /* ----------------------------- 05 Data Sharing -------------------------- */
  {
    id: "data-sharing",
    number: "05",
    title: "Data Sharing",
    tocLabel: "Sharing",
    content: (
      <>
        <LegalP>
          We do not sell personal information. We share information only with
          the parties and in the situations described below, and only what is
          needed for the purpose at hand.
        </LegalP>
        <LegalInfoGrid
          items={[
            {
              title: "Infrastructure providers",
              children:
                "Prosventa runs on third-party cloud infrastructure. Our database, authentication, and file storage are provided by Supabase, and the application itself is hosted in the cloud.",
            },
            {
              title: "Payment processing",
              children:
                "Credit package payments are processed by Stripe. Checkout happens on Stripe's interface and Stripe handles the payment details; we receive the resulting purchase record — not your card number.",
            },
            {
              title: "Intelligence and data providers",
              children:
                "When your workspace uses enrichment, research, or lead discovery, the external providers configured for that workspace process the relevant company or contact information in order to return results. Providers vary by workspace configuration.",
            },
            {
              title: "Legal and safety",
              children:
                "If required by law, regulation, or valid legal process, or to protect the rights, property, or safety of Prosventa, our users, or others.",
            },
            {
              title: "Business changes",
              children:
                "If Prosventa is involved in a merger, acquisition, or asset sale, workspace and account information may be transferred as part of that transaction, subject to this policy.",
            },
          ]}
        />
      </>
    ),
  },

  /* ---------------------------- 06 Data Retention ------------------------- */
  {
    id: "data-retention",
    number: "06",
    title: "Data Retention",
    tocLabel: "Retention",
    content: (
      <>
        <LegalP>
          We keep information for as long as your account and workspace are
          active, so Prosventa works the way you expect — your prospects,
          lists, settings, and history remain available until you or your
          workspace administrator remove them.
        </LegalP>
        <LegalP>
          After that, how long specific information persists depends on a few
          factors:
        </LegalP>
        <LegalList
          items={[
            "The type of information — account records, workspace data, purchase records, and technical logs are retained differently.",
            "Legal and accounting obligations — for example, purchase records may need to be kept for tax or accounting purposes.",
            "Operational safety — backups and security logs persist for limited periods before being fully deleted.",
          ]}
        />
        <LegalP>
          We do not promise fixed deletion timelines, because the right
          retention period depends on the factors above. When information is
          deleted, it may persist temporarily in encrypted backups before
          being fully removed.
        </LegalP>
        <LegalP>
          You can request deletion of your account or workspace data at any
          time by contacting{" "}
          <LegalLink href="mailto:support@prosventa.com">
            support@prosventa.com
          </LegalLink>
          .
        </LegalP>
      </>
    ),
  },

  /* ------------------------------- 07 Security ---------------------------- */
  {
    id: "security",
    number: "07",
    title: "Security",
    tocLabel: "Security",
    content: (
      <>
        <LegalP>
          Protecting your information is part of the product, not an
          afterthought. Some of the measures we rely on:
        </LegalP>
        <LegalList
          items={[
            <Fragment key="item-1">
              <strong className="font-semibold text-slate-800">
                Row-level security
              </strong>{" "}
              — every organization&apos;s data is isolated at the database
              level, so one workspace cannot read another&apos;s.
            </Fragment>,
            <Fragment key="item-2">
              <strong className="font-semibold text-slate-800">
                Role-based access
              </strong>{" "}
              — members only see and do what their role in the workspace
              allows.
            </Fragment>,
            <Fragment key="item-3">
              <strong className="font-semibold text-slate-800">
                Server-side credentials
              </strong>{" "}
              — provider API keys and secrets live in server-side
              configuration, never exposed to the browser.
            </Fragment>,
            <Fragment key="item-4">
              <strong className="font-semibold text-slate-800">
                Encrypted connections
              </strong>{" "}
              — information is transmitted over encrypted HTTPS connections.
            </Fragment>,
            <Fragment key="item-5">
              <strong className="font-semibold text-slate-800">
                Managed authentication
              </strong>{" "}
              — sign-in, passwords, and session handling are delegated to a
              dedicated authentication provider.
            </Fragment>,
          ]}
        />
        <LegalP>
          No method of transmission or storage is perfectly secure, and
          security work is never finished. If you believe you have found a
          vulnerability or notice suspicious activity in your workspace,
          please tell us at{" "}
          <LegalLink href="mailto:support@prosventa.com">
            support@prosventa.com
          </LegalLink>
          .
        </LegalP>
        <LegalP>
          Read more about how we approach security on the{" "}
          <LegalLink href="/security">Security page</LegalLink>.
        </LegalP>
      </>
    ),
  },

  /* ------------------- 08 Cookies and Similar Technologies ---------------- */
  {
    id: "cookies",
    number: "08",
    title: "Cookies and Similar Technologies",
    tocLabel: "Cookies",
    content: (
      <>
        <LegalP>
          Prosventa uses a deliberately small set of cookies and browser
          storage — what is strictly necessary for the product to work. No
          advertising cookies or third-party analytics trackers are used.
        </LegalP>
        <LegalList
          items={[
            <Fragment key="item-1">
              <strong className="font-semibold text-slate-800">
                Essential sign-in cookies
              </strong>{" "}
              — a small set of cookies keeps you securely signed in and
              protects your session. These are set by the authentication layer
              and are required for the product to function.
            </Fragment>,
            <Fragment key="item-2">
              <strong className="font-semibold text-slate-800">
                Local browser storage
              </strong>{" "}
              — minor pieces of state, such as remembering an in-progress
              checkout, are stored in your browser to keep flows working
              smoothly.
            </Fragment>,
          ]}
        />
        <LegalCallout title="Checkout at our payment provider">
          When you are redirected to our payment provider to complete a
          purchase, that provider&apos;s own cookie and privacy practices apply
          to its checkout pages.
        </LegalCallout>
      </>
    ),
  },

  /* ----------------------- 09 User Rights and Choices --------------------- */
  {
    id: "user-rights",
    number: "09",
    title: "User Rights and Choices",
    tocLabel: "Your Rights",
    content: (
      <>
        <LegalP>
          Privacy rights differ by country and region, and we do not claim
          that every right applies to every user. Depending on where you live,
          you may have rights such as:
        </LegalP>
        <LegalList
          items={[
            "Access — request a copy of the personal information we hold about you.",
            "Correction — ask us to correct information that is inaccurate.",
            "Deletion — ask us to delete your personal information.",
            "Portability — receive your data in a portable format.",
            "Objection and restriction — object to or ask us to limit certain processing.",
            "Withdrawal of consent — where processing relies on your consent, withdraw it.",
          ]}
        />
        <LegalP>In the product, you can already:</LegalP>
        <LegalList
          items={[
            "Edit your profile details and photo, and manage your account security.",
            "Manage your workspace — members, roles, and provider configuration.",
            "Edit, export, or delete prospect data — the Export Center supports CSV export of your data.",
          ]}
        />
        <LegalP>
          To exercise a right or make a request that is not available in the
          product, contact{" "}
          <LegalLink href="mailto:support@prosventa.com">
            support@prosventa.com
          </LegalLink>
          . We may need to verify your identity before we can act on a
          request.
        </LegalP>
      </>
    ),
  },

  /* --------------------------- 10 Children's Privacy ---------------------- */
  {
    id: "childrens-privacy",
    number: "10",
    title: "Children's Privacy",
    tocLabel: "Children",
    content: (
      <>
        <LegalP>
          Prosventa is a tool for business use. It is not directed at children,
          and we do not knowingly collect personal information from children.
        </LegalP>
        <LegalP>
          If you believe a child has provided personal information through
          Prosventa, contact us at{" "}
          <LegalLink href="mailto:support@prosventa.com">
            support@prosventa.com
          </LegalLink>{" "}
          and we will delete it.
        </LegalP>
      </>
    ),
  },

  /* --------------------- 11 International Data Handling ------------------- */
  {
    id: "international-data",
    number: "11",
    title: "International Data Handling",
    tocLabel: "International Data",
    content: (
      <>
        <LegalP>
          Prosventa is built for teams that work across borders. The
          information we process may be stored and processed in countries
          other than your own — including countries where our infrastructure
          and service providers operate. Data protection rules vary between
          jurisdictions, and information may be subject to the laws of the
          countries where it is processed.
        </LegalP>
        <LegalP>
          We apply the protections described in this policy wherever
          information is handled. If you have questions about how information
          moves across borders in your workspace, contact us.
        </LegalP>
      </>
    ),
  },

  /* ------------------------- 12 Changes to This Policy -------------------- */
  {
    id: "changes",
    number: "12",
    title: "Changes to This Policy",
    tocLabel: "Changes",
    content: (
      <>
        <LegalP>
          We may update this Privacy Policy as Prosventa evolves or as legal
          requirements change. The Updated date at the top of this page shows
          when the current version took effect, and significant changes may
          also be highlighted within the product.
        </LegalP>
        <LegalP>
          By continuing to use Prosventa after an update takes effect, you
          accept the updated policy. If you disagree with a change, you can
          stop using the service and contact us about your account.
        </LegalP>
      </>
    ),
  },

  /* ------------------------------- 13 Contact ----------------------------- */
  {
    id: "contact",
    number: "13",
    title: "Contact",
    tocLabel: "Contact",
    content: (
      <>
        <LegalP>
          Questions about this policy, or about how Prosventa handles
          information? Get in touch:
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
 * RelatedLink now lives in the shared legal-page components so the Privacy
 * Policy and Terms of Service pages reuse one implementation.
 * -------------------------------------------------------------------------- */

export default function PrivacyPolicyPage() {
  return (
    <LegalPage
      eyebrow="Legal"
      title="Privacy Policy"
      description="How Prosventa handles information and protects user privacy."
      updated={UPDATED}
      sections={sections}
      footer={
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Related
          </p>
          <div className="mt-4 grid max-w-3xl gap-3 sm:grid-cols-2">
            <RelatedLink
              href="/security"
              title="Security"
              description="How Prosventa protects your data and accounts."
            />
            <RelatedLink
              href="/terms"
              title="Terms of Service"
              description="The rules that govern using Prosventa."
            />
          </div>
        </div>
      }
    />
  );
}

