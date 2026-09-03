"use client";

import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import TransitionLink from "@/components/transitions/TransitionLink";
import { BrandWordmark } from "@/components/branding/BrandWordmark";
import { MARKETING_ROUTES } from "@/components/marketing/routes";

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

function FooterColumn({
  title,
  links,
}: {
  title: string;
  links: { label: string; href: string }[];
}) {
  return (
    <div>
      <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
        {title}
      </h4>
      <ul className="mt-5 space-y-3">
        {links.map((link) => (
          <li key={link.label}>
            <TransitionLink
              href={link.href}
              className="group inline-flex items-center gap-1.5 text-sm text-slate-500 transition-colors duration-200 hover:text-blue-600"
            >
              <span className="relative">
                {link.label}
                {/* Animated underline — slides in on hover */}
                <span
                  aria-hidden="true"
                  className="absolute -bottom-0.5 left-0 h-px w-full origin-left scale-x-0 bg-blue-500 transition-transform duration-300 ease-out group-hover:scale-x-100"
                />
              </span>
              {/* Arrow — fades/slides in on hover */}
              <ArrowRight
                aria-hidden="true"
                className="h-3.5 w-3.5 -translate-x-1 opacity-0 transition-all duration-300 ease-out group-hover:translate-x-0 group-hover:opacity-100"
              />
            </TransitionLink>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function Footer() {
  const reduce = useReducedMotion();

  const exploreLinks = [
    { label: "Explore Prosventa", href: MARKETING_ROUTES.EXPLORE },
    { label: "Pricing", href: MARKETING_ROUTES.PRICING },
    { label: "Get Started", href: MARKETING_ROUTES.GET_STARTED },
  ];

  const legalLinks = [
    { label: "Privacy", href: "/privacy" },
    { label: "Terms", href: "/terms" },
    { label: "Security", href: "/security" },
  ];

  return (
    <motion.footer
      initial={reduce ? false : { opacity: 0 }}
      whileInView={reduce ? undefined : { opacity: 1 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.5, ease: EASE }}
      className="relative overflow-hidden border-t border-slate-200 bg-white/60"
    >
      {/* Top hairline highlight — matches the pricing page cards */}
      <div
        aria-hidden="true"
        className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-blue-400/50 to-transparent"
      />
      {/* Soft decorative glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-32 left-1/2 h-64 w-[36rem] -translate-x-1/2 rounded-full bg-blue-100/40 blur-3xl"
      />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Main Footer Content */}
        <div className="py-14 sm:py-16 grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr] lg:gap-8">
          {/* Column 1 — Brand */}
          <div>
            <BrandWordmark
              logoSize="sm"
              text="Prosventa"
              textClassName="text-lg text-slate-900"
            />
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-slate-500">
              Prospecting intelligence for finding and understanding better
              opportunities.
            </p>
          </div>

          {/* Column 2 — Explore */}
          <FooterColumn title="Explore" links={exploreLinks} />

          {/* Column 3 — Legal */}
          <FooterColumn title="Legal" links={legalLinks} />
        </div>

        {/* Bottom Section */}
        <div className="py-8 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-slate-400">
            &copy; {new Date().getFullYear()} Prosventa. All rights reserved.
          </p>
          <p className="text-xs text-slate-400">
            Finding opportunities is where every venture begins.
          </p>
        </div>
      </div>
    </motion.footer>
  );
}