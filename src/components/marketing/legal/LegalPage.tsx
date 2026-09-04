"use client";

// ============================================================================
// Prosventa Legal — shared legal-page shell + typography primitives.
// ============================================================================
// One reusable design system for Prosventa's legal pages (Privacy Policy,
// Terms of Service, Security). A page composes <LegalPage /> with structured
// section data and body content built from the exported primitives.
//
// Design notes:
//   - Wide, asymmetric reading layout (sticky contents sidebar + article),
//     deliberately NOT a tiny centered column.
//   - Calm, premium motion: gentle section entrances, smooth anchor
//     scrolling, all gated behind prefers-reduced-motion.
//   - Decorative glyphs (◈, ⌁) are used sparingly for hierarchy only.
// ============================================================================

import { useEffect, useRef, useState, type ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";
import Link from "next/link";
import { BrandLogo } from "@/components/branding/BrandLogo";

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

/* -------------------------------- Types -------------------------------- */

export interface LegalSectionData {
  /** DOM id used for anchor navigation. */
  id: string;
  /** Two-digit display number, e.g. "01". */
  number: string;
  /** Full section title. */
  title: string;
  /** Optional shorter label for the table of contents. */
  tocLabel?: string;
  /** Section body — compose from the exported legal primitives. */
  content: ReactNode;
}

interface LegalPageProps {
  /** Short eyebrow label above the title, e.g. "Legal". */
  eyebrow: string;
  title: string;
  /** One-line description under the title. */
  description: string;
  /** Human-readable last-updated date. */
  updated: string;
  /** Ordered sections rendered in the article and the contents sidebar. */
  sections: LegalSectionData[];
  /** Optional extra block rendered after the article (related links, etc.). */
  footer?: ReactNode;
  /** Optional extra block rendered in the header under the description
   *  (e.g. the Security page's verified-control chips). */
  hero?: ReactNode;
}

/* ------------------------------ Main shell ------------------------------ */

export default function LegalPage({
  eyebrow,
  title,
  description,
  updated,
  sections,
  footer,
  hero,
}: LegalPageProps) {
  const reduce = useReducedMotion();
  const [activeId, setActiveId] = useState<string>(sections[0]?.id ?? "");
  const mobileTocRef = useRef<HTMLDetailsElement>(null);

  // Track which section is currently in view — rAF-throttled so layout reads
  // don't run on every scroll event (same pattern as the marketing nav).
  useEffect(() => {
    let ticking = false;
    const handleScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        ticking = false;
        let current = sections[0]?.id ?? "";
        for (const section of sections) {
          const el = document.getElementById(section.id);
          if (el && el.getBoundingClientRect().top <= 140) {
            current = section.id;
          }
        }
        // At the very bottom, highlight the final section.
        const scrolledToBottom =
          window.innerHeight + window.scrollY >=
          document.documentElement.scrollHeight - 4;
        if (scrolledToBottom && sections.length > 0) {
          current = sections[sections.length - 1].id;
        }
        setActiveId(current);
      });
    };
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [sections]);

  const handleTocClick = (
    e: React.MouseEvent<HTMLAnchorElement>,
    id: string
  ) => {
    e.preventDefault();
    const el = document.getElementById(id);
    if (!el) return;
    el.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
    // Keep the URL shareable without triggering a native jump.
    window.history.replaceState(null, "", `#${id}`);
    // Close the collapsed mobile contents after choosing a section.
    mobileTocRef.current?.removeAttribute("open");
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" });
  };

  const tocItems = (active: boolean) =>
    sections.map((section) => {
      const isActive = active && section.id === activeId;
      return (
        <li key={section.id}>
          <a
            href={`#${section.id}`}
            onClick={(e) => handleTocClick(e, section.id)}
            aria-current={isActive ? "location" : undefined}
            className={`-ml-px flex items-baseline gap-2.5 border-l-2 py-1.5 pl-4 pr-2 text-sm transition-colors duration-150 ${
              isActive
                ? "border-blue-500 font-medium text-slate-900"
                : "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-900"
            }`}
          >
            <span
              className={`text-xs tabular-nums transition-colors duration-150 ${
                isActive ? "text-blue-600" : "text-slate-300"
              }`}
            >
              {section.number}
            </span>
            {section.tocLabel ?? section.title}
          </a>
        </li>
      );
    });

  return (
    <div className="bg-slate-50">
      {/* ------------------------------ Header ------------------------------ */}
      <header className="relative overflow-hidden">
        {/* Ambient background — restrained brand depth, no neon */}
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div className="grid-pattern absolute inset-0 [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,black,transparent)]" />
          <div className="absolute -top-32 left-1/2 h-[380px] w-[640px] -translate-x-1/2 rounded-full bg-blue-500/[0.05] blur-3xl" />
        </div>

        <div className="relative mx-auto max-w-7xl px-4 pt-28 sm:px-6 sm:pt-32 lg:px-8 lg:pt-36">
          <Link
            href="/"
            aria-label="Prosventa home"
            className="inline-flex items-center gap-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/40"
          >
            <BrandLogo size="sm" iconSize={18} />
            <span className="text-lg font-semibold tracking-tight text-slate-900">
              Prosventa
            </span>
          </Link>

          <p className="mt-9 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-blue-600">
            <span aria-hidden className="text-[11px] leading-none">◈</span>
            {eyebrow}
          </p>
          <h1 className="mt-3 max-w-3xl text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl">
            {title}
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-slate-600">
            {description}
          </p>

          <div className="mt-7 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-slate-500">
            <span className="inline-flex items-center gap-2">
              <span aria-hidden className="text-blue-500">⌁</span>
              Updated {updated}
            </span>
            <span
              aria-hidden
              className="hidden h-1 w-1 rounded-full bg-slate-300 sm:block"
            />
            <span>Applies to the Prosventa website and application</span>
          </div>

          {hero && <div className="mt-8">{hero}</div>}
        </div>

        <div aria-hidden className="relative mt-12 border-t border-slate-200/80" />
      </header>

      {/* ------------------------------- Body ------------------------------- */}
      <div className="relative mx-auto max-w-7xl px-4 pb-20 pt-10 sm:px-6 sm:pb-24 lg:pt-14">
        <div className="lg:grid lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-12 xl:grid-cols-[240px_minmax(0,1fr)] xl:gap-16">
          {/* Sticky contents — desktop */}
          <aside className="hidden lg:block">
            <nav aria-label="Table of contents" className="sticky top-24">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Contents
              </p>
              <ul className="mt-4 space-y-0.5 border-l border-slate-200">
                {tocItems(true)}
              </ul>
              <p className="mt-6 flex items-center gap-2 border-t border-slate-100 pt-4 text-xs text-slate-400">
                <span aria-hidden className="text-blue-400">⌁</span>
                {sections.length} sections
              </p>
            </nav>
          </aside>

          {/* Article */}
          <div className="min-w-0">
            {/* Collapsed contents — mobile */}
            <details
              ref={mobileTocRef}
              className="group mb-10 rounded-xl border border-slate-200 bg-white lg:hidden"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3.5 text-sm font-semibold text-slate-800 [&::-webkit-details-marker]:hidden">
                <span className="flex items-center gap-2">
                  <span aria-hidden className="text-[13px] text-blue-500">◈</span>
                  On this page
                </span>
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                  className="h-4 w-4 shrink-0 text-slate-400 transition-transform duration-200 group-open:rotate-180"
                >
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </summary>
              <ul className="border-t border-slate-100 px-4 py-2">
                {tocItems(false)}
              </ul>
            </details>

            <div className="space-y-12 sm:space-y-16">
              {sections.map((section) => (
                <ArticleSection
                  key={section.id}
                  section={section}
                  reduce={reduce}
                />
              ))}
            </div>

            {footer && <div className="mt-14">{footer}</div>}

            <div className="mt-12 flex flex-col gap-4 border-t border-slate-200 pt-6 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-slate-400">
                Prosventa · {title} · Updated {updated}
              </p>
              <button
                type="button"
                onClick={scrollToTop}
                className="group inline-flex items-center gap-1.5 rounded-md text-sm font-medium text-slate-500 transition-colors duration-150 hover:text-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
              >
                <span
                  aria-hidden
                  className="transition-transform duration-200 group-hover:-translate-y-0.5"
                >
                  ↑
                </span>
                Back to top
              </button>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}

/* --------------------------- Section renderer --------------------------- */

function ArticleSection({
  section,
  reduce,
}: {
  section: LegalSectionData;
  reduce: boolean | null;
}) {
  return (
    <motion.section
      id={section.id}
      initial={reduce ? false : { opacity: 0, y: 18 }}
      whileInView={reduce ? undefined : { opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.45, ease: EASE }}
      className="scroll-mt-24"
    >
      {/* Section heading — ◈ marker + number + title */}
      <header className="flex items-center gap-2.5">
        <span aria-hidden className="text-[13px] leading-none text-blue-500">
          ◈
        </span>
        <span className="text-[13px] font-semibold leading-none tabular-nums tracking-[0.08em] text-slate-400">
          {section.number}
        </span>
        <span aria-hidden className="h-px w-5 bg-slate-300" />
        <h2 className="text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">
          {section.title}
        </h2>
      </header>
      <div
        aria-hidden
        className="mt-4 h-px bg-gradient-to-r from-slate-200 to-transparent"
      />
      <div className="mt-5 space-y-4">{section.content}</div>
    </motion.section>
  );
}

/* ------------------------ Typography primitives ------------------------- */

/** Standard legal paragraph. */
export function LegalP({ children }: { children: ReactNode }) {
  return (
    <p className="max-w-3xl text-[15px] leading-[1.8] text-slate-600">
      {children}
    </p>
  );
}

/** Sub-heading inside a section. */
export function LegalH3({ children }: { children: ReactNode }) {
  return (
    <h3 className="max-w-3xl pt-2 text-base font-semibold text-slate-900">
      {children}
    </h3>
  );
}

/** Bulleted list with small diamond markers. */
export function LegalList({ items }: { items: ReactNode[] }) {
  return (
    <ul className="max-w-3xl space-y-2.5">
      {items.map((item, index) => (
        <li
          key={index}
          className="flex items-start gap-3 text-[15px] leading-[1.7] text-slate-600"
        >
          <span
            aria-hidden
            className="mt-[10px] h-1.5 w-1.5 shrink-0 rotate-45 rounded-[1px] bg-blue-500/70"
          />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

/** Two-column grid of titled category cards (desktop), stacked on mobile. */
export function LegalInfoGrid({
  items,
}: {
  items: { title: string; children: ReactNode }[];
}) {
  return (
    <div className="grid max-w-3xl gap-3 sm:grid-cols-2">
      {items.map((item) => (
        <div
          key={item.title}
          className="rounded-xl border border-slate-200 bg-white p-4 transition-colors duration-200 hover:border-slate-300 sm:p-5"
        >
          <h3 className="text-sm font-semibold text-slate-900">{item.title}</h3>
          <p className="mt-1.5 text-[13px] leading-relaxed text-slate-500">
            {item.children}
          </p>
        </div>
      ))}
    </div>
  );
}

/** Stacked, divided rows for distinguishing labeled categories. */
export function LegalSourceList({
  items,
}: {
  items: { label: string; children: ReactNode }[];
}) {
  return (
    <div className="max-w-3xl divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white">
      {items.map((item) => (
        <div key={item.label} className="p-4 sm:p-5">
          <h3 className="text-sm font-semibold text-slate-900">{item.label}</h3>
          <p className="mt-1.5 text-[13px] leading-relaxed text-slate-500">
            {item.children}
          </p>
        </div>
      ))}
    </div>
  );
}

/** Highlighted note — used sparingly for important clarifications. */
export function LegalCallout({
  title,
  children,
}: {
  title?: string;
  children: ReactNode;
}) {
  return (
    <div className="max-w-3xl rounded-xl border border-blue-100 bg-blue-50/60 p-4 sm:p-5">
      {title && (
        <p className="text-sm font-semibold text-navy-900">{title}</p>
      )}
      <div
        className={`text-[14px] leading-relaxed text-slate-600 ${
          title ? "mt-1.5" : ""
        }`}
      >
        {children}
      </div>
    </div>
  );
}

/** Inline link — internal routes use the router, everything else a plain anchor. */
export function LegalLink({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}) {
  const className =
    "font-medium text-blue-600 underline decoration-blue-300/70 underline-offset-[3px] transition-colors duration-150 hover:text-blue-700 hover:decoration-blue-500";
  if (href.startsWith("/")) {
    return (
      <Link href={href} className={className}>
        {children}
      </Link>
    );
  }
  return (
    <a href={href} className={className}>
      {children}
    </a>
  );
}

/** Related legal-page card — rendered after the article (e.g. Privacy ↔ Terms). */
export function RelatedLink({
  href,
  title,
  description,
}: {
  href: string;
  title: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="group flex items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-4 transition-colors duration-200 hover:border-blue-200 sm:p-5"
    >
      <span>
        <span className="block text-sm font-semibold text-slate-900 transition-colors duration-150 group-hover:text-blue-700">
          {title}
        </span>
        <span className="mt-0.5 block text-[13px] leading-relaxed text-slate-500">
          {description}
        </span>
      </span>
      <span
        aria-hidden
        className="text-slate-300 transition-all duration-200 group-hover:translate-x-0.5 group-hover:text-blue-500"
      >
        →
      </span>
    </Link>
  );
}


