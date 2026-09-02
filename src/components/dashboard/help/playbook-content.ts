// ============================================================================
// Prosventa Help Center — Playbooks
// ============================================================================
// Practical, step-by-step guides for accomplishing real tasks in Prosventa.
//
// Content rules:
// - Every step references functionality verified in the current codebase:
//   Prospects (manual add, search, filters, detail panel), Saved Lists,
//   Import Center (CSV/XLSX, preview, column mapping, duplicate handling),
//   Intelligence Command Center (summary, priorities, feed, recommendations),
//   Organization/Members, and Settings (workspace, ICP).
// - No fabricated features, no placeholders, no "coming soon".
// - Static content is intentional — no backend needed.
// ============================================================================

import type { HelpCategoryId } from "./help-content";

// ============================================================================
// Types
// ============================================================================

export type PlaybookDifficulty = "beginner" | "intermediate";

/** A relevant in-product destination the reader can act on from a step. */
export interface PlaybookStepAction {
  /** Short label, e.g. "Go to Prospects" */
  label: string;
  /** Internal dashboard href */
  href: string;
  /** Optional clarifying hint shown under the label */
  hint?: string;
}

export interface PlaybookStep {
  /** Step headline, e.g. "Open the Prospects page" */
  title: string;
  /** What the reader should actually do — one paragraph per entry */
  body: string[];
  /** Why this step matters — shown in a highlighted callout */
  why: string;
  /** Relevant Prosventa navigation/action reference */
  action?: PlaybookStepAction;
  /** Optional practical tips for this step */
  tips?: string[];
}

export interface Playbook {
  /** URL slug — served at /dashboard/help/[slug] alongside help articles */
  slug: string;
  title: string;
  description: string;
  category: HelpCategoryId;
  /** Estimated completion time in minutes */
  estimatedMinutes: number;
  difficulty: PlaybookDifficulty;
  steps: PlaybookStep[];
}

// ============================================================================
// Difficulty labels
// ============================================================================

export const PLAYBOOK_DIFFICULTY_LABELS: Record<PlaybookDifficulty, string> = {
  beginner: "Beginner",
  intermediate: "Intermediate",
};

// ============================================================================
// Playbooks
// ============================================================================

export const PLAYBOOKS: Playbook[] = [
  // -------------------------------------------------------------------------
  // 1. Find Your First Prospects
  // -------------------------------------------------------------------------
  {
    slug: "find-your-first-prospects",
    title: "Find Your First Prospects",
    description:
      "Add your first prospect records to Prosventa and learn what makes a good starting point.",
    category: "getting-started",
    estimatedMinutes: 10,
    difficulty: "beginner",
    steps: [
      {
        title: "Open the Prospects page",
        body: [
          "Select Prospects in the sidebar. This is your workspace's master table — every company you track lives here, along with their status, priority, scores, and owner.",
          "If your workspace is brand new, you'll see an empty state with an option to add your first prospect right away.",
        ],
        why: "Everything else in Prosventa — lists, intelligence, imports — builds on prospect records, so this is always the right place to start.",
        action: {
          label: "Go to Prospects",
          href: "/dashboard/prospects",
          hint: "Main sidebar → Prospects",
        },
      },
      {
        title: "Add a prospect manually",
        body: [
          "Select Add prospect to open the creation dialog. The company name is the only required field — everything else can wait.",
          "This is the fastest way to get a real record into your pipeline while you're learning the product.",
        ],
        why: "A record only needs a name to exist. You can always enrich it later, so don't let missing details stop you from capturing a good lead.",
        action: {
          label: "Open Prospects and add one",
          href: "/dashboard/prospects",
          hint: "Toolbar → Add prospect",
        },
      },
      {
        title: "Fill in what you know",
        body: [
          "In the dialog you can optionally add a website, contact name, email, and phone, plus industry, city, country, employee count, and a short description.",
          "Only fill in fields you're confident about — guessing creates noise in your data.",
        ],
        why: "Complete records power better filtering and give Intelligence more to work with when scoring fit and surfacing signals.",
      },
      {
        title: "Review the prospect record",
        body: [
          "After saving, find the prospect in the table and select its row to open the detail panel. Check the Overview tab: your fields are there, the status starts at New, and every change you make is tracked in the Activity tab.",
        ],
        why: "Reviewing right after capture catches typos early and shows you how the detail panel works — the place where most day-to-day work happens.",
      },
      {
        title: "Keep the momentum going",
        body: [
          "Repeat for a handful of companies you already have in mind, or bring a whole batch in at once from the Import page.",
          "Once you have a few records, the natural next moves are organizing them into a Saved List and opening Intelligence to see what stands out.",
        ],
        why: "Intelligence, lists, and recommendations all become useful the moment you have more than a couple of prospects to compare.",
        action: {
          label: "Continue with Intelligence",
          href: "/dashboard/intelligence",
          hint: "Next logical step after adding prospects",
        },
      },
    ],
  },

  // -------------------------------------------------------------------------
  // 2. Build a Targeted Prospect List
  // -------------------------------------------------------------------------
  {
    slug: "build-a-targeted-prospect-list",
    title: "Build a Targeted Prospect List",
    description:
      "Use search, filters, and sorting in the Prospects table to isolate exactly the companies you want to work.",
    category: "prospects",
    estimatedMinutes: 15,
    difficulty: "intermediate",
    steps: [
      {
        title: "Start with search",
        body: [
          "Open Prospects and type in the search box. It matches against company name, industry, location, and website, and updates the table as you type.",
          "Search is the quickest way to pull a known set of companies to the top before refining further.",
        ],
        why: "Starting broad with search and then narrowing gives you a feel for how much data you have before committing to specific filter criteria.",
        action: {
          label: "Go to Prospects",
          href: "/dashboard/prospects",
        },
      },
      {
        title: "Narrow with quick filters",
        body: [
          "Use the quick filters to slice by recency — records added or updated today, this week, or this month — or to show only your favorited prospects.",
          "These one-click filters are ideal for questions like \"what did we add this week?\" without opening the full filter panel.",
        ],
        why: "Recency filters keep fresh leads visible. New prospects decay fast, so working recent additions first usually pays off.",
      },
      {
        title: "Apply advanced filters",
        body: [
          "Open the filter panel for precise control: status, priority, source, lead score, AI fit score, revenue range, employee count, industry, country, tags, and owner.",
          "Combine two or three criteria — for example, High priority plus a specific industry — rather than stacking many at once.",
        ],
        why: "Targeting works best with a few sharp criteria. Over-filtering hides good prospects; under-filtering buries them.",
      },
      {
        title: "Sort and scan the results",
        body: [
          "Select any column header to sort ascending or descending — select again to flip the order. Use pagination to move through large result sets.",
          "Sorting by score or priority puts the strongest candidates at the top of the page.",
        ],
        why: "A sorted view turns a long table into a ranked shortlist, which is exactly what you need before reaching out.",
      },
      {
        title: "Save or share the view",
        body: [
          "Your search, filters, sort, and page are reflected in the URL. Bookmark it or paste the link to a teammate and they'll land on the exact same view.",
          "To work this group repeatedly, add its prospects to a Saved List — see the Organize Prospects into Lists playbook.",
        ],
        why: "A shareable view means the whole team qualifies and works the same target group instead of rebuilding filters from scratch.",
      },
    ],
  },

  // -------------------------------------------------------------------------
  // 3. Qualify Prospects
  // -------------------------------------------------------------------------
  {
    slug: "qualify-prospects",
    title: "Qualify Prospects",
    description:
      "Turn raw records into qualified opportunities using scores, signals, priorities, and pipeline status.",
    category: "prospects",
    estimatedMinutes: 15,
    difficulty: "intermediate",
    steps: [
      {
        title: "Open a prospect's detail panel",
        body: [
          "Go to Prospects and select a row. The slide-over panel shows everything about that company across five tabs: Overview, Activity, Notes, Lists, and Intelligence.",
        ],
        why: "Qualification decisions should happen in one place, with all the context about a prospect visible together.",
        action: {
          label: "Go to Prospects",
          href: "/dashboard/prospects",
        },
      },
      {
        title: "Check its intelligence",
        body: [
          "Switch to the Intelligence tab. You'll see the prospect's stored ICP score, any recorded signals, enrichment data, and recommendations based on recent activity.",
          "A high fit score combined with recent, high-confidence signals is the strongest qualification case you can have.",
        ],
        why: "Scores and signals turn gut feeling into evidence. Checking them first prevents you from chasing companies that look good on paper but show no buying context.",
      },
      {
        title: "Set a priority",
        body: [
          "In the Overview tab, set the priority: Low, Medium, High, or Urgent. Priorities are filterable and sortable across the whole table.",
        ],
        why: "Priority is how you encode your qualification judgment so it survives beyond today — for you and for teammates filtering the same table.",
      },
      {
        title: "Move the status forward",
        body: [
          "Change the status from New to Contacted once you've reached out, and to Qualified when the prospect passes your criteria. Further stages — Proposal Sent, Negotiation, Won, Lost — track the rest of the pipeline.",
          "Every status change is recorded in the Activity tab automatically.",
        ],
        why: "Status is the backbone of your pipeline. Keeping it honest makes forecasts, filters, and Intelligence summaries trustworthy.",
      },
      {
        title: "Document your reasoning",
        body: [
          "Open the Notes tab and write a short note on why this prospect qualified — the trigger event, the fit factors, the entry point.",
          "Notes stay on the record, appear in the timeline, and give anyone who picks this prospect up later the full story.",
        ],
        why: "A qualification without a written reason is hard to defend and impossible to hand off. Thirty seconds of note-taking saves hours of re-research.",
      },
    ],
  },

  // -------------------------------------------------------------------------
  // 4. Organize Prospects into Lists
  // -------------------------------------------------------------------------
  {
    slug: "organize-prospects-into-lists",
    title: "Organize Prospects into Lists",
    description:
      "Group prospects into reusable Saved Lists for campaigns, territories, or follow-up rounds.",
    category: "saved-lists",
    estimatedMinutes: 10,
    difficulty: "beginner",
    steps: [
      {
        title: "Create your first list",
        body: [
          "Go to Saved Lists in the sidebar and choose to create a new list. Give it a clear name — \"Q3 Manufacturing Outreach\" beats \"List 1\" — and an optional description explaining its purpose.",
        ],
        why: "Lists are shared across your workspace, so a descriptive name tells teammates what the group is for without asking.",
        action: {
          label: "Go to Saved Lists",
          href: "/dashboard/saved-lists",
        },
      },
      {
        title: "Open a prospect to add",
        body: [
          "Go to Prospects and select the row of a prospect that belongs in your new list. The detail panel opens with all of the prospect's context.",
        ],
        why: "Adding from the detail panel means you can review the prospect one more time before committing it to a list.",
        action: {
          label: "Go to Prospects",
          href: "/dashboard/prospects",
        },
      },
      {
        title: "Add it from the Lists tab",
        body: [
          "In the detail panel, switch to the Lists tab. You'll see all of your workspace's saved lists — toggle the ones this prospect belongs to. Repeat for each prospect.",
        ],
        why: "The Lists tab is the bridge between your master table and your curated groups, and a prospect can live in as many lists as make sense.",
      },
      {
        title: "Build out the list",
        body: [
          "Work through your targeted view — the one you built with search and filters — adding each qualifying prospect. The list page shows membership so you can watch it grow.",
        ],
        why: "A fully populated list converts a one-off filtered view into a durable asset you can reopen any time, even after the underlying filters would have changed.",
      },
      {
        title: "Maintain lists over time",
        body: [
          "From Saved Lists you can rename a list or update its description at any time. Deleting a list removes only the group — the prospects inside it stay untouched in your table.",
        ],
        why: "Lists are cheap to maintain and safe to clean up. Retiring stale lists keeps the workspace obvious for everyone.",
        action: {
          label: "Go to Saved Lists",
          href: "/dashboard/saved-lists",
        },
      },
    ],
  },

  // -------------------------------------------------------------------------
  // 5. Import Prospects from CSV
  // -------------------------------------------------------------------------
  {
    slug: "import-prospects-from-csv",
    title: "Import Prospects from CSV",
    description:
      "Bring an existing spreadsheet of companies into Prosventa with preview, column mapping, and duplicate control.",
    category: "import",
    estimatedMinutes: 20,
    difficulty: "intermediate",
    steps: [
      {
        title: "Prepare your file",
        body: [
          "Export or assemble your data as a CSV or Excel (.xlsx) file with one prospect per row and a header row naming each column — Company, Website, Industry, Country, and so on.",
          "Don't worry about perfect column names; you'll map them in a later step.",
        ],
        why: "A clean header row is what makes automatic column detection work, which saves you the most time during mapping.",
      },
      {
        title: "Upload it in the Import Center",
        body: [
          "Go to Import in the sidebar and upload your file. The Import Center accepts CSV and Excel files and parses them instantly.",
        ],
        why: "Bulk import is far faster than manual entry once you're past a handful of records — and it keeps the original data intact as your source of truth.",
        action: {
          label: "Go to Import",
          href: "/dashboard/import",
        },
      },
      {
        title: "Preview your data",
        body: [
          "Before anything is committed, the preview shows your parsed rows exactly as Prosventa read them. Scan for shifted columns, broken characters, or rows that shouldn't be there.",
        ],
        why: "Catching formatting problems here takes seconds; catching them after import means cleaning up real records.",
      },
      {
        title: "Map your columns",
        body: [
          "Map each column in your file to a Prosventa field. Common columns like company name, website, and country are matched automatically — verify the suggestions and adjust anything that's off.",
        ],
        why: "Mapping is what turns anonymous spreadsheet columns into structured, filterable prospect data.",
      },
      {
        title: "Choose duplicate handling",
        body: [
          "Decide what happens when an imported row matches an existing prospect: skip it, replace it, update it, or keep both. Skip is the safe default for a first import.",
        ],
        why: "Duplicate strategy protects the table you've already curated. Choosing deliberately avoids surprise duplicates or accidental overwrites.",
      },
      {
        title: "Run the import and review the summary",
        body: [
          "Start the import and follow the progress. When it finishes, the summary reports how many rows were imported, skipped, updated, or failed — and your run is recorded in Import History.",
          "Spot-check a few imported records in the Prospects table, then continue with qualifying or organizing them into lists.",
        ],
        why: "The summary closes the loop: it tells you whether the data landed the way you intended before you build anything on top of it.",
        action: {
          label: "Go to Prospects",
          href: "/dashboard/prospects",
          hint: "Verify imported records",
        },
      },
    ],
  },

  // -------------------------------------------------------------------------
  // 6. Use Prospect Intelligence
  // -------------------------------------------------------------------------
  {
    slug: "use-prospect-intelligence",
    title: "Use Prospect Intelligence",
    description:
      "Let the Intelligence Command Center tell you where to focus instead of scanning the whole table.",
    category: "intelligence",
    estimatedMinutes: 15,
    difficulty: "intermediate",
    steps: [
      {
        title: "Open the Command Center",
        body: [
          "Select Intelligence in the sidebar. The Command Center aggregates everything happening across your prospects into one operational view.",
        ],
        why: "The table answers \"what do we know?\" — Intelligence answers \"what should I do next?\", which is the question that actually costs you time.",
        action: {
          label: "Go to Intelligence",
          href: "/dashboard/intelligence",
        },
      },
      {
        title: "Read the summary first",
        body: [
          "The Summary section shows prospect counts, how many are high-fit, recent signals, and pending recommendations. It's the fastest read on the overall shape of your pipeline.",
        ],
        why: "Thirty seconds on the summary calibrates the rest of your session — whether to hunt for new prospects or work the ones you have.",
      },
      {
        title: "Work through priority prospects",
        body: [
          "The Priority Prospects section names who to reach out to next, with the reasons why each one surfaced. Open any of them to jump straight into that prospect's detail panel.",
        ],
        why: "Priorities come from scores and signals combined — they're a defensible shortlist, not a random pick.",
      },
      {
        title: "Check recommended actions",
        body: [
          "Recommended Actions suggests concrete next steps based on recent signals — for example following up on a prospect whose score changed. Clear items as you handle them.",
        ],
        why: "Recommendations convert passive data into a queue. Working them keeps signal response time short, which is where timing-sensitive deals are won.",
      },
      {
        title: "Drill into a single prospect",
        body: [
          "From anywhere in the Command Center, open a prospect to see its individual Intelligence tab: stored score, signals, enrichment, and research in one place.",
          "Use what you find to set priority, update status, or add the prospect to a list — the actions from the Qualify Prospects playbook.",
        ],
        why: "The loop closes when intelligence leads to a recorded action. That's what makes tomorrow's intelligence sharper than today's.",
      },
    ],
  },

  // -------------------------------------------------------------------------
  // 7. Review Prospect Signals
  // -------------------------------------------------------------------------
  {
    slug: "review-prospect-signals",
    title: "Review Prospect Signals",
    description:
      "Read the intelligence feed, understand signal confidence and importance, and act on what matters.",
    category: "intelligence",
    estimatedMinutes: 12,
    difficulty: "intermediate",
    steps: [
      {
        title: "Understand what a signal is",
        body: [
          "A signal is an observed event with evidence — not a guarantee of intent. Each one carries a confidence level (high, medium, low) and an importance rating (critical, high, medium, low).",
          "Treat high-confidence, high-importance signals as worth acting on; treat the rest as background context.",
        ],
        why: "Knowing how to weigh signals is the difference between reacting to noise and responding to genuine buying context.",
      },
      {
        title: "Open the intelligence feed",
        body: [
          "In the Intelligence Command Center, find the Intelligence Feed — a running timeline of signals, score changes, and activity across your workspace.",
        ],
        why: "The feed is ordered by recency, which mirrors how opportunity works: the freshest events are usually the most actionable.",
        action: {
          label: "Go to Intelligence",
          href: "/dashboard/intelligence",
        },
      },
      {
        title: "Learn the signal categories",
        body: [
          "Signals fall into recognizable groups: company events like funding, hiring, leadership changes, expansions, and product announcements; professional changes like job or role moves; and Prosventa activity like imports, enrichment runs, and score changes.",
          "Company and professional events describe the market; Prosventa activity describes your own data health.",
        ],
        why: "Recognizing categories lets you skim the feed fast — pausing only for the event types that historically matter to your sales cycle.",
      },
      {
        title: "Open the prospect behind a strong signal",
        body: [
          "When a signal looks significant, open its prospect. The detail panel's Intelligence tab shows that signal alongside the prospect's full history — other signals, score movement, and enrichment data.",
        ],
        why: "One signal is a hint; a cluster of signals on one prospect is a pattern. Context is what upgrades a hint into a reason to reach out.",
      },
      {
        title: "Turn the signal into an action",
        body: [
          "Act while the signal is fresh: raise the prospect's priority, move its status forward, add a note recording what you saw, or drop it into a follow-up list.",
          "If the signal turned out to be weak, say so in a note too — future-you shouldn't re-litigate the same event.",
        ],
        why: "An unacted-on signal has a shelf life. Recording the decision either way keeps the workspace's history honest and reusable.",
      },
    ],
  },

  // -------------------------------------------------------------------------
  // 8. Manage Your Workspace
  // -------------------------------------------------------------------------
  {
    slug: "manage-your-workspace",
    title: "Manage Your Workspace",
    description:
      "Set up your organization, invite teammates, and configure the workspace settings that shape everyone's experience.",
    category: "workspace",
    estimatedMinutes: 8,
    difficulty: "beginner",
    steps: [
      {
        title: "Set up your organization profile",
        body: [
          "Go to Organization in the sidebar. This page is home base for your workspace — your company profile and workspace details live here.",
        ],
        why: "The organization profile anchors the workspace identity that every member sees.",
        action: {
          label: "Go to Organization",
          href: "/dashboard/settings?section=workspace",
        },
      },
      {
        title: "Invite your team",
        body: [
          "Open Organization and use Manage members (or Invite member). Enter their email address — they receive an invitation and appear in the member list once they accept.",
        ],
        why: "Prospecting compounds when it's shared: lists, notes, and statuses are visible workspace-wide, so teammates build on each other's work.",
        action: {
          label: "Go to Organization",
          href: "/dashboard/settings?section=workspace",
        },
      },
      {
        title: "Understand roles",
        body: [
          "Each member has a role that controls what they can do. Sensitive operations — managing members or changing workspace settings — are limited to certain roles.",
          "Check the member list to see who holds which role before delegating admin tasks.",
        ],
        why: "Roles keep everyday prospecting open to everyone while protecting workspace-wide configuration from accidental changes.",
      },
      {
        title: "Configure workspace settings",
        body: [
          "Open Settings and review the Workspace section — your organization's name and details. Profile, appearance, notifications, and accessibility options apply to your own account.",
        ],
        why: "Knowing which settings are personal versus workspace-wide prevents confusion when a change affects teammates unexpectedly.",
        action: {
          label: "Go to Settings",
          href: "/dashboard/settings?section=workspace",
        },
      },
      {
        title: "Define your Ideal Customer Profile",
        body: [
          "In Settings, open Ideal Customer Profile and set the criteria that describe a great-fit company for your business.",
          "Prosventa scores prospects against this profile, and those scores drive which prospects Intelligence flags as high-fit and prioritizes.",
        ],
        why: "The ICP is the tuning knob for the entire scoring system — a well-set profile makes every score, priority, and recommendation more accurate.",
        action: {
          label: "Go to Settings",
          href: "/dashboard/settings?section=icp",
          hint: "Organization → Ideal Customer Profile",
        },
      },
    ],
  },
];

// ============================================================================
// Helpers
// ============================================================================

export function getPlaybookBySlug(slug: string): Playbook | undefined {
  return PLAYBOOKS.find((playbook) => playbook.slug === slug);
}

/** Full searchable text for a playbook: title, description, and all step content. */
export function playbookSearchText(playbook: Playbook): string {
  const stepText = playbook.steps
    .map(
      (step) =>
        `${step.title} ${step.body.join(" ")} ${step.why} ${
          step.tips ? step.tips.join(" ") : ""
        } ${step.action?.label ?? ""} ${step.action?.hint ?? ""}`
    )
    .join(" ");
  return `${playbook.title} ${playbook.description} ${stepText}`.toLowerCase();
}