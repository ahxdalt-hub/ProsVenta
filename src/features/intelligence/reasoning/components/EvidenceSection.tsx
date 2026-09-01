"use client";

// ============================================================================
// Prosventa Intelligence — Evidence Section
// Feature 4 — Phase 3. Expandable, inline evidence inspection. Each item is a
// REAL stored evidence reference (signal / enrichment / prospect data) with
// source, observed date, freshness and verification status. No navigation
// away from the prospect workflow.
// ============================================================================

import { useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";
import { formatRelativeTime } from "@/features/intelligence/signals/components/signal-display";
import type { IntelligenceEvidenceItem } from "../view";

const PANEL_EASE = [0.16, 1, 0.3, 1] as [number, number, number, number];

function verificationLabel(freshness: string | null): { label: string; tone: string } {
  switch (freshness) {
    case "fresh":
      return { label: "Fresh", tone: "text-green-700" };
    case "aging":
      return { label: "Aging", tone: "text-amber-700" };
    case "historical":
      return { label: "Historical", tone: "text-slate-500" };
    default:
      return { label: "Unverified", tone: "text-slate-400" };
  }
}

export function EvidenceSection({ items }: { items: IntelligenceEvidenceItem[] }) {
  const [openId, setOpenId] = useState<string | null>(null);
  if (items.length === 0) return null;

  return (
    <section aria-label="Intelligence evidence">
      <div className="flex items-baseline justify-between">
        <h3 className="text-sm font-semibold text-slate-900">Evidence</h3>
        <span className="text-xs text-slate-400">
          Based on available evidence · {items.length} item{items.length > 1 ? "s" : ""}
        </span>
      </div>
      <ul className="mt-3 divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white">
        {items.map((item) => (
          <EvidenceItem
            key={item.refId}
            item={item}
            open={openId === item.refId}
            onToggle={() => setOpenId((cur) => (cur === item.refId ? null : item.refId))}
          />
        ))}
      </ul>
    </section>
  );
}


function EvidenceItem({
  item,
  open,
  onToggle,
}: {
  item: IntelligenceEvidenceItem;
  open: boolean;
  onToggle: () => void;
}) {
  const reduceMotion = useReducedMotion();
  const verification = verificationLabel(item.freshness);

  return (
    <li>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors duration-150 hover:bg-slate-50/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500"
      >
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium text-slate-700">
            {item.note || item.typeLabel}
          </span>
          <span className="mt-0.5 block truncate text-xs text-slate-400">
            {item.typeLabel}
            {item.source ? ` · ${item.source}` : ""}
            {item.occurredAt ? ` · ${formatRelativeTime(item.occurredAt)}` : ""}
          </span>
        </span>
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={cn(
            "h-4 w-4 shrink-0 text-slate-400 transition-transform duration-200",
            open && "rotate-180"
          )}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="details"
            initial={reduceMotion ? { opacity: 0 } : { height: 0, opacity: 0 }}
            animate={reduceMotion ? { opacity: 1 } : { height: "auto", opacity: 1 }}
            exit={reduceMotion ? { opacity: 0 } : { height: 0, opacity: 0 }}
            transition={{ duration: reduceMotion ? 0.1 : 0.22, ease: PANEL_EASE }}
            className="overflow-hidden"
          >
            <dl className="grid grid-cols-1 gap-x-6 gap-y-2 border-t border-slate-100 bg-slate-50/50 px-4 py-3 sm:grid-cols-2">
              <EvidenceField label="Type" value={item.typeLabel} />
              <EvidenceField label="Source" value={item.source ?? "Not recorded"} />
              <EvidenceField
                label="Observed"
                value={
                  item.occurredAt ? (
                    <>
                      {formatRelativeTime(item.occurredAt)}
                      <span className="ml-1 font-normal text-slate-300">
                        ({new Date(item.occurredAt).toLocaleDateString()})
                      </span>
                    </>
                  ) : (
                    "Unknown"
                  )
                }
              />
              <div>
                <dt className="text-[11px] font-medium uppercase tracking-wider text-slate-400">
                  Status
                </dt>
                <dd className="mt-0.5 text-xs">
                  <span className={cn("font-medium", verification.tone)}>{verification.label}</span>
                  {item.capturedAt && (
                    <span className="ml-1 text-slate-400">
                      · captured {formatRelativeTime(item.capturedAt)}
                    </span>
                  )}
                </dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-[11px] font-medium uppercase tracking-wider text-slate-400">
                  Relationship to intelligence
                </dt>
                <dd className="mt-0.5 text-xs leading-relaxed text-slate-500">
                  This record is one of the evidence sources the intelligence for this
                  prospect was built on.
                </dd>
              </div>
            </dl>
          </motion.div>
        )}
      </AnimatePresence>
    </li>
  );
}

function EvidenceField({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-[11px] font-medium uppercase tracking-wider text-slate-400">{label}</dt>
      <dd className="mt-0.5 text-xs text-slate-600">{value}</dd>
    </div>
  );
}
