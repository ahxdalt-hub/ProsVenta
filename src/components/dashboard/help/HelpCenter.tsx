"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Badge } from "@/components/ui/Badge";
import { useToast } from "@/components/ui/toast";

interface HelpArticle {
  id: string;
  title: string;
  description: string;
  category: "getting-started" | "prospects" | "analytics" | "automation" | "billing" | "troubleshooting";
  readTime: string;
}

const ARTICLES: HelpArticle[] = [
  {
    id: "getting-started",
    title: "Getting Started with Prosventa",
    description: "Learn the basics of setting up your workspace and finding your first prospects.",
    category: "getting-started",
    readTime: "5 min",
  },
  {
    id: "create-prospect",
    title: "How to Create a Prospect",
    description: "Add prospects manually or discover them using our AI-powered search.",
    category: "prospects",
    readTime: "3 min",
  },
  {
    id: "import-csv",
    title: "Importing Prospects from CSV",
    description: "Bulk import your existing prospect data with our CSV importer.",
    category: "prospects",
    readTime: "4 min",
  },
  {
    id: "saved-lists",
    title: "Organizing Prospects with Saved Lists",
    description: "Group prospects into targeted lists for better pipeline management.",
    category: "prospects",
    readTime: "3 min",
  },
  {
    id: "analytics-overview",
    title: "Understanding Your Analytics",
    description: "Interpret your pipeline metrics and make data-driven decisions.",
    category: "analytics",
    readTime: "6 min",
  },
  {
    id: "automation-workflows",
    title: "Building Automation Workflows",
    description: "Automate repetitive tasks and streamline your sales process.",
    category: "automation",
    readTime: "7 min",
  },
  {
    id: "billing-plans",
    title: "Understanding Plans & Billing",
    description: "Compare plans, upgrade, downgrade, and manage your subscription.",
    category: "billing",
    readTime: "4 min",
  },
  {
    id: "troubleshooting",
    title: "Troubleshooting Common Issues",
    description: "Solutions for common problems you might encounter.",
    category: "troubleshooting",
    readTime: "5 min",
  },
];

const FAQS = [
  {
    question: "How do I find my first prospects?",
    answer:
      "Navigate to the Prospects page and use the AI-powered search bar. You can search by industry, location, company size, or keywords. Our discovery engine will find matching companies for you.",
  },
  {
    question: "Can I import my existing prospect data?",
    answer:
      "Yes! Go to the Import page and upload a CSV file. Our column mapper will help you match your columns to Prosventa fields. You can preview the data before importing.",
  },
  {
    question: "How does AI prospect scoring work?",
    answer:
      "Prosventa analyzes each prospect's fit based on your target criteria, industry signals, and engagement patterns. Each prospect receives a fit score from 0-100 to help you prioritize.",
  },
  {
    question: "Can I collaborate with my team?",
    answer:
      "Absolutely. Invite team members from the Members page, assign roles and permissions, and work together on prospects with comments and activity feeds.",
  },
  {
    question: "How do I cancel my subscription?",
    answer:
      "Go to Settings → Billing and click 'Cancel'. Your subscription will remain active until the end of the current billing period.",
  },
  {
    question: "Is my data secure?",
    answer:
      "Yes. Prosventa uses industry-standard encryption, secure authentication, and follows best practices for data protection. Your data is never sold or shared with third parties.",
  },
];

const CATEGORY_LABELS: Record<HelpArticle["category"], string> = {
  "getting-started": "Getting Started",
  prospects: "Prospects",
  analytics: "Analytics",
  automation: "Automation",
  billing: "Billing",
  troubleshooting: "Troubleshooting",
};

const RELEASE_NOTES = [
  {
    version: "v0.1.0",
    date: "August 2025",
    title: "Initial Release",
    notes: [
      "Prospect discovery with AI-powered search",
      "CSV import and export",
      "Saved lists and views",
      "Analytics dashboard",
      "Automation workflows",
      "Team collaboration",
    ],
  },
];

export function HelpCenter() {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<"all" | HelpArticle["category"]>("all");
  const [activeTab, setActiveTab] = useState<"articles" | "faqs" | "releases">("articles");
  const { info: toastInfo } = useToast();

  const filteredArticles = ARTICLES.filter((article) => {
    const matchesCategory = activeCategory === "all" || article.category === activeCategory;
    const matchesSearch =
      search.trim() === "" ||
      article.title.toLowerCase().includes(search.toLowerCase()) ||
      article.description.toLowerCase().includes(search.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const categories: ("all" | HelpArticle["category"])[] = [
    "all",
    "getting-started",
    "prospects",
    "analytics",
    "automation",
    "billing",
    "troubleshooting",
  ];

  function handleArticleClick(article: HelpArticle) {
    toastInfo(
      article.title,
      "Full documentation is coming soon. This article will be available shortly."
    );
  }

  return (
    <div className="space-y-8">
      {/* Page header */}
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
      >
        <h1 className="text-2xl sm:text-[28px] font-bold tracking-tight text-slate-900 leading-tight">
          Help Center
        </h1>
        <p className="mt-1.5 text-sm text-slate-500 leading-relaxed">
          Documentation, FAQs, and support resources to help you get the most from Prosventa.
        </p>
      </motion.div>

      {/* Search */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1], delay: 0.05 }}
        className="relative"
      >
        <svg
          className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search help articles..."
          className="w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 shadow-sm transition-all duration-150 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 hover:border-slate-300"
          aria-label="Search help articles"
        />
      </motion.div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200">
        {[
          { id: "articles" as const, label: "Articles" },
          { id: "faqs" as const, label: "FAQs" },
          { id: "releases" as const, label: "Release Notes" },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`relative px-4 py-2.5 text-sm font-medium transition-colors duration-150 ${
              activeTab === tab.id
                ? "text-slate-900"
                : "text-slate-500 hover:text-slate-700"
            }`}
            aria-pressed={activeTab === tab.id}
          >
            {tab.label}
            {activeTab === tab.id && (
              <motion.span
                layoutId="help-tab-indicator"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600"
                transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              />
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
        >
          {activeTab === "articles" && (
            <div className="space-y-6">
              {/* Category filter */}
              <div className="flex items-center gap-2 flex-wrap">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setActiveCategory(cat)}
                    className={`inline-flex items-center rounded-full px-3 py-1.5 text-xs font-medium transition-all duration-150 ${
                      activeCategory === cat
                        ? "bg-navy-900 text-white shadow-sm"
                        : "bg-white border border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                    }`}
                    aria-pressed={activeCategory === cat}
                  >
                    {cat === "all" ? "All" : CATEGORY_LABELS[cat]}
                  </button>
                ))}
              </div>

              {/* Articles grid */}
              {filteredArticles.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {filteredArticles.map((article) => (
                    <button
                      key={article.id}
                      type="button"
                      onClick={() => handleArticleClick(article)}
                      className="settings-card-interactive group rounded-xl border border-slate-200 bg-white p-5 text-left"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-slate-50 text-slate-500 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors duration-150 shrink-0">
                            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                              <polyline points="14 2 14 8 20 8" />
                              <line x1="16" y1="13" x2="8" y2="13" />
                              <line x1="16" y1="17" x2="8" y2="17" />
                            </svg>
                          </div>
                          <div>
                            <h3 className="text-sm font-semibold text-slate-900 group-hover:text-blue-700 transition-colors duration-150">
                              {article.title}
                            </h3>
                            <p className="text-[13px] text-slate-500 mt-0.5 leading-relaxed">
                              {article.description}
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="mt-4 flex items-center gap-2">
                        <Badge variant="neutral">{CATEGORY_LABELS[article.category]}</Badge>
                        <span className="text-xs text-slate-400">{article.readTime} read</span>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="flex items-center justify-center w-12 h-12 rounded-full bg-slate-50 text-slate-400 mb-3">
                    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="11" cy="11" r="8" />
                      <line x1="21" y1="21" x2="16.65" y2="16.65" />
                    </svg>
                  </div>
                  <p className="text-sm font-medium text-slate-900">No articles found</p>
                  <p className="mt-1 text-[13px] text-slate-500">
                    Try a different search term or category.
                  </p>
                </div>
              )}
            </div>
          )}

          {activeTab === "faqs" && (
            <div className="space-y-4">
              {FAQS.map((faq, index) => (
                <motion.div
                  key={faq.question}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1], delay: index * 0.03 }}
                  className="rounded-xl border border-slate-200 bg-white p-5"
                >
                  <h3 className="text-sm font-semibold text-slate-900">{faq.question}</h3>
                  <p className="mt-2 text-sm text-slate-500 leading-relaxed">{faq.answer}</p>
                </motion.div>
              ))}
            </div>
          )}

          {activeTab === "releases" && (
            <div className="space-y-6">
              {RELEASE_NOTES.map((release) => (
                <div key={release.version} className="rounded-xl border border-slate-200 bg-white p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-base font-bold text-slate-900 tracking-tight">
                        {release.title}
                      </h3>
                      <p className="text-sm text-slate-500 mt-0.5">
                        {release.version} · {release.date}
                      </p>
                    </div>
                    <Badge variant="primary">{release.version}</Badge>
                  </div>
                  <ul className="mt-4 space-y-2">
                    {release.notes.map((note) => (
                      <li key={note} className="flex items-start gap-2 text-sm text-slate-600">
                        <svg className="w-4 h-4 text-green-500 shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                        {note}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Contact support */}
      <div className="rounded-xl border border-slate-200 bg-gradient-to-br from-slate-50 to-blue-50/50 p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-semibold text-slate-900 tracking-tight">
              Still need help?
            </h3>
            <p className="mt-1 text-sm text-slate-500 leading-relaxed">
              Our support team is here to help you succeed with Prosventa.
            </p>
          </div>
          <a
            href="mailto:support@prosventa.com"
            className="inline-flex items-center gap-2 rounded-lg bg-navy-900 px-4 py-2 text-sm font-semibold text-white hover:bg-navy-800 transition-all duration-150 hover:shadow-md"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
              <polyline points="22,6 12,13 2,6" />
            </svg>
            Contact Support
          </a>
        </div>
      </div>
    </div>
  );
}