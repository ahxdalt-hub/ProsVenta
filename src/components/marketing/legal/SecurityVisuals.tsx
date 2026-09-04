"use client";

// ============================================================================
// Prosventa Security — page-specific visual primitives.
// ============================================================================
// Extends the shared legal design system (LegalPage) with the visuals the
// Security page needs: verified-control chips, security feature cards, the
// data-isolation layer stack, and the end-to-end authorization flow.
//
// Design notes:
//   - Same calm motion language as the legal pages (gentle reveals, gated
//     behind prefers-reduced-motion).
//   - Status indicators describe implemented controls only — no fake live
//     dashboards and no fabricated metrics.
//   - Icons support hierarchy; they do not decorate every line.
//   - Icon selection is data-driven by name so server components can pass
//     it across the client boundary.
// ============================================================================

import { motion, useReducedMotion } from "framer-motion";
import {
  ArrowDown,
  Building2,
  CreditCard,
  Database,
  Eye,
  Globe,
  KeyRound,
  Layers3,
  Lock,
  Server,
  ShieldCheck,
  User,
  UserCheck,
} from "lucide-react";
import type { ComponentType, ReactNode } from "react";

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

/* -------------------------------- Icons --------------------------------- */

export type SecurityIconName =
  | "user"
  | "lock"
  | "building"
  | "user-check"
  | "database"
  | "server"
  | "globe"
  | "layers"
  | "key"
  | "credit-card"
  | "shield"
  | "eye";

type IconComponent = ComponentType<{ className?: string }>;

const ICONS: Record<SecurityIconName, IconComponent> = {
  user: User,
  lock: Lock,
  building: Building2,
  "user-check": UserCheck,
  database: Database,
  server: Server,
  globe: Globe,
  layers: Layers3,
  key: KeyRound,
  "credit-card": CreditCard,
  shield: ShieldCheck,
  eye: Eye,
};

/* ------------------------------ Trust chips ----------------------------- */

/** Hero chip row — verified, implemented controls (accessible list). */
export function TrustChips({ items }: { items: string[] }) {
  return (
    <ul aria-label="Implemented security controls" className="flex flex-wrap gap-2.5">
      {items.map((label) => (
        <li
          key={label}
          className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/80 px-3.5 py-1.5 text-[13px] font-medium text-slate-700 shadow-[0_1px_2px_rgba(15,23,42,0.04)]"
        >
          <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          {label}
        </li>
      ))}
    </ul>
  );
}

/* ---------------------------- Security cards ---------------------------- */

/** Subtle "implemented" status label — text + dot, never color alone. */
function StatusImplemented() {
  return (
    <span className="inline-flex shrink-0 items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-emerald-700">
      <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
      Implemented
    </span>
  );
}

interface SecurityCard {
  icon: SecurityIconName;
  title: string;
  children: ReactNode;
}

/** Grid of security feature cards with implemented-status indicators. */
export function SecurityCardGrid({ items }: { items: SecurityCard[] }) {
  const reduce = useReducedMotion();
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {items.map((item, index) => {
        const Icon = ICONS[item.icon];
        return (
          <motion.div
            key={item.title}
            initial={reduce ? false : { opacity: 0, y: 14 }}
            whileInView={reduce ? undefined : { opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-40px" }}
            transition={{
              duration: 0.4,
              ease: EASE,
              delay: reduce ? 0 : Math.min(index, 5) * 0.05,
            }}
            className="group flex flex-col rounded-xl border border-slate-200 bg-white p-5 transition-colors duration-200 hover:border-blue-200"
          >
            <div className="flex items-center justify-between gap-3">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                <Icon className="h-[18px] w-[18px]" aria-hidden="true" />
              </span>
              <StatusImplemented />
            </div>
            <h3 className="mt-4 text-sm font-semibold text-slate-900">{item.title}</h3>
            <p className="mt-1.5 text-[13px] leading-relaxed text-slate-500">
              {item.children}
            </p>
          </motion.div>
        );
      })}
    </div>
  );
}

/* --------------------------- Isolation layers ---------------------------- */

export interface IsolationLayer {
  title: string;
  meta: string;
  children: ReactNode;
}

/** The layered data-isolation model, rendered as a connected stack. */
export function IsolationLayers({ items }: { items: IsolationLayer[] }) {
  const reduce = useReducedMotion();
  return (
    <ol aria-label="Layers of data isolation" className="max-w-3xl">
      {items.map((layer, index) => (
        <li key={layer.title}>
          <motion.div
            initial={reduce ? false : { opacity: 0, y: 12 }}
            whileInView={reduce ? undefined : { opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-40px" }}
            transition={{
              duration: 0.4,
              ease: EASE,
              delay: reduce ? 0 : index * 0.06,
            }}
            className="flex items-start gap-4 rounded-xl border border-slate-200 bg-white p-4 transition-colors duration-200 hover:border-slate-300 sm:p-5"
          >
            <span
              aria-hidden
              className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-[12px] font-semibold tabular-nums text-slate-500"
            >
              {String(index + 1).padStart(2, "0")}
            </span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <h3 className="text-sm font-semibold text-slate-900">
                  {layer.title}
                </h3>
                <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-700">
                  {layer.meta}
                </span>
              </div>
              <p className="mt-1 text-[13px] leading-relaxed text-slate-500">
                {layer.children}
              </p>
            </div>
          </motion.div>
          {index < items.length - 1 && (
            <div aria-hidden className="flex justify-start py-1 pl-8">
              <ArrowDown className="h-4 w-4 text-slate-300" />
            </div>
          )}
        </li>
      ))}
    </ol>
  );
}

/* -------------------------- Architecture flow ---------------------------- */

export interface FlowStage {
  icon: SecurityIconName;
  title: string;
  children: ReactNode;
}

/** End-to-end authorization flow — a polished vertical diagram. */
export function ArchitectureFlow({ stages }: { stages: FlowStage[] }) {
  const reduce = useReducedMotion();
  return (
    <div className="relative max-w-3xl">
      {/* Vertical rail through the icon column */}
      <div
        aria-hidden
        className="absolute bottom-8 left-[21px] top-8 w-px bg-gradient-to-b from-blue-200 via-slate-200 to-transparent"
      />
      <ol
        aria-label="How access is verified from sign-in to data"
        className="space-y-3"
      >
        {stages.map((stage, index) => {
          const Icon = ICONS[stage.icon];
          return (
            <motion.li
              key={stage.title}
              initial={reduce ? false : { opacity: 0, x: -10 }}
              whileInView={reduce ? undefined : { opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{
                duration: 0.4,
                ease: EASE,
                delay: reduce ? 0 : index * 0.05,
              }}
              className="relative flex items-start gap-3.5"
            >
              <span className="relative z-10 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-blue-600 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
                <Icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <div className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-4 py-3 transition-colors duration-200 hover:border-blue-200 sm:px-5">
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
                  <h3 className="text-sm font-semibold text-slate-900">
                    {stage.title}
                  </h3>
                  <span className="text-[10px] font-semibold uppercase tracking-[0.12em] tabular-nums text-slate-400">
                    Stage {String(index + 1).padStart(2, "0")}
                  </span>
                </div>
                <p className="mt-1 text-[13px] leading-relaxed text-slate-500">
                  {stage.children}
                </p>
              </div>
            </motion.li>
          );
        })}
      </ol>
    </div>
  );
}

/* ------------------------------ Note block ------------------------------- */

/** Small, neutral note — used for the page disclaimer. */
export function SecurityNote({ children }: { children: ReactNode }) {
  return (
    <div className="max-w-3xl rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
      <p className="text-[13px] leading-relaxed text-slate-500">{children}</p>
    </div>
  );
}