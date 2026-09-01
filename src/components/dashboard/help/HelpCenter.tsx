"use client";

// ============================================================================
// Prosventa Help Center — Homepage
// ============================================================================
// One lightweight page that replaces the earlier tabbed view. It surfaces the
// real Help content in a compact, intentional hierarchy:
//
//   Help Center → Search → Playbooks → Help articles → FAQs → Contact support
//
// Search filters every playbook, article, and FAQ on the page. The component
// is client-side only because search and the FAQ accordion hold local state;
// all content is static in-memory (no backend queries).
//
// Performance & accessibility notes:
// - Animations use transform + opacity with the shared EASE_OUT token and are
//   neutralized under the user's reduced-motion preference.
// - Keyboard focus relies on the global focus-visible outline.
// - The FAQ accordion is a native disclosure pattern (button + region).
// - Every visible control either navigates to real content or is plainly
//   informational. The old "Release Notes" placeholder tab is removed.
// ============================================================================

import { useMemo, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion, type Transition } from "framer-motion";
import { Badge } from "@/components/ui/Badge";
import { EASE_OUT } from "@/lib/motion";
import {
  ARTICLES,
  FAQS,
  HELP_CATEGORY_LABELS,
  articleSearchText,
  faqSearchText,
  type HelpArticle,
  type HelpCategoryId,
  type HelpFaq,
} from "./help-content";
import {
  PLAYBOOKS,
  PLAYBOOK_DIFFICULTY_LABELS,
  playbookSearchText,
  type Playbook,
} from "./playbook-content";
import { PlaybookArtwork } from "./PlaybookArtwork";
import {
  ArrowRightIcon,
  ChevronDownIcon,
  HelpCategoryIcon,
  SearchGlyphIcon,
} from "./help-icons";

// ============================================================================
// FAQ grouping (ordered so related categories sit together)
// ============================================================================

const FAQ_CATEGORY_ORDER: HelpCategoryId[] = [
  "getting-started",
  "prospects",
  "saved-lists",
  "import",
  "intelligence",
  "workspace",
  "settings",
];

function buildFaqGroups(): Array<{ category: HelpCategoryId; faqs: HelpFaq[] }> {
  return FAQ_CATEGORY_ORDER.map((category) => ({
    category,
    faqs: FAQS.filter((faq) => faq.category === category),
  })).filter((group) => group.faqs.length > 0);
}

// ============================================================================
// Search highlight
// ============================================================================
// Wraps every case-insensitive occurrence of the query in <mark>. The matched
// fragment keeps the surrounding text so it reads naturally for screen readers.
// ============================================================================

function Highlight({ text, query }: { text: string; query: string }) {
  if (!query) return <>{text}</>;
  const lower = text.toLowerCase();
  const needle = query.toLowerCase();
  const parts: React.ReactNode[] = [];
  let cursor = 0;
  let key = 0;
  while (true) {
    const match = lower.indexOf(needle, cursor);
    if (match === -1) {
      if (cursor < text.length) parts.push(<span key={key++}>{text.slice(cursor)}</span>);
      break;
    }
    if (match > cursor) parts.push(<span key={key++}>{text.slice(cursor, match)}</span>);
    parts.push(
      <mark key={key++} className="rounded-sm bg-brand-100 px-0.5 text-slate-900">
        {text.slice(match, match + needle.length)}
      </mark>
    );
    cursor = match + needle.length;
  }
  return <>{parts}</>;
}

// ============================================================================
// Section heading (icon + title + optional description)
// ============================================================================

function SectionHeading({
  icon,
  title,
  description,
  id,
}: {
  icon: React.ReactNode;
  title: string;
  description?: string;
  id: string;
}) {
  return (
    <div>
      <h2
        id={id}
        className="flex items-center gap-2 text-base font-bold tracking-tight text-slate-900"
      >
        <span className="flex h-6 w-6 items-center justify-center rounded-md bg-blue-50 text-blue-600">
          {icon}
        </span>
        {title}
      </h2>
      {description && (
        <p className="mt-1 text-[13px] text-slate-500 leading-relaxed">{description}</p>
      )}
    </div>
  );
}

export function HelpCenter() {
  const reduceMotion = useReducedMotion() ?? false;
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<"all" | HelpCategoryId>("all");
  const [openFaq, setOpenFaq] = useState<string | null>(null);

  const query = search.trim();
  const queryLower = query.toLowerCase();
  const isSearching = queryLower !== "";

  const filteredArticles = useMemo(() => {
    return ARTICLES.filter((article) => {
      const matchesCategory =
        activeCategory === "all" || article.category === activeCategory;
      const matchesSearch =
        !isSearching || articleSearchText(article).includes(queryLower);
      return matchesCategory && matchesSearch;
    });
  }, [activeCategory, isSearching, queryLower]);

  const searchedPlaybooks = useMemo(() => {
    return isSearching
      ? PLAYBOOKS.filter((playbook) => playbookSearchText(playbook).includes(queryLower))
      : [];
  }, [isSearching, queryLower]);

  const searchedFaqs = useMemo(() => {
    return isSearching
      ? FAQS.filter((faq) => faqSearchText(faq).includes(queryLower))
      : [];
  }, [isSearching, queryLower]);

  const categories: ("all" | HelpCategoryId)[] = [
    "all",
    ...Array.from(new Set(ARTICLES.map((article) => article.category))),
  ];

  const faqGroups = buildFaqGroups();
  const hasAnyResults =
    searchedPlaybooks.length + filteredArticles.length + searchedFaqs.length > 0;

  function clearSearch() {
    setSearch("");
    setActiveCategory("all");
  }

  function handleSearchKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape" && search) {
      event.stopPropagation();
      clearSearch();
    }
  }

  const transition = { duration: reduceMotion ? 0 : 0.2, ease: EASE_OUT };

  return (
    <div className="space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: reduceMotion ? 0 : 0.25, ease: EASE_OUT }}
      >
        <h1 className="text-2xl sm:text-[28px] font-bold tracking-tight text-slate-900 leading-tight">
          Help Center
        </h1>
        <p className="mt-1.5 max-w-2xl text-sm text-slate-500 leading-relaxed">
          Guided playbooks, articles, and answers that help you understand Prosventa — from
          finding and importing prospects to organizing them with Saved Lists and using
          Intelligence to focus on the right opportunities.
        </p>
      </motion.div>

      {/* Search */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: reduceMotion ? 0 : 0.22, ease: EASE_OUT, delay: 0.03 }}
        className="relative"
      >
        <label htmlFor="help-search" className="sr-only">
          Search playbooks, articles, and FAQs
        </label>
        <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400">
          <SearchGlyphIcon />
        </span>
        <input
          id="help-search"
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={handleSearchKeyDown}
          placeholder="Search playbooks, articles, and FAQs…"
          autoComplete="off"
          role="searchbox"
          className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-10 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 transition-colors duration-150 hover:border-slate-300 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/25"
        />
        {search !== "" && (
          <button
            type="button"
            onClick={clearSearch}
            aria-label="Clear search"
            className="absolute right-2.5 top-1/2 -translate-y-1/2 inline-flex items-center justify-center rounded-md p-1.5 text-slate-400 transition-colors duration-150 hover:bg-slate-100 hover:text-slate-600"
          >
            <svg
              className="w-4 h-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        )}
      </motion.div>

      {/* Content */}
      {isSearching ? (
        <SearchResults
          query={query}
          playbooks={searchedPlaybooks}
          articles={filteredArticles}
          faqs={searchedFaqs}
          empty={!hasAnyResults}
          onClear={clearSearch}
          transition={transition}
          reduceMotion={reduceMotion}
        />
      ) : (
        <div className="space-y-10">
          <PlaybooksSection reduceMotion={reduceMotion} />
          <ArticlesSection
            categories={categories}
            activeCategory={activeCategory}
            onSelectCategory={setActiveCategory}
            reduceMotion={reduceMotion}
          />
          <FaqSection
            groups={faqGroups}
            openFaq={openFaq}
            onToggle={setOpenFaq}
            reduceMotion={reduceMotion}
          />
          <SupportSection />
        </div>
      )}
    </div>
  );
}

function PlaybooksSection({ reduceMotion }: { reduceMotion: boolean }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: reduceMotion ? 0 : 0.2,
        ease: EASE_OUT,
        delay: reduceMotion ? 0 : 0.03,
      }}
      aria-labelledby="help-playbooks-heading"
    >
      <SectionHeading
        id="help-playbooks-heading"
        title="Playbooks"
        description="Guided, step-by-step walks through real tasks. Mark steps complete as you go — your progress is saved per playbook."
        icon={
          <svg
            className="w-4 h-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
          </svg>
        }
      />
      <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {PLAYBOOKS.map((playbook) => (
          <PlaybookCard key={playbook.slug} playbook={playbook} />
        ))}
      </div>
    </motion.section>
  );
}

function ArticleCard({ article }: { article: HelpArticle }) {
  return (
    <Link
      href={`/dashboard/help/${article.slug}`}
      className="group block rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-150 hover:border-blue-200 hover:shadow-md"
    >
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-50 text-slate-500 transition-colors duration-150 group-hover:bg-blue-50 group-hover:text-blue-600">
          <HelpCategoryIcon category={article.category} />
        </div>
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-slate-900 transition-colors duration-150 group-hover:text-blue-700">
            {article.title}
          </h3>
          <p className="mt-0.5 text-[13px] text-slate-500 leading-relaxed">
            {article.description}
          </p>
        </div>
      </div>
      <div className="mt-4 flex items-center gap-2 flex-wrap">
        <Badge variant="neutral">{HELP_CATEGORY_LABELS[article.category]}</Badge>
        <span className="text-xs text-slate-400">{article.readTime} read</span>
      </div>
    </Link>
  );
}

function ArticlesSection({
  categories,
  activeCategory,
  onSelectCategory,
  reduceMotion,
}: {
  categories: ("all" | HelpCategoryId)[];
  activeCategory: "all" | HelpCategoryId;
  onSelectCategory: (category: "all" | HelpCategoryId) => void;
  reduceMotion: boolean;
}) {
  const articles =
    activeCategory === "all"
      ? ARTICLES
      : ARTICLES.filter((article) => article.category === activeCategory);

  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: reduceMotion ? 0 : 0.2,
        ease: EASE_OUT,
        delay: reduceMotion ? 0 : 0.03,
      }}
      aria-labelledby="help-articles-heading"
    >
      <SectionHeading
        id="help-articles-heading"
        title="Help articles"
        description="Concise, beginner-friendly documentation for every area of Prosventa."
        icon={
          <svg
            className="w-4 h-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
          </svg>
        }
      />
      <div
        className="mt-3 flex items-center gap-2 flex-wrap"
        role="group"
        aria-label="Filter articles by category"
      >
        {categories.map((cat) => {
          // Framer handles the pressed (tap) scale so it respects reduced motion;
          // color/border state changes stay on Tailwind for a restrained, native feel.
          const active = activeCategory === cat;
          return (
            <motion.button
              key={cat}
              type="button"
              onClick={() => onSelectCategory(cat)}
              aria-pressed={active}
              whileTap={{ scale: reduceMotion ? 1 : 0.97 }}
              transition={{
                duration: reduceMotion ? 0 : 0.15,
                ease: EASE_OUT,
              }}
              className={`inline-flex items-center rounded-full px-3 py-1.5 text-xs font-medium transition-colors duration-150 ${
                active
                  ? "bg-navy-900 text-white shadow-sm"
                  : "bg-white border border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50"
              }`}
            >
              {cat === "all" ? "All" : HELP_CATEGORY_LABELS[cat]}
            </motion.button>
          );
        })}
      </div>
      {/* Category results: each card animates individually. Stable keys (article
          slug) preserve card identity across filters, `layout` slides surviving
          cards into their new grid positions, and popLayout removes exiting cards
          from layout flow so the grid collapses smoothly. Rapid clicks settle on
          the latest filter because keys never change per card. */}
      <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
        <AnimatePresence mode="popLayout" initial={false}>
          {articles.map((article) => (
            <motion.div
              key={article.slug}
              layout={reduceMotion ? false : "position"}
              initial={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.98, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.98, y: -6 }}
              transition={{
                layout: { duration: reduceMotion ? 0 : 0.3, ease: EASE_OUT },
                duration: reduceMotion ? 0 : 0.2,
                ease: EASE_OUT,
              }}
            >
              <ArticleCard article={article} />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </motion.section>
  );
}

function FaqSection({
  groups,
  openFaq,
  onToggle,
  reduceMotion,
}: {
  groups: Array<{ category: HelpCategoryId; faqs: HelpFaq[] }>;
  openFaq: string | null;
  onToggle: (value: string | null) => void;
  reduceMotion: boolean;
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: reduceMotion ? 0 : 0.2,
        ease: EASE_OUT,
        delay: reduceMotion ? 0 : 0.03,
      }}
      aria-labelledby="help-faq-heading"
    >
      <SectionHeading
        id="help-faq-heading"
        title="Frequently asked questions"
        description="Quick answers to the most common questions — grouped by topic so they are easy to scan."
        icon={
          <svg
            className="w-4 h-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="10" />
            <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
        }
      />

      <div className="mt-4 space-y-6">
        {groups.map(({ category, faqs }) => (
          <div key={category}>
            <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <span className="text-slate-400">
                <HelpCategoryIcon category={category} />
              </span>
              {HELP_CATEGORY_LABELS[category]}
            </h3>
            <div className="mt-2 space-y-3">
              {faqs.map((faq, index) => (
                <FaqItem
                  key={faq.question}
                  faq={faq}
                  groupId={`faq-${category}`}
                  index={index}
                  open={openFaq === faq.question}
                  onToggle={() =>
                    onToggle(openFaq === faq.question ? null : faq.question)
                  }
                  reduceMotion={reduceMotion}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </motion.section>
  );
}

function FaqItem({
  faq,
  groupId,
  index,
  open,
  onToggle,
  reduceMotion,
  highlightQuery,
}: {
  faq: HelpFaq;
  groupId: string;
  index: number;
  open: boolean;
  onToggle: () => void;
  reduceMotion: boolean;
  highlightQuery?: string;
}) {
  const buttonId = `${groupId}-btn-${index}`;
  const panelId = `${groupId}-panel-${index}`;

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <h3>
        <button
          id={buttonId}
          type="button"
          onClick={onToggle}
          aria-expanded={open}
          aria-controls={panelId}
          className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left transition-colors duration-150 hover:bg-slate-50"
        >
          <span className="text-sm font-semibold text-slate-900">
            {highlightQuery ? (
              <Highlight text={faq.question} query={highlightQuery} />
            ) : (
              faq.question
            )}
          </span>
          <span
            className={`text-slate-400 transition-transform duration-200 shrink-0 ${
              open ? "rotate-180" : ""
            }`}
            aria-hidden="true"
          >
            <ChevronDownIcon />
          </span>
        </button>
      </h3>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            id={panelId}
            role="region"
            aria-labelledby={buttonId}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: reduceMotion ? 0 : 0.2, ease: EASE_OUT }}
          >
            <div className="px-5 pb-4">
              <p className="text-sm text-slate-500 leading-relaxed">{faq.answer}</p>
              {faq.relatedArticleSlug && (
                <Link
                  href={`/dashboard/help/${faq.relatedArticleSlug}`}
                  className="mt-3 inline-flex items-center gap-1 text-[13px] font-medium text-blue-600 hover:text-blue-700 transition-colors duration-150"
                >
                  Read the full guide
                  <ArrowRightIcon />
                </Link>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function PlaybookCard({
  playbook,
  highlightQuery,
}: {
  playbook: Playbook;
  highlightQuery?: string;
}) {
  return (
    <Link
      href={`/dashboard/help/${playbook.slug}`}
      className="group flex h-full flex-col rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-150 hover:border-blue-200 hover:shadow-md"
    >
      <div className="flex items-start gap-3">
        <PlaybookArtwork playbook={playbook} size="md" />
        <span className="ml-auto inline-flex shrink-0 items-center gap-1 rounded-md bg-slate-50 px-2 py-0.5 text-[11px] font-medium text-slate-400 transition-colors duration-150 group-hover:bg-blue-50 group-hover:text-blue-600">
          ~{playbook.estimatedMinutes} min
        </span>
      </div>

      <h3 className="mt-3 text-sm font-semibold text-slate-900 transition-colors duration-150 group-hover:text-blue-700">
        {highlightQuery ? (
          <Highlight text={playbook.title} query={highlightQuery} />
        ) : (
          playbook.title
        )}
      </h3>
      <p className="mt-1 text-[13px] text-slate-500 leading-relaxed">
        {playbook.description}
      </p>

      <div className="mt-auto flex items-center gap-2 flex-wrap pt-4">
        <Badge variant="neutral">{HELP_CATEGORY_LABELS[playbook.category]}</Badge>
        <span className="text-xs text-slate-400">
          {playbook.steps.length} {playbook.steps.length === 1 ? "step" : "steps"}
        </span>
        <span className="text-slate-300" aria-hidden="true">
          ·
        </span>
        <span className="inline-flex items-center gap-1 text-xs text-slate-400">
          <span
            className={`h-1.5 w-1.5 rounded-full ${
              playbook.difficulty === "beginner" ? "bg-emerald-500" : "bg-amber-500"
            }`}
            aria-hidden="true"
          />
          {PLAYBOOK_DIFFICULTY_LABELS[playbook.difficulty]}
        </span>
        <span className="ml-auto inline-flex items-center gap-1 text-xs font-medium text-blue-600 opacity-0 -translate-x-1 transition-all duration-150 group-hover:opacity-100 group-hover:translate-x-0">
          Start
          <ArrowRightIcon />
        </span>
      </div>
    </Link>
  );
}

function NoResultsState({ onClear }: { onClear: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-white py-16 px-6 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-50 text-slate-400">
        <SearchGlyphIcon />
      </div>
      <p className="mt-3 text-sm font-medium text-slate-900">No results found</p>
      <p className="mt-1 max-w-xs text-[13px] text-slate-500 leading-relaxed">
        Try a different term, or clear your search to browse all playbooks, articles, and FAQs.
      </p>
      <button
        type="button"
        onClick={onClear}
        className="mt-4 inline-flex items-center rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition-all duration-150 hover:border-slate-400 hover:bg-slate-50"
      >
        Clear search
      </button>
    </div>
  );
}

function SearchArticleCard({ article, query }: { article: HelpArticle; query: string }) {
  return (
    <Link
      href={`/dashboard/help/${article.slug}`}
      className="group block rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-150 hover:border-blue-200 hover:shadow-md"
    >
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-50 text-slate-500 transition-colors duration-150 group-hover:bg-blue-50 group-hover:text-blue-600">
          <HelpCategoryIcon category={article.category} />
        </div>
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-slate-900 transition-colors duration-150 group-hover:text-blue-700">
            <Highlight text={article.title} query={query} />
          </h3>
          <p className="mt-0.5 text-[13px] text-slate-500 leading-relaxed">
            <Highlight text={article.description} query={query} />
          </p>
        </div>
      </div>
      <div className="mt-4 flex items-center gap-2 flex-wrap">
        <Badge variant="neutral">{HELP_CATEGORY_LABELS[article.category]}</Badge>
        <span className="text-xs text-slate-400">{article.readTime} read</span>
      </div>
    </Link>
  );
}

function SearchResults({
  query,
  playbooks,
  articles,
  faqs,
  empty,
  onClear,
  transition,
  reduceMotion,
}: {
  query: string;
  playbooks: Playbook[];
  articles: HelpArticle[];
  faqs: HelpFaq[];
  empty: boolean;
  onClear: () => void;
  transition: Transition;
  reduceMotion: boolean;
}) {
  const [openSearchFaq, setOpenSearchFaq] = useState<string | null>(null);
  const total = playbooks.length + articles.length + faqs.length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={transition}
      className="space-y-8"
    >
      <p role="status" className="text-sm text-slate-500">
        {empty ? "No results for" : `${total} ${total === 1 ? "result" : "results"} for`}{" "}
        <span className="font-medium text-slate-700">&ldquo;{query}&rdquo;</span>
      </p>

      {empty ? (
        <NoResultsState onClear={onClear} />
      ) : (
        <>
          {playbooks.length > 0 && (
            <section aria-labelledby="search-playbooks-heading">
              <h2
                id="search-playbooks-heading"
                className="text-xs font-semibold uppercase tracking-wide text-slate-400"
              >
                Playbooks
              </h2>
              <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {playbooks.map((playbook) => (
                  <PlaybookCard
                    key={playbook.slug}
                    playbook={playbook}
                    highlightQuery={query}
                  />
                ))}
              </div>
            </section>
          )}

          {articles.length > 0 && (
            <section aria-labelledby="search-articles-heading">
              <h2
                id="search-articles-heading"
                className="text-xs font-semibold uppercase tracking-wide text-slate-400"
              >
                Articles
              </h2>
              <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-4">
                {articles.map((article) => (
                  <SearchArticleCard key={article.slug} article={article} query={query} />
                ))}
              </div>
            </section>
          )}

          {faqs.length > 0 && (
            <section aria-labelledby="search-faqs-heading">
              <h2
                id="search-faqs-heading"
                className="text-xs font-semibold uppercase tracking-wide text-slate-400"
              >
                Frequently asked questions
              </h2>
              <div className="mt-3 space-y-3">
                {faqs.map((faq, index) => (
                  <FaqItem
                    key={faq.question}
                    faq={faq}
                    groupId="search-results-faq"
                    index={index}
                    open={openSearchFaq === faq.question}
                    onToggle={() =>
                      setOpenSearchFaq(openSearchFaq === faq.question ? null : faq.question)
                    }
                    highlightQuery={query}
                    reduceMotion={reduceMotion}
                  />
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </motion.div>
  );
}

function SupportSection() {
  return (
    <section
      aria-labelledby="help-support-heading"
      className="rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 to-blue-50/50 p-6 sm:p-7"
    >
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-blue-600 ring-1 ring-blue-100/70">
          <svg
            className="w-5 h-5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="10" />
            <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
        </div>
        <div className="min-w-0">
          <h2
            id="help-support-heading"
            className="text-base font-bold tracking-tight text-slate-900"
          >
            Need help?
          </h2>
          <p className="mt-1 text-sm text-slate-500 leading-relaxed">
            Our support team responds by email. Write to{" "}
            <a
              href="mailto:support@prosventa.com"
              className="font-medium text-blue-600 hover:text-blue-700 transition-colors duration-150"
            >
              support@prosventa.com
            </a>{" "}
            and we&apos;ll help you out — usually within business hours.
          </p>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            <svg
              className="w-4 h-4 text-slate-400"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <line x1="8" y1="6" x2="21" y2="6" />
              <line x1="8" y1="12" x2="21" y2="12" />
              <line x1="8" y1="18" x2="21" y2="18" />
              <line x1="3" y1="6" x2="3.01" y2="6" />
              <line x1="3" y1="12" x2="3.01" y2="12" />
              <line x1="3" y1="18" x2="3.01" y2="18" />
            </svg>
            When you report an issue, include
          </h3>
          <ul className="mt-2 space-y-1.5 text-[13px] text-slate-500 leading-relaxed">
            <li className="flex items-start gap-2">
              <span
                className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-slate-300"
                aria-hidden="true"
              />
              What you were trying to do
            </li>
            <li className="flex items-start gap-2">
              <span
                className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-slate-300"
                aria-hidden="true"
              />
              The steps to reproduce the problem
            </li>
            <li className="flex items-start gap-2">
              <span
                className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-slate-300"
                aria-hidden="true"
              />
              Any error message you saw
            </li>
            <li className="flex items-start gap-2">
              <span
                className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-slate-300"
                aria-hidden="true"
              />
              Your workspace name or account email
            </li>
          </ul>
        </div>

        <a
          href="mailto:support@prosventa.com?subject=Prosventa%20support%20request"
          className="group flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-4 transition-all duration-150 hover:border-blue-200 hover:shadow-sm"
        >
          <div>
            <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <svg
                className="w-4 h-4 text-slate-400"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                <polyline points="22,6 12,13 2,6" />
              </svg>
              Contact support
            </h3>
            <p className="mt-2 text-[13px] text-slate-500 leading-relaxed">
              Opens your email app with a message pre-filled to support@prosventa.com.
            </p>
          </div>
          <span className="mt-4 inline-flex items-center gap-1 text-[13px] font-medium text-blue-600 transition-transform duration-150 group-hover:translate-x-0.5">
            Compose email
            <ArrowRightIcon />
          </span>
        </a>
      </div>
    </section>
  );
}