"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { SettingsCard, SettingsCardHeader, SettingsRow } from "../SettingsCard";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { useToast } from "@/components/ui/toast";
import type { Organization, SubscriptionPlan } from "@/types/database";

interface BillingSectionProps {
  organization: Organization | null;
  isOwner: boolean;
}

const PLANS: {
  id: SubscriptionPlan;
  name: string;
  price: string;
  period: string;
  description: string;
  features: string[];
  highlighted?: boolean;
}[] = [
  {
    id: "free",
    name: "Starter",
    price: "$0",
    period: "forever",
    description: "For individuals exploring prospect discovery",
    features: [
      "Up to 100 prospects",
      "3 saved lists",
      "Basic search & discovery",
      "CSV import & export",
      "Community support",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    price: "$29",
    period: "per user / month",
    description: "For growing teams that need serious pipeline",
    features: [
      "Unlimited prospects",
      "Unlimited saved lists",
      "AI-powered prospect scoring",
      "Advanced filters & saved views",
      "Automation workflows",
      "Priority support",
    ],
    highlighted: true,
  },
  {
    id: "business",
    name: "Business",
    price: "$79",
    period: "per user / month",
    description: "For organizations scaling outbound motion",
    features: [
      "Everything in Pro",
      "Team collaboration & roles",
      "Advanced analytics & reports",
      "API access & webhooks",
      "Custom integrations",
      "Dedicated success manager",
    ],
  },
  {
    id: "enterprise",
    name: "Enterprise",
    price: "Custom",
    period: "annual billing",
    description: "For large organizations with custom needs",
    features: [
      "Everything in Business",
      "SSO / SAML",
      "Custom data residency",
      "SLA & uptime guarantee",
      "Security review & audit",
      "24/7 dedicated support",
    ],
  },
];

const INVOICES = [
  {
    id: "INV-2025-001",
    date: "Aug 1, 2025",
    amount: "$29.00",
    status: "paid" as const,
    description: "Pro plan — monthly subscription",
  },
  {
    id: "INV-2025-002",
    date: "Jul 1, 2025",
    amount: "$29.00",
    status: "paid" as const,
    description: "Pro plan — monthly subscription",
  },
  {
    id: "INV-2025-003",
    date: "Jun 1, 2025",
    amount: "$29.00",
    status: "paid" as const,
    description: "Pro plan — monthly subscription",
  },
];

export function BillingSection({ organization }: BillingSectionProps) {
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan>(
    organization?.subscription_plan ?? "free"
  );
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [showCancel, setShowCancel] = useState(false);
  const { success: toastSuccess, info: toastInfo } = useToast();

  const currentPlan = PLANS.find((p) => p.id === selectedPlan) ?? PLANS[0];

  function handleSelectPlan(planId: SubscriptionPlan) {
    if (planId === selectedPlan) return;
    setSelectedPlan(planId);
    setShowUpgrade(true);
  }

  function handleConfirmUpgrade() {
    setShowUpgrade(false);
    toastSuccess(
      "Plan updated",
      `Your workspace is now on the ${PLANS.find((p) => p.id === selectedPlan)?.name} plan.`
    );
  }

  function handleCancelSubscription() {
    setShowCancel(false);
    toastInfo(
      "Cancellation scheduled",
      "Your subscription will end at the end of the current billing period."
    );
  }

  return (
    <div className="space-y-6">
      {/* Current plan */}
      <SettingsCard>
        <SettingsCardHeader
          title="Current Plan"
          description="Your workspace subscription and billing details"
          icon={
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="5" width="20" height="14" rx="2" />
              <line x1="2" y1="10" x2="22" y2="10" />
            </svg>
          }
          action={
            <Badge variant={selectedPlan === "free" ? "neutral" : "primary"}>
              {currentPlan.name}
            </Badge>
          }
        />
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold tracking-tight text-slate-900">
                {currentPlan.price}
              </span>
              <span className="text-sm text-slate-500">{currentPlan.period}</span>
            </div>
            <p className="mt-1 text-sm text-slate-500 leading-relaxed">
              {currentPlan.description}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {selectedPlan !== "enterprise" && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setShowUpgrade(true)}
              >
                Upgrade Plan
              </Button>
            )}
            {selectedPlan !== "free" && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowCancel(true)}
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                Cancel
              </Button>
            )}
          </div>
        </div>
      </SettingsCard>

      {/* Plan selection */}
      <SettingsCard>
        <SettingsCardHeader
          title="Available Plans"
          description="Choose the plan that fits your team"
          icon={
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
            </svg>
          }
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {PLANS.map((plan) => (
            <button
              key={plan.id}
              type="button"
              onClick={() => handleSelectPlan(plan.id)}
              className={`settings-card-interactive relative flex flex-col rounded-xl border p-5 text-left transition-all duration-150 ${
                selectedPlan === plan.id
                  ? "border-blue-500 bg-blue-50/50 ring-2 ring-blue-500/20"
                  : "border-slate-200 bg-white hover:border-slate-300"
              }`}
              aria-pressed={selectedPlan === plan.id}
            >
              {plan.highlighted && (
                <span className="absolute top-3 right-3">
                  <Badge variant="primary">Popular</Badge>
                </span>
              )}
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-900">{plan.name}</h3>
                {selectedPlan === plan.id && (
                  <span className="flex items-center justify-center w-5 h-5 rounded-full bg-blue-600 text-white">
                    <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </span>
                )}
              </div>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="text-xl font-bold text-slate-900">{plan.price}</span>
                <span className="text-xs text-slate-500">{plan.period}</span>
              </div>
              <p className="mt-1 text-xs text-slate-500 leading-relaxed">{plan.description}</p>
              <ul className="mt-3 space-y-1.5">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-1.5 text-xs text-slate-600">
                    <svg className="w-3.5 h-3.5 text-green-500 shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    {feature}
                  </li>
                ))}
              </ul>
            </button>
          ))}
        </div>
      </SettingsCard>

      {/* Payment method */}
      <SettingsCard>
        <SettingsCardHeader
          title="Payment Method"
          description="Your default payment method for subscriptions"
          icon={
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
              <line x1="1" y1="10" x2="23" y2="10" />
            </svg>
          }
        />
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-slate-50 text-slate-500">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
                <line x1="1" y1="10" x2="23" y2="10" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium text-slate-900">No payment method on file</p>
              <p className="text-[13px] text-slate-500">Add a card to upgrade your plan</p>
            </div>
          </div>
          <Button variant="secondary" size="sm" disabled>
            Add Card
          </Button>
        </div>
        <p className="mt-3 text-[13px] text-slate-500 leading-relaxed">
          Stripe integration is coming soon. You will be able to securely manage your payment methods and billing details.
        </p>
      </SettingsCard>

      {/* Invoices */}
      <SettingsCard>
        <SettingsCardHeader
          title="Invoices"
          description="Your billing history and receipts"
          icon={
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
            </svg>
          }
        />
        {INVOICES.length > 0 ? (
          <div className="divide-y divide-slate-100">
            {INVOICES.map((invoice) => (
              <div key={invoice.id} className="flex items-center justify-between gap-4 py-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-900">{invoice.id}</p>
                  <p className="text-[13px] text-slate-500 mt-0.5">{invoice.description}</p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-sm font-semibold text-slate-900">{invoice.amount}</span>
                  <Badge variant="success">{invoice.status}</Badge>
                  <button
                    type="button"
                    className="text-xs font-medium text-blue-600 hover:text-blue-700 hover:underline"
                  >
                    Download
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-slate-50 text-slate-400 mb-3">
              <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
              </svg>
            </div>
            <p className="text-sm font-medium text-slate-900">No invoices yet</p>
            <p className="mt-1 text-[13px] text-slate-500">Your billing history will appear here.</p>
          </div>
        )}
      </SettingsCard>

      {/* Billing contact */}
      <SettingsCard>
        <SettingsCardHeader
          title="Billing Contact"
          description="Who should receive billing communications"
          icon={
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          }
        />
        <SettingsRow
          title="Billing Email"
          description="Invoices and receipts will be sent to this address"
        >
          <span className="text-sm font-medium text-slate-900">
            {organization?.name ? "billing@" : "Not set"}
          </span>
        </SettingsRow>
      </SettingsCard>

      {/* Upgrade confirmation modal */}
      <AnimatePresence>
        {showUpgrade && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm"
            onClick={() => setShowUpgrade(false)}
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
              aria-label="Upgrade plan"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-bold text-slate-900 tracking-tight">
                    Upgrade to {PLANS.find((p) => p.id === selectedPlan)?.name}
                  </h3>
                  <p className="mt-1 text-sm text-slate-500">
                    You are about to change your workspace plan. This will take effect immediately.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowUpgrade(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                  aria-label="Close"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
              <div className="mt-4 rounded-xl bg-slate-50 border border-slate-200 p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600">Plan</span>
                  <span className="text-sm font-semibold text-slate-900">
                    {PLANS.find((p) => p.id === selectedPlan)?.name}
                  </span>
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-sm text-slate-600">Price</span>
                  <span className="text-sm font-semibold text-slate-900">
                    {PLANS.find((p) => p.id === selectedPlan)?.price} /{" "}
                    {PLANS.find((p) => p.id === selectedPlan)?.period}
                  </span>
                </div>
              </div>
              <div className="mt-6 flex items-center justify-end gap-2">
                <Button variant="secondary" onClick={() => setShowUpgrade(false)}>
                  Cancel
                </Button>
                <Button onClick={handleConfirmUpgrade}>
                  Confirm Upgrade
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Cancel confirmation modal */}
      <AnimatePresence>
        {showCancel && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm"
            onClick={() => setShowCancel(false)}
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
              aria-label="Cancel subscription"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-bold text-slate-900 tracking-tight">
                    Cancel subscription?
                  </h3>
                  <p className="mt-1 text-sm text-slate-500">
                    Your workspace will be downgraded to the Starter plan at the end of the current billing period. You will lose access to Pro features immediately.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowCancel(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                  aria-label="Close"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
              <div className="mt-4 rounded-xl bg-amber-50 border border-amber-200 p-4">
                <p className="text-sm text-amber-800 leading-relaxed">
                  You will lose access to AI-powered scoring, automation workflows, and advanced analytics once your subscription ends.
                </p>
              </div>
              <div className="mt-6 flex items-center justify-end gap-2">
                <Button variant="secondary" onClick={() => setShowCancel(false)}>
                  Keep Plan
                </Button>
                <Button variant="danger" onClick={handleCancelSubscription}>
                  Cancel Subscription
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}