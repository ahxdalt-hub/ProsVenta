"use client";

import { useState, useMemo, useCallback } from "react";
import { motion } from "framer-motion";
import type { AnalyticsData, AnalyticsProspect } from "@/lib/db/analytics";
import { MetricCard } from "./MetricCard";
import { AnalyticsCard } from "./AnalyticsCard";
import { ChartContainer } from "./ChartContainer";
import { ReportCard, type ReportFormat } from "./ReportCard";
import { getTrendDirection } from "./TrendBadge";
import { AreaChart } from "./charts/AreaChart";
import { BarChart } from "./charts/BarChart";
import { DonutChart } from "./charts/DonutChart";
import { ActivityTimeline, type ActivityItem } from "./ActivityTimeline";
import { AnalyticsFilters, type AnalyticsFilterState, type DateRange } from "./AnalyticsFilters";
import { AnalyticsEmptyState, SectionEmptyState } from "./AnalyticsEmptyState";
import { exportReport } from "@/lib/analytics/export";
import { staggerContainerFast, fadeUp } from "@/lib/motion";
import { STATUS_LABELS } from "@/features/prospects/components/status-config";
import type { ProspectStatus } from "@/types/database";

interface AnalyticsClientProps {
  data: AnalyticsData;
}

const STATUS_COLORS: Record<string, string> = {
  new: "#f59e0b",
  contacted: "#3b82f6",
  qualified: "#8b5cf6",
  proposal_sent: "#6366f1",
  negotiation: "#f97316",
  won: "#10b981",
  lost: "#94a3b8",
};

const DEFAULT_FILTERS: AnalyticsFilterState = {
  dateRange: "all",
  industry: "all",
  country: "all",
  status: "all",
};

const DATE_RANGE_LABELS: Record<DateRange, string> = {
  today: "Today",
  "7d": "Last 7 Days",
  "30d": "Last 30 Days",
  "90d": "Last 90 Days",
  year: "This Year",
  all: "All Time",
};

/**
 * Main Analytics workspace client component.
 * Receives raw data from the server, manages filter state, and computes
 * all analytics client-side with useMemo for smooth, instant updates.
 */
export function AnalyticsClient({ data }: AnalyticsClientProps) {
  const [filters, setFilters] = useState<AnalyticsFilterState>(DEFAULT_FILTERS);

  // Show premium empty state if there are no prospects at all
  if (!data.hasProspects) {
    return (
      <div className="dashboard-enter">
        <AnalyticsHeader data={data} filters={filters} onFiltersChange={setFilters} />
        <div className="mt-8 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <AnalyticsEmptyState />
        </div>
      </div>
    );
  }

  return <AnalyticsContent data={data} filters={filters} onFiltersChange={setFilters} />;
}

// ============================================================================
// Analytics Content (rendered when there is data)
// ============================================================================

function AnalyticsContent({
  data,
  filters,
  onFiltersChange,
}: {
  data: AnalyticsData;
  filters: AnalyticsFilterState;
  onFiltersChange: (f: AnalyticsFilterState) => void;
}) {
  // --- Filter prospects based on current filter state ---
  const filteredProspects = useMemo(() => {
    return filterProspects(data.prospects, filters);
  }, [data.prospects, filters]);

  // --- Executive KPIs with trends ---
  const kpis = useMemo(() => computeExecutiveKpis(filteredProspects, data), [filteredProspects, data]);

  // --- Distributions ---
  const { industryData, countryData, leadScoreData, aiFitData, buyingIntentData } = useMemo(
    () => computeDistributions(filteredProspects),
    [filteredProspects]
  );

  // --- Time series (prospects over time) ---
  const timeSeries = useMemo(
    () => computeTimeSeries(filteredProspects, filters.dateRange),
    [filteredProspects, filters.dateRange]
  );

  // --- Pipeline analytics ---
  const pipelineData = useMemo(() => computePipeline(filteredProspects), [filteredProspects]);

  // --- Industry analytics ---
  const industryAnalytics = useMemo(() => computeIndustryAnalytics(filteredProspects), [filteredProspects]);

  // --- Activity (uses all data, not filtered) ---
  const activity = useMemo(() => computeActivity(data), [data]);

  // --- Export handler ---
  const handleExport = useCallback(
    (format: ReportFormat) => {
      exportReport(format, {
        prospects: filteredProspects,
        savedLists: data.savedLists,
        organizationName: data.organization?.name ?? null,
        dateRangeLabel: DATE_RANGE_LABELS[filters.dateRange],
      });
    },
    [filteredProspects, data.savedLists, data.organization?.name, filters.dateRange]
  );

  const hasFilteredData = filteredProspects.length > 0;

  return (
    <div className="space-y-6">
      {/* Header with filters and export */}
      <AnalyticsHeader data={data} filters={filters} onFiltersChange={onFiltersChange} />

      {/* Bordered content container — proper dashboard page surface */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="space-y-10">
          {/* ================================================================
              Executive KPI Cards
              ================================================================ */}
          <motion.section variants={staggerContainerFast} initial="hidden" animate="visible">
            <SectionTitle title="Executive Overview" subtitle="Key metrics from your prospect database" />
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              <MetricCard
                label="Total Prospects"
                value={kpis.total}
                icon="prospects"
                iconColor="text-blue-600"
                iconBg="bg-blue-50"
                trend={kpis.totalTrend.direction}
                trendValue={kpis.totalTrend.percent}
              />
              <MetricCard
                label="Qualified Leads"
                value={kpis.qualified}
                icon="target"
                iconColor="text-violet-600"
                iconBg="bg-violet-50"
                trend={kpis.qualifiedTrend.direction}
                trendValue={kpis.qualifiedTrend.percent}
              />
              <MetricCard
                label="Conversion Rate"
                value={kpis.conversionRate}
                icon="sparkles"
                iconColor="text-emerald-600"
                iconBg="bg-emerald-50"
                format="percent"
                decimals={1}
                trend={kpis.conversionTrend.direction}
                trendValue={kpis.conversionTrend.percent}
              />
              <MetricCard
                label="Avg Lead Score"
                value={kpis.avgLeadScore}
                icon="analytics"
                iconColor="text-amber-600"
                iconBg="bg-amber-50"
                decimals={1}
                trend={kpis.leadScoreTrend.direction}
                trendValue={kpis.leadScoreTrend.percent}
              />
              <MetricCard
                label="High Intent"
                value={kpis.highIntent}
                icon="target"
                iconColor="text-rose-600"
                iconBg="bg-rose-50"
                trend={kpis.highIntentTrend.direction}
                trendValue={kpis.highIntentTrend.percent}
              />
              <MetricCard
                label="Monthly Growth"
                value={kpis.monthlyGrowth}
                icon="refresh"
                iconColor="text-cyan-600"
                iconBg="bg-cyan-50"
                format="percent"
                decimals={1}
                trend={kpis.monthlyGrowthTrend.direction}
                trendValue={kpis.monthlyGrowthTrend.percent}
              />
              <MetricCard
                label="Recently Added"
                value={kpis.recentlyAdded}
                icon="plus"
                iconColor="text-indigo-600"
                iconBg="bg-indigo-50"
                trend={kpis.recentlyAddedTrend.direction}
                trendValue={kpis.recentlyAddedTrend.percent}
              />
              <MetricCard
                label="Pipeline Value"
                value={kpis.pipelineValue}
                icon="organization"
                iconColor="text-slate-600"
                iconBg="bg-slate-100"
                format="currency"
                decimals={0}
                trend={kpis.pipelineTrend.direction}
                trendValue={kpis.pipelineTrend.percent}
              />
            </div>
          </motion.section>

          {/* ================================================================
              Prospect Growth — Line Chart
              ================================================================ */}
          <motion.section variants={fadeUp} initial="hidden" animate="visible">
            <SectionTitle title="Prospect Growth" subtitle="Prospects added over time" />
            <AnalyticsCard
              title="Growth Trend"
              subtitle={DATE_RANGE_LABELS[filters.dateRange]}
              icon="analytics"
              iconColor="text-blue-600"
              iconBg="bg-blue-50"
            >
              <ChartContainer height={240}>
                {hasFilteredData && timeSeries.length > 0 ? (
                  <AreaChart data={timeSeries} />
                ) : (
                  <SectionEmptyState title="No prospects in this period" description="Try changing the date range filter." icon="analytics" />
                )}
              </ChartContainer>
            </AnalyticsCard>
          </motion.section>

          {/* ================================================================
              Pipeline Analytics
              ================================================================ */}
          <motion.section variants={fadeUp} initial="hidden" animate="visible">
            <SectionTitle title="Pipeline Analytics" subtitle="Prospects grouped by sales stage" />
            <AnalyticsCard
              title="Pipeline Stages"
              subtitle="Distribution across your sales funnel"
              icon="target"
              iconColor="text-violet-600"
              iconBg="bg-violet-50"
            >
              {pipelineData.length > 0 ? (
                <DonutChart data={pipelineData} centerLabel="Pipeline" />
              ) : (
                <SectionEmptyState title="No pipeline data" icon="target" />
              )}
            </AnalyticsCard>
          </motion.section>

          {/* ================================================================
              Industry Analytics
              ================================================================ */}
          <motion.section variants={fadeUp} initial="hidden" animate="visible">
            <SectionTitle title="Industry Analytics" subtitle="Performance by industry" />
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <AnalyticsCard
                title="Top Industries"
                subtitle="Prospects per industry"
                icon="organization"
                iconColor="text-blue-600"
                iconBg="bg-blue-50"
              >
                {industryData.length > 0 ? (
                  <BarChart data={industryData} color="#3b82f6" maxItems={8} />
                ) : (
                  <SectionEmptyState title="No industry data" icon="organization" />
                )}
              </AnalyticsCard>

              <AnalyticsCard
                title="Industry Conversion"
                subtitle="Conversion rate by industry"
                icon="sparkles"
                iconColor="text-emerald-600"
                iconBg="bg-emerald-50"
              >
                {industryAnalytics.length > 0 ? (
                  <BarChart
                    data={industryAnalytics.map((i) => ({
                      label: i.industry,
                      value: i.conversionRate,
                    }))}
                    color="#10b981"
                    maxItems={8}
                  />
                ) : (
                  <SectionEmptyState title="No conversion data" icon="sparkles" />
                )}
              </AnalyticsCard>
            </div>
          </motion.section>

          {/* ================================================================
              Country Analytics
              ================================================================ */}
          <motion.section variants={fadeUp} initial="hidden" animate="visible">
            <SectionTitle title="Country Analytics" subtitle="Geographic prospect distribution" />
            <AnalyticsCard
              title="Top Countries"
              subtitle="Prospect distribution by country"
              icon="target"
              iconColor="text-cyan-600"
              iconBg="bg-cyan-50"
            >
              {countryData.length > 0 ? (
                <BarChart data={countryData} color="#06b6d4" maxItems={8} />
              ) : (
                <SectionEmptyState title="No country data" icon="target" />
              )}
            </AnalyticsCard>
          </motion.section>

          {/* ================================================================
              Lead Quality
              ================================================================ */}
          <motion.section variants={fadeUp} initial="hidden" animate="visible">
            <SectionTitle title="Lead Quality" subtitle="Scoring and intent distribution" />
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              <AnalyticsCard
                title="Lead Score"
                subtitle="Score distribution"
                icon="analytics"
                iconColor="text-amber-600"
                iconBg="bg-amber-50"
              >
                {leadScoreData.length > 0 ? (
                  <BarChart data={leadScoreData} color="#f59e0b" maxItems={6} />
                ) : (
                  <SectionEmptyState title="No lead score data" icon="analytics" />
                )}
              </AnalyticsCard>

              <AnalyticsCard
                title="AI Fit Score"
                subtitle="AI match distribution"
                icon="sparkles"
                iconColor="text-violet-600"
                iconBg="bg-violet-50"
              >
                {aiFitData.length > 0 ? (
                  <BarChart data={aiFitData} color="#8b5cf6" maxItems={6} />
                ) : (
                  <SectionEmptyState title="No AI fit data" icon="sparkles" />
                )}
              </AnalyticsCard>

              <AnalyticsCard
                title="Buying Intent"
                subtitle="Intent level distribution"
                icon="target"
                iconColor="text-rose-600"
                iconBg="bg-rose-50"
              >
                {buyingIntentData.length > 0 ? (
                  <BarChart data={buyingIntentData} color="#f43f5e" maxItems={3} />
                ) : (
                  <SectionEmptyState title="No buying intent data" icon="target" />
                )}
              </AnalyticsCard>
            </div>
          </motion.section>

          {/* ================================================================
              Activity Analytics
              ================================================================ */}
          <motion.section variants={fadeUp} initial="hidden" animate="visible">
            <SectionTitle title="Activity" subtitle="Latest changes across your workspace" />
            <AnalyticsCard
              title="Recent Activity"
              subtitle="Prospect updates and list changes"
              icon="refresh"
              iconColor="text-amber-600"
              iconBg="bg-amber-50"
            >
              {activity.length > 0 ? (
                <ActivityTimeline items={activity} />
              ) : (
                <SectionEmptyState title="No recent activity" description="Activity will appear here as you work with prospects and lists." icon="sparkles" />
              )}
            </AnalyticsCard>
          </motion.section>

          {/* ================================================================
              Export Reports — Integrated into layout
              ================================================================ */}
          <motion.section variants={fadeUp} initial="hidden" animate="visible">
            <SectionTitle title="Export Reports" subtitle="Download your analytics data" />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <ReportCard
                format="pdf"
                title="PDF Report"
                description="Formatted executive summary"
                icon="analytics"
                iconColor="text-red-600"
                iconBg="bg-red-50"
                onExport={handleExport}
                disabled={!hasFilteredData}
              />
              <ReportCard
                format="csv"
                title="CSV Export"
                description="Spreadsheet-compatible data"
                icon="lists"
                iconColor="text-emerald-600"
                iconBg="bg-emerald-50"
                onExport={handleExport}
                disabled={!hasFilteredData}
              />
              <ReportCard
                format="excel"
                title="Excel Export"
                description="Microsoft Excel format"
                icon="organization"
                iconColor="text-blue-600"
                iconBg="bg-blue-50"
                onExport={handleExport}
                disabled={!hasFilteredData}
              />
            </div>
          </motion.section>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Header
// ============================================================================

function AnalyticsHeader({
  data,
  filters,
  onFiltersChange,
}: {
  data: AnalyticsData;
  filters: AnalyticsFilterState;
  onFiltersChange: (f: AnalyticsFilterState) => void;
}) {
  return (
    <div className="dashboard-enter">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Analytics</h1>
          <p className="mt-1 text-sm text-slate-500">Understand your prospect pipeline with real-time business intelligence.</p>
        </div>
      </div>
      <div className="mt-4">
        <AnalyticsFilters
          filters={filters}
          onChange={onFiltersChange}
          industries={data.industries}
          countries={data.countries}
          organizationName={data.organization?.name}
        />
      </div>
    </div>
  );
}

// ============================================================================
// Section Title
// ============================================================================

function SectionTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-4">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">{title}</h2>
      {subtitle && <p className="mt-0.5 text-xs text-slate-400">{subtitle}</p>}
    </div>
  );
}

// ============================================================================
// Computation Helpers
// ============================================================================

/** Applies date range, industry, country, and status filters to prospects. */
function filterProspects(prospects: AnalyticsProspect[], filters: AnalyticsFilterState): AnalyticsProspect[] {
  let result = prospects;

  // Date range filter
  if (filters.dateRange !== "all") {
    const now = new Date();
    let cutoff: Date;

    switch (filters.dateRange) {
      case "today":
        cutoff = new Date(now);
        cutoff.setHours(0, 0, 0, 0);
        break;
      case "7d":
        cutoff = new Date(now);
        cutoff.setDate(cutoff.getDate() - 7);
        cutoff.setHours(0, 0, 0, 0);
        break;
      case "30d":
        cutoff = new Date(now);
        cutoff.setDate(cutoff.getDate() - 30);
        cutoff.setHours(0, 0, 0, 0);
        break;
      case "90d":
        cutoff = new Date(now);
        cutoff.setDate(cutoff.getDate() - 90);
        cutoff.setHours(0, 0, 0, 0);
        break;
      case "year":
        cutoff = new Date(now.getFullYear(), 0, 1);
        break;
      default:
        cutoff = new Date(0);
    }

    result = result.filter((p) => new Date(p.created_at) >= cutoff);
  }

  // Industry filter
  if (filters.industry !== "all") {
    result = result.filter((p) => p.industry === filters.industry);
  }

  // Country filter
  if (filters.country !== "all") {
    result = result.filter((p) => p.country === filters.country);
  }

  // Status filter
  if (filters.status !== "all") {
    result = result.filter((p) => p.status === filters.status);
  }

  return result;
}

interface TrendInfo {
  direction: "up" | "down" | "flat";
  percent: number;
}

/** Computes percentage change between two values. */
function computeTrend(current: number, previous: number): TrendInfo {
  if (previous === 0) {
    return current > 0 ? { direction: "up", percent: 100 } : { direction: "flat", percent: 0 };
  }
  const percent = ((current - previous) / previous) * 100;
  return {
    direction: getTrendDirection(percent),
    percent: Math.round(Math.abs(percent) * 10) / 10,
  };
}

/** Computes executive KPI values with trend indicators. */
function computeExecutiveKpis(
  prospects: AnalyticsProspect[],
  data: AnalyticsData
): {
  total: number;
  qualified: number;
  conversionRate: number;
  avgLeadScore: number;
  highIntent: number;
  monthlyGrowth: number;
  recentlyAdded: number;
  pipelineValue: number;
  totalTrend: TrendInfo;
  qualifiedTrend: TrendInfo;
  conversionTrend: TrendInfo;
  leadScoreTrend: TrendInfo;
  highIntentTrend: TrendInfo;
  monthlyGrowthTrend: TrendInfo;
  recentlyAddedTrend: TrendInfo;
  pipelineTrend: TrendInfo;
} {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const weekStart = new Date(now);
  weekStart.setDate(weekStart.getDate() - 7);

  // Current period counts
  const total = prospects.length;
  const qualified = prospects.filter((p) => p.status === "qualified" || p.status === "proposal_sent" || p.status === "negotiation" || p.status === "won").length;
  const won = prospects.filter((p) => p.status === "won").length;
  const conversionRate = total > 0 ? (won / total) * 100 : 0;
  const scored = prospects.filter((p) => p.lead_score !== null);
  const avgLeadScore = scored.length > 0 ? scored.reduce((sum, p) => sum + (p.lead_score ?? 0), 0) / scored.length : 0;
  const highIntent = prospects.filter((p) => p.buying_intent === "high").length;
  const recentlyAdded = prospects.filter((p) => new Date(p.created_at) >= weekStart).length;
  const pipelineValue = prospects.reduce((sum, p) => sum + (p.revenue ?? 0), 0);

  // Previous period counts (for trends)
  const prevProspects = data.prospects.filter((p) => {
    const d = new Date(p.created_at);
    return d >= prevMonthStart && d < monthStart;
  });
  const prevTotal = prevProspects.length;
  const prevQualified = prevProspects.filter((p) => p.status === "qualified" || p.status === "proposal_sent" || p.status === "negotiation" || p.status === "won").length;
  const prevWon = prevProspects.filter((p) => p.status === "won").length;
  const prevConversionRate = prevTotal > 0 ? (prevWon / prevTotal) * 100 : 0;
  const prevScored = prevProspects.filter((p) => p.lead_score !== null);
  const prevAvgLeadScore = prevScored.length > 0 ? prevScored.reduce((sum, p) => sum + (p.lead_score ?? 0), 0) / prevScored.length : 0;
  const prevHighIntent = prevProspects.filter((p) => p.buying_intent === "high").length;
  const prevRecentlyAdded = prevProspects.filter((p) => new Date(p.created_at) >= weekStart).length;
  const prevPipelineValue = prevProspects.reduce((sum, p) => sum + (p.revenue ?? 0), 0);

  // Monthly growth rate
  const monthlyGrowth = prevTotal > 0 ? ((total - prevTotal) / prevTotal) * 100 : 0;

  return {
    total,
    qualified,
    conversionRate,
    avgLeadScore,
    highIntent,
    monthlyGrowth,
    recentlyAdded,
    pipelineValue,
    totalTrend: computeTrend(total, prevTotal),
    qualifiedTrend: computeTrend(qualified, prevQualified),
    conversionTrend: computeTrend(conversionRate, prevConversionRate),
    leadScoreTrend: computeTrend(avgLeadScore, prevAvgLeadScore),
    highIntentTrend: computeTrend(highIntent, prevHighIntent),
    monthlyGrowthTrend: computeTrend(monthlyGrowth, 0),
    recentlyAddedTrend: computeTrend(recentlyAdded, prevRecentlyAdded),
    pipelineTrend: computeTrend(pipelineValue, prevPipelineValue),
  };
}

/** Computes industry, country, status, and lead quality distributions. */
function computeDistributions(prospects: AnalyticsProspect[]): {
  industryData: { label: string; value: number }[];
  countryData: { label: string; value: number }[];
  statusData: { label: string; value: number; color: string }[];
  leadScoreData: { label: string; value: number }[];
  aiFitData: { label: string; value: number }[];
  buyingIntentData: { label: string; value: number }[];
} {
  // Industry
  const industryMap = new Map<string, number>();
  for (const p of prospects) {
    const key = p.industry?.trim() || "Unknown";
    industryMap.set(key, (industryMap.get(key) ?? 0) + 1);
  }
  const industryData = Array.from(industryMap, ([label, value]) => ({ label, value }));

  // Country
  const countryMap = new Map<string, number>();
  for (const p of prospects) {
    const key = p.country?.trim() || "Unknown";
    countryMap.set(key, (countryMap.get(key) ?? 0) + 1);
  }
  const countryData = Array.from(countryMap, ([label, value]) => ({ label, value }));

  // Status
  const statusOrder = ["new", "contacted", "qualified", "proposal_sent", "negotiation", "won", "lost"];
  const statusMap = new Map<string, number>();
  for (const p of prospects) {
    statusMap.set(p.status, (statusMap.get(p.status) ?? 0) + 1);
  }
  const statusData = statusOrder
    .filter((s) => statusMap.has(s))
    .map((s) => ({
      label: STATUS_LABELS[s as ProspectStatus] ?? s,
      value: statusMap.get(s) ?? 0,
      color: STATUS_COLORS[s] ?? "#94a3b8",
    }));

  // Lead score buckets
  const leadScoreBuckets = [
    { label: "0-25", min: 0, max: 25 },
    { label: "26-50", min: 26, max: 50 },
    { label: "51-75", min: 51, max: 75 },
    { label: "76-100", min: 76, max: 100 },
  ];
  const leadScoreData = leadScoreBuckets.map((bucket) => ({
    label: bucket.label,
    value: prospects.filter((p) => p.lead_score !== null && p.lead_score >= bucket.min && p.lead_score <= bucket.max).length,
  })).filter((d) => d.value > 0);

  // AI fit score buckets
  const aiFitData = leadScoreBuckets.map((bucket) => ({
    label: bucket.label,
    value: prospects.filter((p) => p.ai_fit_score !== null && p.ai_fit_score >= bucket.min && p.ai_fit_score <= bucket.max).length,
  })).filter((d) => d.value > 0);

  // Buying intent
  const intentOrder = ["high", "medium", "low"];
  const intentMap = new Map<string, number>();
  for (const p of prospects) {
    intentMap.set(p.buying_intent, (intentMap.get(p.buying_intent) ?? 0) + 1);
  }
  const buyingIntentData = intentOrder
    .filter((i) => intentMap.has(i))
    .map((i) => ({
      label: i.charAt(0).toUpperCase() + i.slice(1),
      value: intentMap.get(i) ?? 0,
    }));

  return { industryData, countryData, statusData, leadScoreData, aiFitData, buyingIntentData };
}

/** Computes pipeline data for the donut chart. */
function computePipeline(prospects: AnalyticsProspect[]): { label: string; value: number; color: string }[] {
  const statusOrder = ["new", "contacted", "qualified", "proposal_sent", "negotiation", "won", "lost"];
  const statusMap = new Map<string, number>();
  for (const p of prospects) {
    statusMap.set(p.status, (statusMap.get(p.status) ?? 0) + 1);
  }
  return statusOrder
    .filter((s) => statusMap.has(s))
    .map((s) => ({
      label: STATUS_LABELS[s as ProspectStatus] ?? s,
      value: statusMap.get(s) ?? 0,
      color: STATUS_COLORS[s] ?? "#94a3b8",
    }));
}

/** Computes industry analytics with conversion rates. */
function computeIndustryAnalytics(prospects: AnalyticsProspect[]): { industry: string; count: number; conversionRate: number }[] {
  const industryMap = new Map<string, { count: number; won: number }>();
  for (const p of prospects) {
    const key = p.industry?.trim() || "Unknown";
    const entry = industryMap.get(key) ?? { count: 0, won: 0 };
    entry.count++;
    if (p.status === "won") entry.won++;
    industryMap.set(key, entry);
  }
  return Array.from(industryMap, ([industry, { count, won }]) => ({
    industry,
    count,
    conversionRate: count > 0 ? Math.round((won / count) * 100) : 0,
  })).sort((a, b) => b.count - a.count);
}

/** Computes time series data for the area chart. */
function computeTimeSeries(prospects: AnalyticsProspect[], dateRange: string): { date: string; count: number }[] {
  if (prospects.length === 0) return [];

  const now = new Date();
  const buckets: { start: Date; end: Date; label: string }[] = [];

  if (dateRange === "today") {
    // Hourly buckets for today
    for (let i = 0; i < 24; i++) {
      const start = new Date(now);
      start.setHours(i, 0, 0, 0);
      const end = new Date(start);
      end.setHours(i + 1, 0, 0, 0);
      buckets.push({
        start,
        end,
        label: `${i}:00`,
      });
    }
  } else if (dateRange === "7d" || dateRange === "30d") {
    // Daily buckets
    const days = dateRange === "7d" ? 7 : 30;
    for (let i = days - 1; i >= 0; i--) {
      const start = new Date(now);
      start.setDate(start.getDate() - i);
      start.setHours(0, 0, 0, 0);
      const end = new Date(start);
      end.setDate(end.getDate() + 1);
      buckets.push({
        start,
        end,
        label: start.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      });
    }
  } else if (dateRange === "90d") {
    // Weekly buckets
    const weeks = 13;
    for (let i = weeks - 1; i >= 0; i--) {
      const start = new Date(now);
      start.setDate(start.getDate() - i * 7);
      start.setHours(0, 0, 0, 0);
      const end = new Date(start);
      end.setDate(end.getDate() + 7);
      buckets.push({
        start,
        end,
        label: start.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      });
    }
  } else if (dateRange === "year") {
    // Monthly buckets for the year
    for (let i = 0; i < 12; i++) {
      const start = new Date(now.getFullYear(), i, 1);
      const end = new Date(now.getFullYear(), i + 1, 1);
      buckets.push({
        start,
        end,
        label: start.toLocaleDateString("en-US", { month: "short" }),
      });
    }
  } else {
    // "all" — monthly buckets from earliest prospect to now
    const earliest = new Date(
      prospects.reduce((min, p) => {
        const d = new Date(p.created_at).getTime();
        return d < min ? d : min;
      }, Date.now())
    );
    earliest.setDate(1);
    earliest.setHours(0, 0, 0, 0);

    const cursor = new Date(earliest);
    while (cursor <= now) {
      const end = new Date(cursor);
      end.setMonth(end.getMonth() + 1);
      buckets.push({
        start: new Date(cursor),
        end,
        label: cursor.toLocaleDateString("en-US", { month: "short", year: "2-digit" }),
      });
      cursor.setMonth(cursor.getMonth() + 1);
    }
  }

  // Count prospects in each bucket
  return buckets.map((bucket) => {
    const count = prospects.filter((p) => {
      const d = new Date(p.created_at);
      return d >= bucket.start && d < bucket.end;
    }).length;
    return { date: bucket.label, count };
  });
}

/** Computes activity items from all data (not filtered). */
function computeActivity(data: AnalyticsData): ActivityItem[] {
  const items: ActivityItem[] = [];

  // Prospect created activities
  for (const p of data.prospects.slice(0, 10)) {
    items.push({
      id: `created-${p.id}`,
      type: "prospect_created",
      title: "New prospect added",
      description: p.company_name || p.name,
      timestamp: p.created_at,
      icon: "plus",
      iconColor: "text-blue-600",
      iconBg: "bg-blue-50",
    });
  }

  // Prospect updated activities (where updated_at > created_at)
  const updated = data.prospects
    .filter((p) => new Date(p.updated_at).getTime() > new Date(p.created_at).getTime() + 1000)
    .slice(0, 10);
  for (const p of updated) {
    items.push({
      id: `updated-${p.id}`,
      type: "prospect_updated",
      title: "Prospect updated",
      description: `${p.company_name || p.name} — ${STATUS_LABELS[p.status as ProspectStatus] ?? p.status}`,
      timestamp: p.updated_at,
      icon: "refresh",
      iconColor: "text-amber-600",
      iconBg: "bg-amber-50",
    });
  }

  // Saved list created activities
  for (const list of data.savedLists.slice(0, 5)) {
    items.push({
      id: `list-${list.id}`,
      type: "list_created",
      title: "Saved list created",
      description: `${list.name} — ${list.prospectCount} prospect${list.prospectCount !== 1 ? "s" : ""}`,
      timestamp: list.created_at,
      icon: "lists",
      iconColor: "text-violet-600",
      iconBg: "bg-violet-50",
    });
  }

  // Sort by timestamp descending and take top 15
  return items
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 15);
}