"use client";

import { useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/Button";
import type { EntitlementState } from "../types";
import { formatPlanName } from "../resolver";

// ============================================================================
// Upgrade Prompt
// Stage 5 — Feature Access, Plan Entitlements & Curiosity-Driven Upgrade UX
// ============================================================================
// Contextual upgrade prompt shown at the moment the user reaches the valuable
// action. Explains:
//   1. What they get.
//   2. Why it matters.
//   3. What it costs.
//   4. What upgrade unlocks.
// ============================================================================

interface UpgradePromptProps {
  open: boolean;
  onClose: () => void;
  entitlement: EntitlementState | null;
  title?: string;
  description?: string;
  benefits?: string[];
  onUpgrade?: () => void;
}

export function UpgradePrompt({
  open,
  onClose,
  entitlement,
  title,
  description,
  benefits,
  onUpgrade,
}: UpgradePromptProps) {
  const handleUpgrade = useCallback(() => {
    onUpgrade?.();
    onClose();
  }, [onUpgrade, onClose]);

  const isInsufficientCredits = entitlement?.access === "insufficient_credits";
  const requiredPlan = entitlement?.requiredPlan
    ? formatPlanName(entitlement.requiredPlan)
    : "Pro";

  const defaultBenefits = isInsufficientCredits
    ? [
        "Top up your credit balance to continue using this feature.",
        "Credits are consumed only on successful operations.",
        "Upgrade your plan for a higher monthly credit allowance.",
      ]
    : [
        `Unlock ${requiredPlan} features and start using this today.`,
        "Credits are consumed only on successful operations.",
        "No long-term commitment — upgrade or downgrade anytime.",
      ];

  const displayBenefits = benefits ?? defaultBenefits;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm"
          onClick={onClose}
          role="presentation"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label={isInsufficientCredits ? "Insufficient credits" : "Upgrade required"}
          >
            {/* Icon */}
            <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-blue-50 text-blue-600 mb-4">
              <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
              </svg>
            </div>

            <h3 className="text-lg font-bold text-slate-900 tracking-tight">
              {title ?? (isInsufficientCredits ? "Insufficient credits" : `Available on ${requiredPlan}`)}
            </h3>
            <p className="mt-1.5 text-sm text-slate-500 leading-relaxed">
              {description ??
                (isInsufficientCredits
                  ? "You've used all your available credits for this feature. Top up your balance or upgrade your plan to continue."
                  : `This feature is available on the ${requiredPlan} plan. Upgrade to unlock it and start using it today.`)}
            </p>

            {/* Credit cost */}
            {entitlement?.requiresCredits && entitlement.creditCost > 0 && (
              <div className="mt-4 rounded-xl bg-slate-50 border border-slate-200 p-4 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600">This action requires</span>
                  <span className="text-sm font-semibold text-slate-900">
                    {entitlement.creditCost} credit{entitlement.creditCost === 1 ? "" : "s"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600">Your plan</span>
                  <span className="text-sm font-semibold text-slate-900">
                    {formatPlanName(entitlement.currentPlan)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600">Available</span>
                  <span className="text-sm font-semibold text-slate-900">
                    {entitlement.creditBalance} credits
                  </span>
                </div>
              </div>
            )}

            {/* Benefits */}
            <ul className="mt-4 space-y-2">
              {displayBenefits.map((benefit) => (
                <li key={benefit} className="flex items-start gap-2 text-sm text-slate-600">
                  <svg className="w-4 h-4 text-green-500 shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  {benefit}
                </li>
              ))}
            </ul>

            {/* Actions */}
            <div className="mt-6 flex items-center justify-end gap-2">
              <Button variant="secondary" onClick={onClose}>
                {isInsufficientCredits ? "Not now" : "Maybe later"}
              </Button>
              <Button onClick={handleUpgrade}>
                {isInsufficientCredits ? "View Plans" : `Upgrade to ${requiredPlan}`}
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}