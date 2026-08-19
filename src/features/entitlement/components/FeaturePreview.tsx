"use client";

import { useCallback, useState } from "react";
import { Button } from "@/components/ui/Button";
import { PremiumBadge } from "./PremiumBadge";
import type { EntitlementState } from "../types";
import { formatPlanName } from "../resolver";

interface FeaturePreviewProps {
  entitlement: EntitlementState | null;
  title: string;
  description: string;
  benefits: string[];
  exampleFields: Array<{ label: string; placeholder: string }>;
  onUnlock?: () => void;
  onViewPlans?: () => void;
}

export function FeaturePreview({
  entitlement,
  title,
  description,
  benefits,
  exampleFields,
  onUnlock,
  onViewPlans,
}: FeaturePreviewProps) {
  const [showPreview, setShowPreview] = useState(false);

  const handleUnlock = useCallback(() => onUnlock?.(), [onUnlock]);
  const handleViewPlans = useCallback(() => onViewPlans?.(), [onViewPlans]);

  const isLocked =
    entitlement?.access === "plan_required" ||
    entitlement?.access === "insufficient_credits";
  const requiredPlan = entitlement?.requiredPlan
    ? formatPlanName(entitlement.requiredPlan)
    : "Pro";

  return (
    <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
      <div className="flex items-start justify-between gap-4 px-5 py-4 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
            {isLocked && (
              <PremiumBadge
                label={requiredPlan}
                tone={requiredPlan === "Business" ? "business" : "pro"}
              />
            )}
          </div>
          <p className="text-xs text-slate-500 mt-1">{description}</p>
        </div>
        {!showPreview && (
          <Button size="sm" variant="secondary" onClick={() => setShowPreview(true)}>
            Preview
          </Button>
        )}
      </div>

      {showPreview && (
        <div className="px-5 py-4 space-y-4">
          <div className="rounded-lg border border-slate-100 bg-slate-50/50 p-4">
            <p className="text-[11px] uppercase tracking-wider text-slate-400 font-medium mb-3">
              Example output
            </p>
            <div className="space-y-2.5">
              {exampleFields.map((field) => (
                <div key={field.label} className="flex items-center justify-between gap-3">
                  <span className="text-xs text-slate-500">{field.label}</span>
                  <span className="text-xs text-slate-300 italic truncate">
                    {field.placeholder}
                  </span>
                </div>
              ))}
            </div>
            <p className="text-[11px] text-slate-400 mt-3">
              Preview data shown for illustration only — not verified intelligence.
            </p>
          </div>

          <ul className="space-y-1.5">
            {benefits.map((benefit) => (
              <li key={benefit} className="flex items-start gap-2 text-xs text-slate-600">
                <svg className="w-3.5 h-3.5 text-green-500 shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                {benefit}
              </li>
            ))}
          </ul>

          {entitlement?.requiresCredits && entitlement.creditCost > 0 && (
            <div className="flex items-center justify-between rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
              <span className="text-xs text-amber-800">This action requires</span>
              <span className="text-xs font-semibold text-amber-900">
                {entitlement.creditCost} credit{entitlement.creditCost === 1 ? "" : "s"}
              </span>
            </div>
          )}

          <div className="flex items-center gap-2">
            {isLocked ? (
              <>
                <Button size="sm" onClick={handleUnlock}>
                  Unlock {requiredPlan}
                </Button>
                <Button size="sm" variant="ghost" onClick={handleViewPlans}>
                  View Plans
                </Button>
              </>
            ) : (
              <Button size="sm" onClick={handleUnlock}>
                Use this feature
              </Button>
            )}
            <Button size="sm" variant="ghost" onClick={() => setShowPreview(false)}>
              Hide preview
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}