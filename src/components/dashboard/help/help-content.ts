// ============================================================================
// Prosventa Help Center — Static Content
// ============================================================================
// Single source of truth for Help Center articles and FAQs.
//
// Content rules:
// - Only document features that actually exist in the current product
//   (Dashboard, Intelligence, Prospects, Saved Lists, Import, Organization,
//   Members, Settings).
// - No fabricated release notes, no legacy features (automation builder,
//   discovery search, billing plans, analytics).
// - Static content is intentional for Help Center Phase 1 — no backend needed.
// ============================================================================

// ============================================================================
// Types
// ============================================================================

export type HelpCategoryId =
  | "getting-started"
  | "prospects"
  | "saved-lists"
  | "import"
  | "intelligence"
  | "workspace"
  | "settings";

export type HelpContentBlock =
  | { type: "paragraph"; text: string }
  | { type: "heading"; text: string }
  | { type: "list"; items: string[] }
  | { type: "steps"; items: string[] }
  | { type: "tip"; text: string };

export interface HelpArticle {
  /** URL slug — the article is served at /dashboard/help/[slug] */
  slug: string;
  title: string;
  description: string;
  category: HelpCategoryId;
  readTime: string;
  content: HelpContentBlock[];
  /** Slugs of related help articles, surfaced as cross-links at the bottom of the article. */
  relatedArticles?: string[];
  /** Slugs of related playbooks, surfaced as cross-links at the bottom of the article. */
  relatedPlaybooks?: string[];
}

export interface HelpFaq {
  question: string;
  answer: string;
  /** Category the FAQ belongs to, used for grouping on the Help Center. */
  category: HelpCategoryId;
  /** Slug of a related article, shown as a "read more" link */
  relatedArticleSlug?: string;
}

// ============================================================================
// Categories
// ============================================================================

export const HELP_CATEGORY_LABELS: Record<HelpCategoryId, string> = {
  "getting-started": "Getting Started",
  prospects: "Prospects",
  "saved-lists": "Saved Lists",
  import: "Import",
  intelligence: "Intelligence",
  workspace: "Workspace",
  settings: "Settings",
};

// ============================================================================
// Articles
// ============================================================================

export const ARTICLES: HelpArticle[] = [
  {
    slug: "getting-started",
    relatedArticles: ["add-prospect", "intelligence-overview", "saved-lists", "import-csv"],
    relatedPlaybooks: ["find-your-first-prospects", "manage-your-workspace"],
    title: "Getting started with Prosventa",
    description:
      "A quick tour of the main areas of Prosventa and what to do first.",
    category: "getting-started",
    readTime: "4 min",
    content: [
      {
        type: "paragraph",
        text: "Prosventa is a workspace for building and understanding your pipeline. You add prospects, organize them into lists, and use Intelligence to see which ones deserve your attention.",
      },
      { type: "heading", text: "The main areas" },
      {
        type: "list",
        items: [
          "Dashboard — your daily overview of the workspace.",
          "Intelligence — signals, scores, and recommended actions for your prospects.",
          "Prospects — the full table of every prospect, with search, filters, and detail views.",
          "Saved Lists — curated groups of prospects for campaigns, territories, or follow-ups.",
          "Import — bring in existing prospects from a CSV file.",
          "Organization and Members — manage your workspace and invite teammates.",
          "Settings — your profile, workspace preferences, and account options.",
        ],
      },
      { type: "heading", text: "Suggested first steps" },
      {
        type: "steps",
        items: [
          "Add a few prospects manually from the Prospects page, or import a CSV file.",
          "Open Intelligence to see scores, signals, and recommended actions.",
          "Create a Saved List to group the prospects you want to work first.",
          "Invite teammates from Organization → Members if you work as a team.",
        ],
      },
    ],
  },
  {
    slug: "add-prospect",
    relatedArticles: ["import-csv", "prospect-table", "edit-prospect"],
    relatedPlaybooks: ["find-your-first-prospects", "build-a-targeted-prospect-list"],
    title: "Adding a prospect manually",
    description:
      "Create a prospect record by hand from the Prospects page.",
    category: "prospects",
    readTime: "2 min",
    content: [
      {
        type: "paragraph",
        text: "If a prospect is not in your imported data yet, you can add it manually in seconds.",
      },
      { type: "heading", text: "Steps" },
      {
        type: "steps",
        items: [
          "Go to Prospects from the sidebar.",
          "Select Add prospect.",
          "Fill in the company name — this is the only required field.",
          "Optionally add a website, contact details, industry, location, employee count, and a short description.",
          "Save the prospect. It appears immediately in your table.",
        ],
      },
      {
        type: "paragraph",
        text: "New prospects start in the New status so you can track them through your pipeline from day one.",
      },
    ],
  },
  {
    slug: "edit-prospect",
    relatedArticles: ["add-prospect", "prospect-table", "signals-and-scores"],
    relatedPlaybooks: ["qualify-prospects", "review-prospect-signals"],
    title: "Editing and updating prospects",
    description:
      "Keep prospect records up to date from the detail panel.",
    category: "prospects",
    readTime: "3 min",
    content: [
      {
        type: "paragraph",
        text: "Every prospect has a detail panel where you can update its information and move it through your pipeline.",
      },
      { type: "heading", text: "Open a prospect" },
      {
        type: "steps",
        items: [
          "Go to Prospects and find the prospect — search or filter if needed.",
          "Select the prospect row to open its detail panel.",
        ],
      },
      { type: "heading", text: "What you can update" },
      {
        type: "list",
        items: [
          "Company and contact details, industry, and location.",
          "Status — New, Contacted, Qualified, Proposal sent, Negotiation, Won, or Lost.",
          "Priority — Low, Medium, High, or Urgent.",
          "Favorite the prospect and add tags for quick filtering.",
        ],
      },
      {
        type: "paragraph",
        text: "Changes save immediately and are reflected across Prospects, Saved Lists, and Intelligence.",
      },
    ],
  },
  {
    slug: "prospect-table",
    relatedArticles: ["add-prospect", "edit-prospect", "saved-lists"],
    relatedPlaybooks: ["build-a-targeted-prospect-list", "organize-prospects-into-lists"],
    title: "Using the prospect table",
    description:
      "Search, filter, sort, and page through all of your prospects.",
    category: "prospects",
    readTime: "3 min",
    content: [
      {
        type: "paragraph",
        text: "The Prospects table is where you work with every record in your workspace.",
      },
      { type: "heading", text: "Find prospects fast" },
      {
        type: "list",
        items: [
          "Search across company name, industry, location, and website.",
          "Quick filters for records added or updated today, this week, or this month.",
          "Advanced filters for status, priority, source, scores, revenue, employee count, tags, and owner.",
        ],
      },
      { type: "heading", text: "Stay organized" },
      {
        type: "list",
        items: [
          "Sort any column — select a column header to sort ascending or descending.",
          "Favorite prospects to keep the important ones close.",
          "Use pagination to move through large tables.",
        ],
      },
      {
        type: "paragraph",
        text: "Your filters and page are reflected in the URL, so you can bookmark or share a specific view with teammates.",
      },
    ],
  },
  {
    slug: "saved-lists",
    relatedArticles: ["prospect-table", "add-prospect"],
    relatedPlaybooks: ["organize-prospects-into-lists"],
    title: "Organizing prospects with Saved Lists",
    description:
      "Group prospects into lists for campaigns, territories, or follow-ups.",
    category: "saved-lists",
    readTime: "2 min",
    content: [
      {
        type: "paragraph",
        text: "Saved Lists let you group prospects however you work — by campaign, region, industry, or priority.",
      },
      { type: "heading", text: "Create a list" },
      {
        type: "steps",
        items: [
          "Go to Saved Lists from the sidebar.",
          "Select the option to create a new list.",
          "Give it a name and an optional description.",
        ],
      },
      { type: "heading", text: "Work with lists" },
      {
        type: "list",
        items: [
          "Add prospects to a list from the Prospects page.",
          "Rename a list or update its description at any time.",
          "Delete lists you no longer need — the prospects in them are not deleted, only the list.",
        ],
      },
      {
        type: "paragraph",
        text: "Lists belong to your workspace, so everyone on your team sees the same groups.",
      },
      {
        type: "tip",
        text: "Deleting a list never deletes the prospects inside it — only the grouping is removed.",
      },
    ],
  },
  {
    slug: "import-csv",
    relatedArticles: ["add-prospect", "prospect-table", "intelligence-overview"],
    relatedPlaybooks: ["import-prospects-from-csv"],
    title: "Importing prospects from a CSV file",
    description:
      "Bring your existing prospect data into Prosventa in a few steps.",
    category: "import",
    readTime: "3 min",
    content: [
      {
        type: "paragraph",
        text: "The Import page turns a CSV file into prospect records — with a preview and column mapping so you stay in control.",
      },
      { type: "heading", text: "How it works" },
      {
        type: "steps",
        items: [
          "Go to Import and upload a CSV file.",
          "Preview your data to confirm everything looks right.",
          "Map your columns to Prosventa fields — common columns are matched automatically.",
          "Choose how duplicates should be handled: skip, replace, update, or keep both.",
          "Start the import and follow the progress.",
          "Review the summary when the import finishes.",
        ],
      },
      { type: "heading", text: "Good to know" },
      {
        type: "list",
        items: [
          "Your recent imports are listed in Import History.",
          "You can start another import right after one finishes.",
        ],
      },
      {
        type: "tip",
        text: "Keep company names and website formats consistent in your file — it makes duplicate detection more accurate during import.",
      },
    ],
  },
  {
    slug: "intelligence-overview",
    relatedArticles: ["signals-and-scores", "settings"],
    relatedPlaybooks: ["use-prospect-intelligence", "review-prospect-signals"],
    title: "What is Intelligence?",
    description:
      "The Command Center that turns your prospect data into priorities.",
    category: "intelligence",
    readTime: "3 min",
    content: [
      {
        type: "paragraph",
        text: "Intelligence is Prosventa's Command Center. Instead of scanning your whole table, it surfaces what deserves attention right now.",
      },
      { type: "heading", text: "What you'll see" },
      {
        type: "list",
        items: [
          "Summary — prospect counts, high-fit prospects, recent signals, and pending recommendations.",
          "Priority prospects — who to reach out to next, with the reasons why.",
          "Intelligence feed — a timeline of signals, score changes, and activity.",
          "Recommended actions — suggested next steps based on recent signals.",
          "Workflow activity — recent intelligence runs in your workspace.",
          "Health — data gaps like missing job titles, missing industries, or stale enrichment.",
        ],
      },
      {
        type: "paragraph",
        text: "Intelligence updates as your prospects change — import, enrich, and score data to get the most from it.",
      },
    ],
  },
  {
    slug: "signals-and-scores",
    relatedArticles: ["intelligence-overview", "settings"],
    relatedPlaybooks: ["review-prospect-signals", "use-prospect-intelligence"],
    title: "Understanding signals and ICP scores",
    description:
      "How Prosventa interprets events and rates prospect fit.",
    category: "intelligence",
    readTime: "4 min",
    content: [
      { type: "heading", text: "Signals" },
      {
        type: "paragraph",
        text: "A signal is an observed event with evidence — not a guarantee that a prospect wants to buy. Signals are grouped into categories such as external events, professional changes, company changes, and Prosventa activity.",
      },
      {
        type: "list",
        items: [
          "Company events — growth, hiring activity, leadership changes, funding, expansions, new locations, and product announcements.",
          "Prospect events — job changes, role changes, and profile updates.",
          "Prosventa activity — imports, enrichment, research, score changes, and saves.",
        ],
      },
      {
        type: "paragraph",
        text: "Each signal carries a confidence level (high, medium, or low) and an importance (critical, high, medium, or low) so you can judge how much weight to give it.",
      },
      { type: "heading", text: "ICP scores" },
      {
        type: "paragraph",
        text: "Prospects are scored against your Ideal Customer Profile. You can configure your ICP in Settings, and those scores help Intelligence decide which prospects are high-fit and worth prioritizing.",
      },
    ],
  },
  {
    slug: "organization-members",
    relatedArticles: ["settings"],
    relatedPlaybooks: ["manage-your-workspace"],
    title: "Managing your organization and members",
    description:
      "Set up your workspace and invite your team.",
    category: "workspace",
    readTime: "2 min",
    content: [
      { type: "heading", text: "Organization" },
      {
        type: "paragraph",
        text: "The Organization page is home base for your workspace — your company profile and workspace details live here.",
      },
      { type: "heading", text: "Members" },
      {
        type: "steps",
        items: [
          "Go to Organization → Members.",
          "Select Invite member and enter their email address.",
          "They receive an invitation and appear in the member list once they accept.",
        ],
      },
      {
        type: "paragraph",
        text: "Roles control what each member can do — for example, managing members or changing workspace settings is limited to certain roles.",
      },
    ],
  },
  {
    slug: "settings",
    relatedArticles: ["organization-members", "intelligence-overview"],
    relatedPlaybooks: ["manage-your-workspace", "use-prospect-intelligence"],
    title: "Configuring your settings",
    description:
      "Where to find profile, workspace, appearance, and account options.",
    category: "settings",
    readTime: "2 min",
    content: [
      {
        type: "paragraph",
        text: "Everything about your account and workspace preferences lives in Settings.",
      },
      {
        type: "list",
        items: [
          "Profile — your name, role, and avatar.",
          "Security — password and sign-in options.",
          "Workspace — your organization's name and details.",
          "Ideal Customer Profile — the criteria used to score prospects.",
          "Notifications — how Prosventa keeps you informed.",
          "Accessibility — motion and display preferences.",
          "About and Support — product information and ways to reach us.",
        ],
      },
      {
        type: "paragraph",
        text: "Profile options apply to your account; workspace-level options affect everyone in your organization.",
      },
    ],
  },
];

// ============================================================================
// FAQs
// ============================================================================

export const FAQS: HelpFaq[] = [
  {
    question: "What does Prosventa do?",
    answer:
      "Prosventa is a workspace for building and understanding your pipeline. You add prospects, organize them into Saved Lists, import data from CSV files, and use Intelligence to see which prospects deserve your attention and why.",
    category: "getting-started",
    relatedArticleSlug: "getting-started",
  },
  {
    question: "How do I get started with Prosventa?",
    answer:
      "A good first week: add a few prospects manually from the Prospects page (or import a CSV from the Import page), open Intelligence to see scores and signals, group the people you want to work on first into a Saved List, and invite teammates from Organization → Members if you work as a team.",
    category: "getting-started",
    relatedArticleSlug: "getting-started",
  },
  {
    question: "How do I add a prospect?",
    answer:
      "Open the Prospects page and select Add prospect. The company name is the only required field — website, contact details, industry, location, employee count, and description are all optional. You can also bring prospects in bulk from the Import page.",
    category: "prospects",
    relatedArticleSlug: "add-prospect",
  },
  {
    question: "How do I edit a prospect?",
    answer:
      "Find the prospect in the Prospects table and select its row to open the detail panel. From there you can update company and contact details, change the status and priority, favorite it, and add tags. Changes save immediately.",
    category: "prospects",
    relatedArticleSlug: "edit-prospect",
  },
  {
    question: "How do I find prospects in the table?",
    answer:
      "The Prospects table lets you search across company name, industry, location, and website; apply quick and advanced filters (status, priority, source, scores, revenue, employee count, tags, and owner); sort any column; and page through large tables. Your filters and page are kept in the URL, so you can share a specific view with teammates.",
    category: "prospects",
    relatedArticleSlug: "prospect-table",
  },
  {
    question: "How do Saved Lists work?",
    answer:
      "Saved Lists are named groups of prospects — for a campaign, territory, or follow-up round. Create a list from the Saved Lists page, add prospects to it from the Prospects page, and rename or delete lists at any time. Deleting a list never deletes the prospects in it.",
    category: "saved-lists",
    relatedArticleSlug: "saved-lists",
  },
  {
    question: "How do I create a Saved List and add prospects to it?",
    answer:
      "Create a list from the Saved Lists page and give it a name and an optional description. Then, from the Prospects page, add the prospects you want into that list. You can rename or delete lists at any time — deleting a list never deletes the prospects inside it.",
    category: "saved-lists",
    relatedArticleSlug: "saved-lists",
  },
  {
    question: "How do I import prospects?",
    answer:
      "Go to the Import page and upload a CSV file. You'll preview the data, map your columns to Prosventa fields (common columns are matched automatically), choose how duplicates are handled, and start the import. A summary shows what was imported when it finishes.",
    category: "import",
    relatedArticleSlug: "import-csv",
  },
  {
    question: "What is Intelligence?",
    answer:
      "Intelligence is the Command Center that surfaces what needs attention: a summary of your pipeline, priority prospects with reasons, a feed of signals and score changes, recommended actions, and data-health checks.",
    category: "intelligence",
    relatedArticleSlug: "intelligence-overview",
  },
  {
    question: "What are Signals?",
    answer:
      "Signals are observed events with evidence — like a funding round, hiring activity, a leadership change, or a contact changing jobs. Each signal has a confidence level and an importance rating so you can judge how relevant it is. Signals feed Intelligence's priorities and recommendations.",
    category: "intelligence",
    relatedArticleSlug: "signals-and-scores",
  },
  {
    question: "How can I improve prospect scores and Intelligence?",
    answer:
      "Scores are based on how well each prospect matches your Ideal Customer Profile, which you configure in Settings. Keeping your data fresh — importing updates, enriching records, and scoring again — helps Intelligence produce more accurate signals, priorities, and recommendations.",
    category: "intelligence",
    relatedArticleSlug: "signals-and-scores",
  },
  {
    question: "How do I manage workspace members?",
    answer:
      "Go to Organization → Members to see everyone in your workspace. Select Invite member to send an invitation by email. Roles control what each person can do, such as managing members or workspace settings.",
    category: "workspace",
    relatedArticleSlug: "organization-members",
  },
  {
    question: "What roles can members have?",
    answer:
      "Members are invited from Organization → Members. Each member has a role that controls what they can do; sensitive operations such as managing members or changing workspace settings are limited to certain roles. Check the member list to see who holds which role.",
    category: "workspace",
    relatedArticleSlug: "organization-members",
  },
  {
    question: "Where can I change my settings?",
    answer:
      "Open Settings from the sidebar. Your profile, security options, workspace details, Ideal Customer Profile, appearance, notifications, and accessibility preferences are all there.",
    category: "settings",
    relatedArticleSlug: "settings",
  },
  {
    question: "How do I set up my Ideal Customer Profile (ICP)?",
    answer:
      "Open Settings and find Ideal Customer Profile, then set the criteria that describe a great-fit company for your business. Prosventa scores prospects against this profile, and those scores drive which prospects Intelligence flags as high-fit and prioritizes.",
    category: "settings",
    relatedArticleSlug: "settings",
  },
];

// ============================================================================
// Helpers
// ============================================================================

export function getArticleBySlug(slug: string): HelpArticle | undefined {
  return ARTICLES.find((article) => article.slug === slug);
}

/** Full searchable text for an article: title, description, and all content. */
export function articleSearchText(article: HelpArticle): string {
  const contentText = article.content
    .map((block) => {
      switch (block.type) {
        case "paragraph":
        case "heading":
        case "tip":
          return block.text;
        case "list":
        case "steps":
          return block.items.join(" ");
      }
    })
    .join(" ");
  return `${article.title} ${article.description} ${contentText}`.toLowerCase();
}

/** Full searchable text for a FAQ: its question and answer. */
export function faqSearchText(faq: HelpFaq): string {
  return `${faq.question} ${faq.answer}`.toLowerCase();
}