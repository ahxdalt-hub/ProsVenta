// ============================================================================
// Prosventa AI — Intelligence Section
// Stage 3 — Phase 2: AI-Powered Prospect Intelligence Platform
// ============================================================================
// Composes all AI insight cards into a cohesive, premium section.
// ============================================================================

"use client";

import { memo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/Skeleton";
import { Button } from "@/components/ui/Button";
import type { AIProspectIntelligence } from "../types";
import {
  AIInsightCard,
  ConfidenceIndicator,
  ScoreRing,
  InfoRow,
  SeverityBadge,
  PriorityBadge,
} from "./AIInsightCard";

// ============================================================================
// Icons (inline SVG — no external deps)
// ============================================================================

const SparkleIcon = () => (
  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M12 3l1.9 5.7a2 2 0 0 0 1.3 1.3L21 12l-5.8 1.9a2 2 0 0 0-1.3 1.3L12 21l-1.9-5.8a2 2 0 0 0-1.3-1.3L3 12l5.8-1.9a2 2 0 0 0 1.3-1.3L12 3z" />
  </svg>
);

const BuildingIcon = () => (
  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M3 21h18" />
    <path d="M5 21V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16" />
    <path d="M9 7h1" /><path d="M9 11h1" /><path d="M9 15h1" />
    <path d="M14 7h1" /><path d="M14 11h1" /><path d="M14 15h1" />
  </svg>
);

const TargetIcon = () => (
  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="10" />
    <circle cx="12" cy="12" r="6" />
    <circle cx="12" cy="12" r="2" />
  </svg>
);

const TrendingIcon = () => (
  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
    <polyline points="17 6 23 6 23 12" />
  </svg>
);

const AlertIcon = () => (
  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
    <line x1="12" y1="9" x2="12" y2="13" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
);

const CheckIcon = () => (
  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
    <polyline points="22 4 12 14.01 9 11.01" />
  </svg>
);

const RefreshIcon = () => (
  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <polyline points="23 4 23 10 17 10" />
    <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
  </svg>
);

// ============================================================================
// Section Header
// ============================================================================

interface SectionHeaderProps {
  onRefresh: () => void;
  isRefreshing: boolean;
}

const SectionHeader = memo(function SectionHeader({ onRefresh, isRefreshing }: SectionHeaderProps) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-blue-50 to-blue-100 text-blue-600">
          <SparkleIcon />
        </span>
        <div>
          <h3 className="text-sm font-bold text-slate-900">AI Intelligence</h3>
          <p className="text-[11px] text-slate-400">Automated research & insights</p>
        </div>
      </div>
      <button
        onClick={onRefresh}
        disabled={isRefreshing}
        className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors duration-150 disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none"
        aria-label="Regenerate AI insights"
      >
        <motion.span
          animate={isRefreshing ? { rotate: 360 } : { rotate: 0 }}
          transition={isRefreshing ? { repeat: Infinity, duration: 0.8, ease: "linear" } : { duration: 0.2 }}
          className="inline-flex"
        >
          <RefreshIcon />
        </motion.span>
        {isRefreshing ? "Analyzing…" : "Refresh"}
      </button>
    </div>
  );
});

// ============================================================================
// Specialized Cards
// ============================================================================

interface SummaryCardProps {
  summary: AIProspectIntelligence["summary"];
}

const SummaryCard = memo(function SummaryCard({ summary }: SummaryCardProps) {
  return (
    <AIInsightCard
      title="Company Summary"
      icon={<SparkleIcon />}
      confidence={summary.confidence}
    >
      <p className="text-sm leading-relaxed text-slate-700">
        {summary.text}
      </p>
    </AIInsightCard>
  );
});

interface CompanyInfoCardProps {
  info: AIProspectIntelligence["companyInfo"];
}

const CompanyInfoCard = memo(function CompanyInfoCard({ info }: CompanyInfoCardProps) {
  return (
    <AIInsightCard
      title="Company Information"
      icon={<BuildingIcon />}
      confidence={info.confidence}
    >
      <div className="divide-y divide-slate-50">
        <InfoRow label="Industry" value={info.industry} />
        <InfoRow label="Company Size" value={info.companySize} />
        <InfoRow label="Employees" value={info.estimatedEmployees} />
        <InfoRow label="Revenue" value={info.estimatedRevenue} />
        <InfoRow label="Headquarters" value={info.headquarters} />
        <InfoRow label="Founded" value={info.foundedYear} />
        <InfoRow label="Website" value={info.website} href={info.website} />
        <InfoRow label="LinkedIn" value={info.linkedin} href={info.linkedin} />
      </div>
    </AIInsightCard>
  );
});

interface FitScoreCardProps {
  score: AIProspectIntelligence["fitScore"];
}

const FitScoreCard = memo(function FitScoreCard({ score }: FitScoreCardProps) {
  return (
    <AIInsightCard
      title="Fit Score"
      icon={<TargetIcon />}
      confidence={score.confidence}
    >
      <div className="flex items-center gap-4">
        <ScoreRing value={score.value} label={score.label} />
      </div>
      <p className="mt-3 text-xs leading-relaxed text-slate-500">
        {score.explanation}
      </p>
    </AIInsightCard>
  );
});

interface LeadScoreCardProps {
  score: AIProspectIntelligence["leadScore"];
}

const LeadScoreCard = memo(function LeadScoreCard({ score }: LeadScoreCardProps) {
  return (
    <AIInsightCard
      title="Lead Score"
      icon={<TrendingIcon />}
      confidence={score.confidence}
    >
      <div className="flex items-center gap-4">
        <ScoreRing value={score.value} label={score.label} />
      </div>
      <p className="mt-3 text-xs leading-relaxed text-slate-500">
        {score.explanation}
      </p>
    </AIInsightCard>
  );
});

interface BuyingIntentCardProps {
  intent: AIProspectIntelligence["buyingIntent"];
}

const BuyingIntentCard = memo(function BuyingIntentCard({ intent }: BuyingIntentCardProps) {
  const intentColor =
    intent.level === "very_high"
      ? "text-green-600 bg-green-50 border-green-100"
      : intent.level === "high"
        ? "text-blue-600 bg-blue-50 border-blue-100"
        : intent.level === "medium"
          ? "text-amber-600 bg-amber-50 border-amber-100"
          : "text-slate-500 bg-slate-50 border-slate-100";

  return (
    <AIInsightCard
      title="Buying Intent"
      icon={<TrendingIcon />}
      confidence={intent.confidence}
    >
      <div className="flex items-center gap-3">
        <span className={cn("inline-flex items-center rounded-full border px-3 py-1 text-sm font-bold", intentColor)}>
          {intent.label}
        </span>
      </div>
      <p className="mt-3 text-xs leading-relaxed text-slate-500">
        {intent.explanation}
      </p>
    </AIInsightCard>
  );
});

interface RecommendationsCardProps {
  recommendations: AIProspectIntelligence["recommendations"];
}

const RecommendationsCard = memo(function RecommendationsCard({ recommendations }: RecommendationsCardProps) {
  return (
    <AIInsightCard
      title="Next Best Action"
      icon={<SparkleIcon />}
    >
      <div className="space-y-2">
        {recommendations.map((rec) => (
          <div
            key={rec.id}
            className="flex items-start gap-3 rounded-lg border border-slate-100 bg-slate-50/50 p-3"
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold text-slate-900">{rec.title}</p>
                <PriorityBadge priority={rec.priority} />
              </div>
              <p className="mt-0.5 text-xs text-slate-500 leading-relaxed">
                {rec.description}
              </p>
            </div>
            <ConfidenceIndicator confidence={rec.confidence} className="shrink-0" />
          </div>
        ))}
      </div>
    </AIInsightCard>
  );
});

interface RisksCardProps {
  risks: AIProspectIntelligence["risks"];
}

const RisksCard = memo(function RisksCard({ risks }: RisksCardProps) {
  return (
    <AIInsightCard
      title="Risk Analysis"
      icon={<AlertIcon />}
    >
      <div className="space-y-2">
        {risks.map((risk) => (
          <div
            key={risk.id}
            className="flex items-start gap-3 rounded-lg border border-red-50 bg-red-50/30 p-3"
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold text-slate-900">{risk.title}</p>
                <SeverityBadge level={risk.severity} tone="risk" />
              </div>
              <p className="mt-0.5 text-xs text-slate-500 leading-relaxed">
                {risk.description}
              </p>
            </div>
            <ConfidenceIndicator confidence={risk.confidence} className="shrink-0" />
          </div>
        ))}
      </div>
    </AIInsightCard>
  );
});

interface OpportunitiesCardProps {
  opportunities: AIProspectIntelligence["opportunities"];
}

const OpportunitiesCard = memo(function OpportunitiesCard({ opportunities }: OpportunitiesCardProps) {
  return (
    <AIInsightCard
      title="Opportunity Highlights"
      icon={<CheckIcon />}
    >
      <div className="space-y-2">
        {opportunities.map((opp) => (
          <div
            key={opp.id}
            className="flex items-start gap-3 rounded-lg border border-green-50 bg-green-50/30 p-3"
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold text-slate-900">{opp.title}</p>
                <SeverityBadge level={opp.impact} tone="opportunity" />
              </div>
              <p className="mt-0.5 text-xs text-slate-500 leading-relaxed">
                {opp.description}
              </p>
            </div>
            <ConfidenceIndicator confidence={opp.confidence} className="shrink-0" />
          </div>
        ))}
      </div>
    </AIInsightCard>
  );
});

// ============================================================================
// Loading Skeleton
// ============================================================================

export const AIIntelligenceSkeleton = memo(function AIIntelligenceSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Skeleton className="w-8 h-8 rounded-lg" />
          <div className="space-y-1.5">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-3 w-40" />
          </div>
        </div>
        <Skeleton className="h-7 w-20 rounded-lg" />
      </div>

      <div className="premium-card p-4">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-3 w-full mt-3" />
        <Skeleton className="h-3 w-3/4 mt-2" />
      </div>

      <div className="premium-card p-4">
        <Skeleton className="h-4 w-36" />
        <div className="mt-3 space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-3 w-24" />
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="premium-card p-4">
            <Skeleton className="h-4 w-20" />
            <div className="flex items-center gap-3 mt-3">
              <Skeleton className="w-16 h-16 rounded-full" />
              <Skeleton className="h-4 w-16" />
            </div>
          </div>
        ))}
      </div>

      <div className="premium-card p-4">
        <Skeleton className="h-4 w-28" />
        <div className="mt-3 space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-lg border border-slate-100 bg-slate-50/50 p-3">
              <Skeleton className="h-3 w-32" />
              <Skeleton className="h-3 w-full mt-2" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
});

// ============================================================================
// Empty State
// ============================================================================

interface AIEmptyStateProps {
  onGenerate: () => void;
  isGenerating: boolean;
}

export const AIEmptyState = memo(function AIEmptyState({ onGenerate, isGenerating }: AIEmptyStateProps) {
  return (
    <div className="premium-card p-6 text-center">
      <div className="mx-auto flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-blue-50 to-blue-100 text-blue-600">
        <SparkleIcon />
      </div>
      <h4 className="mt-4 text-sm font-semibold text-slate-900">AI Insights</h4>
      <p className="mt-1.5 text-xs text-slate-400 max-w-[220px] mx-auto leading-relaxed">
        Generate automated research on this prospect — company profile, fit score, risks, and next steps.
      </p>
      <Button
        size="sm"
        className="mt-4"
        onClick={onGenerate}
        loading={isGenerating}
      >
        Generate AI Insights
      </Button>
    </div>
  );
});

// ============================================================================
// Main Section Component
// ============================================================================

interface AIIntelligenceSectionProps {
  intelligence: AIProspectIntelligence | null;
  isLoading: boolean;
  isRefreshing: boolean;
  onRefresh: () => void;
  onGenerate: () => void;
}

export function AIIntelligenceSection({
  intelligence,
  isLoading,
  isRefreshing,
  onRefresh,
  onGenerate,
}: AIIntelligenceSectionProps) {
  const handleRefresh = useCallback(() => {
    if (!isRefreshing) onRefresh();
  }, [isRefreshing, onRefresh]);

  return (
    <div className="space-y-4">
      <SectionHeader onRefresh={handleRefresh} isRefreshing={isRefreshing} />

      <AnimatePresence mode="wait">
        {isLoading ? (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <AIIntelligenceSkeleton />
          </motion.div>
        ) : intelligence ? (
          <motion.div
            key="content"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="space-y-4"
          >
            <SummaryCard summary={intelligence.summary} />
            <CompanyInfoCard info={intelligence.companyInfo} />
            <div className="grid grid-cols-2 gap-3">
              <FitScoreCard score={intelligence.fitScore} />
              <LeadScoreCard score={intelligence.leadScore} />
            </div>
            <BuyingIntentCard intent={intelligence.buyingIntent} />
            <RecommendationsCard recommendations={intelligence.recommendations} />
            <OpportunitiesCard opportunities={intelligence.opportunities} />
            <RisksCard risks={intelligence.risks} />
          </motion.div>
        ) : (
          <motion.div
            key="empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <AIEmptyState onGenerate={onGenerate} isGenerating={isRefreshing} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}