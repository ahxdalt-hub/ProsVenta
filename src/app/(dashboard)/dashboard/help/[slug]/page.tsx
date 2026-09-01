// ============================================================================
// Help Center — Article detail page
// ============================================================================
// Serves static help articles at /dashboard/help/[slug].
// Content comes from the shared help-content module (no backend needed).
// Unknown slugs render the standard not-found page.
// ============================================================================

import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import {
  getArticleBySlug,
  HELP_CATEGORY_LABELS,
  type HelpArticle,
  type HelpContentBlock,
} from "@/components/dashboard/help/help-content";
import {
  getPlaybookBySlug,
  type Playbook,
} from "@/components/dashboard/help/playbook-content";
import { PlaybookDetail } from "@/components/dashboard/help/PlaybookDetail";
import { HelpCategoryIcon } from "@/components/dashboard/help/help-icons";

interface ArticlePageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({
  params,
}: ArticlePageProps): Promise<Metadata> {
  const { slug } = await params;
  const article = getArticleBySlug(slug);
  const playbook = getPlaybookBySlug(slug);
  return {
    title: article
      ? `${article.title} · Help Center`
      : playbook
        ? `${playbook.title} · Playbook · Help Center`
        : "Help Center",
  };
}

function ContentBlock({ block }: { block: HelpContentBlock }) {
  switch (block.type) {
    case "paragraph":
      return (
        <p className="text-sm sm:text-[15px] text-slate-600 leading-relaxed">
          {block.text}
        </p>
      );
    case "heading":
      return (
        <h2 className="text-base font-semibold text-slate-900 tracking-tight pt-2">
          {block.text}
        </h2>
      );
    case "list":
      return (
        <ul className="space-y-2">
          {block.items.map((item) => (
            <li
              key={item}
              className="flex items-start gap-2.5 text-sm sm:text-[15px] text-slate-600 leading-relaxed"
            >
              <span
                className="mt-[9px] h-1.5 w-1.5 shrink-0 rounded-full bg-slate-300"
                aria-hidden="true"
              />
              {item}
            </li>
          ))}
        </ul>
      );
    case "steps":
      return (
        <ol className="space-y-3">
          {block.items.map((item, index) => (
            <li key={item} className="flex items-start gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-navy-900 text-[11px] font-semibold text-white">
                {index + 1}
              </span>
              <span className="text-sm sm:text-[15px] text-slate-600 leading-relaxed pt-0.5">
                {item}
              </span>
            </li>
          ))}
        </ol>
      );
    case "tip":
      return (
        <div className="flex items-start gap-3 rounded-xl border border-blue-100 bg-blue-50/60 px-4 py-3.5">
          <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-600">
            <svg
              className="w-3.5 h-3.5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M9 18h6" />
              <path d="M10 22h4" />
              <path d="M12 2a7 7 0 0 0-4 12.7c.6.5 1 1.2 1 2h6c0-.8.4-1.5 1-2A7 7 0 0 0 12 2z" />
            </svg>
          </span>
          <p className="text-sm sm:text-[15px] text-slate-700 leading-relaxed">
            <span className="font-semibold text-slate-800">Good to know: </span>
            {block.text}
          </p>
        </div>
      );
  }
}

export default async function HelpArticlePage({ params }: ArticlePageProps) {
  const { slug } = await params;
  const article = getArticleBySlug(slug);
  const playbook = getPlaybookBySlug(slug);

  // Playbook slug → render the interactive step-by-step learning guide.
  if (!article && playbook) {
    return <PlaybookDetail playbook={playbook} />;
  }

  if (!article) {
    notFound();
  }

  const relatedArticles = (article.relatedArticles ?? [])
    .map((relatedSlug) => getArticleBySlug(relatedSlug))
    .filter((candidate): candidate is HelpArticle => Boolean(candidate));
  const relatedPlaybooks = (article.relatedPlaybooks ?? [])
    .map((relatedSlug) => getPlaybookBySlug(relatedSlug))
    .filter((candidate): candidate is Playbook => Boolean(candidate));

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      {/* Breadcrumb */}
      <nav
        className="dashboard-enter flex items-center gap-2 text-sm text-slate-400"
        aria-label="Breadcrumb"
      >
        <Link
          href="/dashboard/help"
          className="hover:text-slate-600 transition-colors duration-150"
        >
          Help Center
        </Link>
        <span aria-hidden="true">/</span>
        <span className="text-slate-600">
          {HELP_CATEGORY_LABELS[article.category]}
        </span>
      </nav>

      {/* Header */}
      <header className="dashboard-enter" style={{ animationDelay: "60ms" }}>
        <div className="flex items-center gap-3 flex-wrap">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-50 to-slate-50 text-blue-600 ring-1 ring-blue-100/70">
            <HelpCategoryIcon category={article.category} />
          </span>
          <Badge variant="neutral">
            {HELP_CATEGORY_LABELS[article.category]}
          </Badge>
          <span className="text-xs text-slate-400">{article.readTime} read</span>
        </div>
        <h1 className="mt-3 text-2xl sm:text-[28px] font-bold tracking-tight text-slate-900 leading-tight">
          {article.title}
        </h1>
        <p className="mt-2 text-sm sm:text-[15px] text-slate-500 leading-relaxed">
          {article.description}
        </p>
      </header>

      {/* Content */}
      <article
        className="dashboard-enter space-y-5"
        style={{ animationDelay: "120ms" }}
      >
        {article.content.map((block, index) => (
          <ContentBlock key={index} block={block} />
        ))}
      </article>

      {/* Related content */}
      {(relatedPlaybooks.length > 0 || relatedArticles.length > 0) && (
        <div className="dashboard-enter space-y-6" style={{ animationDelay: "160ms" }}>
          {relatedPlaybooks.length > 0 && (
            <section aria-labelledby="related-playbooks-heading">
              <h2
                id="related-playbooks-heading"
                className="text-xs font-semibold uppercase tracking-wide text-slate-400"
              >
                Related playbooks
              </h2>
              <div className="mt-2 space-y-2">
                {relatedPlaybooks.map((pb) => (
                  <Link
                    key={pb.slug}
                    href={`/dashboard/help/${pb.slug}`}
                    className="group flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3 transition-all duration-150 hover:border-blue-200 hover:bg-blue-50/40"
                  >
                    <span className="min-w-0 text-left">
                      <span className="block text-sm font-semibold text-slate-800 group-hover:text-blue-700 transition-colors duration-150">
                        {pb.title}
                      </span>
                      <span className="mt-0.5 block text-xs text-slate-500 truncate">
                        {pb.description}
                      </span>
                    </span>
                    <svg
                      className="w-4 h-4 text-slate-400 shrink-0 group-hover:text-blue-600 transition-colors duration-150"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <line x1="5" y1="12" x2="19" y2="12" />
                      <polyline points="12 5 19 12 12 19" />
                    </svg>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {relatedArticles.length > 0 && (
            <section aria-labelledby="related-articles-heading">
              <h2
                id="related-articles-heading"
                className="text-xs font-semibold uppercase tracking-wide text-slate-400"
              >
                Related articles
              </h2>
              <div className="mt-2 flex items-center gap-2 flex-wrap">
                {relatedArticles.map((a) => (
                  <Link
                    key={a.slug}
                    href={`/dashboard/help/${a.slug}`}
                    className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600 transition-all duration-150 hover:border-blue-200 hover:text-blue-700"
                  >
                    {a.title}
                  </Link>
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      {/* Back navigation */}
      <div
        className="dashboard-enter border-t border-slate-200 pt-6"
        style={{ animationDelay: "180ms" }}
      >
        <Link href="/dashboard/help">
          <Button variant="ghost" size="sm">
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
              <line x1="19" y1="12" x2="5" y2="12" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
            Back to Help Center
          </Button>
        </Link>
      </div>
    </div>
  );
}