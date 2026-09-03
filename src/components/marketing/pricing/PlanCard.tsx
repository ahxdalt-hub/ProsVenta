"use client";

// ============================================================================
// PlanCard — shared pricing plan card with cursor-reactive polish
// ============================================================================
// Stripe/Apple-inspired interactions:
//   - Radial spotlight that follows the cursor across the card surface.
//   - Smooth lift + shadow expansion on hover.
//   - Hidden features ("+N more features") expand on hover and collapse on
//     mouse-out using an animated grid-template-rows transition (no jump).
// ============================================================================

import { useRef, useState } from "react";
import { Check } from "lucide-react";
import TransitionButton from "@/components/transitions/TransitionButton";

export interface PlanCardProps {
  name: string;
  description: string;
  price: string;
  interval: string;
  credits: string;
  label?: string | null;
  isPopular?: boolean;
  features: string[];
  /** Number of features always visible; the rest reveal on hover. */
  visibleCount?: number;
  ctaText: string;
  ctaHref: string;
  /** Optional extra classes applied to the card root (e.g. width/height overrides). */
  className?: string;
}

export default function PlanCard({
  name,
  description,
  price,
  interval,
  credits,
  label = null,
  isPopular = false,
  features,
  visibleCount = 6,
  ctaText,
  ctaHref,
  className = "",
}: PlanCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [hovered, setHovered] = useState(false);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = cardRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    el.style.setProperty("--spotlight-x", `${e.clientX - rect.left}px`);
    el.style.setProperty("--spotlight-y", `${e.clientY - rect.top}px`);
  };

  const visibleFeatures = features.slice(0, visibleCount);
  const hiddenFeatures = features.slice(visibleCount);

  const renderFeatureRow = (feature: string) => (
    <li key={feature} className="flex items-start gap-2.5">
      <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-600 transition-colors duration-300 group-hover:bg-blue-100">
        <Check className="h-2.5 w-2.5" strokeWidth={3} />
      </span>
      <span className="text-sm leading-relaxed text-slate-600">
        {feature}
      </span>
    </li>
  );

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={`group relative flex flex-col overflow-hidden rounded-2xl border bg-white p-6 transition-all duration-300 ease-out hover:-translate-y-1.5 focus-within:-translate-y-1.5 ${className} ${
        isPopular
          ? "border-blue-200 shadow-md shadow-blue-100/50 ring-1 ring-blue-100 hover:border-blue-300 hover:shadow-lg hover:shadow-blue-200/40"
          : "border-slate-200 shadow-xs hover:border-slate-300 hover:shadow-xl hover:shadow-slate-200/50"
      }`}
    >
      {/* Cursor spotlight — radial glow that tracks the pointer */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 ease-out group-hover:opacity-100 group-focus-within:opacity-100"
        style={{
          background:
            "radial-gradient(420px circle at var(--spotlight-x, 50%) var(--spotlight-y, 0%), rgba(59, 130, 246, 0.07), transparent 65%)",
        }}
      />

      {/* Top edge highlight — subtle gradient hairline */}
      <div
        aria-hidden="true"
        className={`pointer-events-none absolute inset-x-6 top-0 h-px transition-opacity duration-500 ${
          isPopular
            ? "bg-gradient-to-r from-transparent via-blue-400/60 to-transparent"
            : "bg-gradient-to-r from-transparent via-slate-300/60 to-transparent opacity-0 group-hover:opacity-100"
        }`}
      />

      {/* Plan Header */}
      <div className="relative flex items-center justify-between">
        <h2 className="text-lg font-semibold tracking-tight text-slate-900">
          {name}
        </h2>
        {label && (
          <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-[11px] font-semibold text-blue-700">
            {label}
          </span>
        )}
      </div>

      <p className="relative mt-2 text-sm leading-relaxed text-slate-500">
        {description}
      </p>

      {/* Price */}
      <div className="relative mt-5">
        <span className="text-4xl font-semibold tracking-tight text-slate-900">
          {price}
        </span>
        <span className="ml-1.5 text-sm text-slate-500">{interval}</span>
      </div>

      {/* Credits */}
      <div className="relative mt-2">
        <span className="text-2xl font-semibold tracking-tight text-slate-700">
          {credits}
        </span>
        <span className="ml-1.5 text-sm text-slate-500">credits / month</span>
      </div>

      {/* Features */}
      <ul className="relative mt-6 flex-1 space-y-2.5">
        {visibleFeatures.map(renderFeatureRow)}

        {/* Hidden features — smoothly expand on hover, collapse on leave */}
        {hiddenFeatures.length > 0 && (
          <li>
            <div
              aria-hidden={!hovered}
              className={`grid transition-[grid-template-rows,opacity] duration-500 ease-in-out ${
                hovered
                  ? "grid-rows-[1fr] opacity-100"
                  : "grid-rows-[0fr] opacity-0"
              }`}
            >
              <ul className="overflow-hidden">
                <div className="space-y-2.5 pt-2.5">
                  {hiddenFeatures.map(renderFeatureRow)}
                </div>
              </ul>
            </div>
          </li>
        )}
      </ul>

      {/* "+N more features" hint — fades out while hidden features expand */}
      {hiddenFeatures.length > 0 && (
        <p
          className={`relative mt-2.5 text-sm text-slate-400 transition-all duration-300 ease-in-out ${
            hovered
              ? "max-h-0 -translate-y-1 opacity-0"
              : "max-h-6 translate-y-0 opacity-100"
          }`}
        >
          +{hiddenFeatures.length} more features
        </p>
      )}

      {/* CTA */}
      <TransitionButton
        href={ctaHref}
        className={`btn-press relative mt-8 inline-flex items-center justify-center rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-blue-500/40 ${
          isPopular
            ? "bg-navy-900 text-white shadow-md hover:bg-navy-800"
            : "border border-slate-300 bg-white text-slate-700 shadow-xs hover:border-slate-400 hover:bg-slate-50 hover:text-slate-900"
        }`}
      >
        {ctaText}
      </TransitionButton>
    </div>
  );
}
