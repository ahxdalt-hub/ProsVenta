"use client";

// ============================================================================
// CreditInfo — interactive "How credits work" section for the pricing page
// ============================================================================
// A dark, spotlight-style card that breaks up the white cards around it and
// makes credit costs genuinely scannable:
//   - Grid of per-action cost tiles with icons and hover lift/glow.
//   - Cursor spotlight on the card surface.
//   - Three reassurance chips (failed actions, payment, no waste).
// Data comes from the page via props; icons are mapped by action name below.
// ============================================================================

import { useRef } from "react";
import {
  UserSearch,
  Building2,
  RadioTower,
  FileSearch,
  Search,
  Sparkles,
  RotateCcw,
  ShieldCheck,
  CreditCard,
  Coins,
} from "lucide-react";

export interface CreditCostItem {
  action: string;
  cost: number;
}

/** Icon + one-line "what you get" per action. Keys match CREDIT_COSTS.action. */
const ACTION_META: Record<string, { icon: typeof UserSearch; blurb: string }> = {
  "Prospect enrichment": {
    icon: UserSearch,
    blurb: "Verified emails, roles & profiles for a prospect",
  },
  "Company enrichment": {
    icon: Building2,
    blurb: "Firmographics and company intelligence",
  },
  "Intent signals": {
    icon: RadioTower,
    blurb: "Buying signals that surface live opportunities",
  },
  "Prospect research": {
    icon: FileSearch,
    blurb: "Deep AI research on an individual prospect",
  },
  "Company research": {
    icon: Search,
    blurb: "Deep AI research on an entire company",
  },
  "ICP scoring / AI recommendations": {
    icon: Sparkles,
    blurb: "Score fit & get AI-recommended next steps",
  },
};

const REASSURANCES = [
  {
    icon: RotateCcw,
    title: "No waste",
    text: "If an action fails, the reservation is released — you're never charged for work that doesn't complete.",
  },
  {
    icon: ShieldCheck,
    title: "Only on success",
    text: "Credits are consumed when the operation finishes, never when it starts.",
  },
  {
    icon: CreditCard,
    title: "Granted after payment",
    text: "Credits land in your workspace only after payment is confirmed.",
  },
];

const renderCost = (cost: number) => (
  <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-sm font-semibold text-amber-700 ring-1 ring-amber-200">
    <Coins className="h-3.5 w-3.5" />
    {cost} credit{cost > 1 ? "s" : ""}
  </span>
);

export default function CreditInfo({ costs }: { costs: CreditCostItem[] }) {
  const cardRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = cardRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    el.style.setProperty("--spotlight-x", `${e.clientX - rect.left}px`);
    el.style.setProperty("--spotlight-y", `${e.clientY - rect.top}px`);
  };

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      className="relative mt-20 overflow-hidden rounded-3xl border border-blue-100 bg-gradient-to-br from-blue-50 via-white to-indigo-50 px-6 py-14 shadow-lg shadow-blue-100/60 sm:px-10 lg:px-14"
    >
      {/* Cursor spotlight — soft blue glow tracking the pointer */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(600px circle at var(--spotlight-x, 50%) var(--spotlight-y, 0%), rgba(59, 130, 246, 0.10), transparent 65%)",
        }}
      />
      {/* Decorative gradient blobs */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-32 -right-24 h-72 w-72 rounded-full bg-blue-200/40 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-32 -left-24 h-72 w-72 rounded-full bg-indigo-200/40 blur-3xl"
      />
      {/* Top hairline highlight */}
      <div
        aria-hidden="true"
        className="absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-blue-400/60 to-transparent"
      />

      {/* Header */}
      <div className="relative mx-auto max-w-2xl text-center">
        <span className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-white px-3 py-1 text-xs font-medium text-blue-700 shadow-xs">
          <Coins className="h-3.5 w-3.5" />
          How credits work
        </span>
        <h2 className="mt-5 text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
          One currency for every{" "}
          <span className="text-gradient">intelligence action.</span>
        </h2>
        <p className="mt-4 text-base leading-relaxed text-slate-600">
          Credits fuel everything from a quick email lookup to deep AI research.
          Here&apos;s exactly what each action costs — no surprises, no hidden
          fees.
        </p>
      </div>

      {/* Per-action cost tiles */}
      <div className="relative mx-auto mt-12 grid w-full max-w-5xl grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {costs.map((item) => {
          const meta = ACTION_META[item.action];
          const Icon = meta?.icon ?? Coins;
          return (
            <div
              key={item.action}
              className="group rounded-2xl border border-blue-100 bg-white/80 p-5 shadow-xs backdrop-blur-sm transition-all duration-300 ease-out hover:-translate-y-1 hover:border-blue-300 hover:bg-white hover:shadow-lg hover:shadow-blue-200/50"
            >
              <div className="flex items-start justify-between gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 ring-1 ring-blue-100 transition-colors duration-300 group-hover:bg-blue-100 group-hover:text-blue-700">
                  <Icon className="h-5 w-5" />
                </span>
                {renderCost(item.cost)}
              </div>
              <h3 className="mt-4 text-sm font-semibold text-slate-900">
                {item.action}
              </h3>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-600">
                {meta?.blurb ?? "Core prospecting operation"}
              </p>
            </div>
          );
        })}
      </div>

      {/* Reassurance row */}
      <div className="relative mx-auto mt-10 grid w-full max-w-5xl grid-cols-1 gap-4 sm:grid-cols-3">
        {REASSURANCES.map(({ icon: Icon, title, text }) => (
          <div
            key={title}
            className="flex items-start gap-3 rounded-2xl border border-blue-100/70 bg-white/70 p-4 backdrop-blur-sm"
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 ring-1 ring-emerald-200">
              <Icon className="h-4 w-4" />
            </span>
            <div>
              <p className="text-sm font-semibold text-slate-900">{title}</p>
              <p className="mt-1 text-xs leading-relaxed text-slate-600">
                {text}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

