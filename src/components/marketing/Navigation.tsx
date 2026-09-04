"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import TransitionLink from "@/components/transitions/TransitionLink";
import TransitionButton from "@/components/transitions/TransitionButton";
import { BrandLogo } from "@/components/branding/BrandLogo";

// Homepage navigation — anchors scroll to established homepage sections.
const navLinks = [
  { label: "Product", href: "#product" },
  { label: "Features", href: "#features" },
  { label: "Explore", href: "#explore" },
  { label: "Pricing", href: "#pricing" },
];

export default function Navigation() {
  const router = useRouter();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeSection, setActiveSection] = useState("");

  useEffect(() => {
    // Throttle scroll work to animation frames so layout reads don't run on
    // every scroll event.
    let ticking = false;
    const handleScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        ticking = false;
        setScrolled(window.scrollY > 20);

        // Active section detection
        const sections = navLinks.map((l) => l.href.slice(1));
        for (let i = sections.length - 1; i >= 0; i--) {
          const el = document.getElementById(sections[i]);
          if (el) {
            const rect = el.getBoundingClientRect();
            if (rect.top <= 150) {
              setActiveSection(sections[i]);
              break;
            }
          }
        }
      });
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  const handleNavClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    e.preventDefault();
    const target = document.querySelector(href);
    if (target) {
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    } else {
      // The section lives on the homepage — head there and let Next.js
      // position the anchor (e.g. clicking Pricing while on /explore).
      router.push(`/${href}`, { scroll: true });
    }
    setMobileOpen(false);
  };

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-200 ${
        scrolled
          ? "bg-white/85 backdrop-blur-xl border-b border-slate-200/70 shadow-sm"
          : "bg-transparent"
      }`}
    >
      <nav aria-label="Main" className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link
            href="/"
            className="flex items-center gap-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/40 rounded-lg"
            aria-label="Prosventa home"
          >
            <BrandLogo size="sm" iconSize={18} />
            <span className="text-lg font-semibold tracking-tight text-slate-900">
              Prosventa
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={(e) => handleNavClick(e, link.href)}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-blue-500/40 ${
                  activeSection === link.href.slice(1)
                    ? "text-slate-900 bg-slate-100/70"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/60"
                }`}
              >
                {link.label}
              </a>
            ))}
          </div>

          {/* Desktop CTA */}
          <div className="hidden md:flex items-center gap-3">
            <TransitionLink
              href="/login"
              className="px-3 py-2 rounded-md text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
            >
              Log in
            </TransitionLink>
            <TransitionButton
              href="/signup"
              className="inline-flex items-center justify-center rounded-lg bg-navy-900 px-4 py-2 text-sm font-medium text-white hover:bg-navy-800 transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
            >
              Get Started
            </TransitionButton>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden p-2 rounded-lg hover:bg-slate-100 transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileOpen}
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              {mobileOpen ? (
                <>
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </>
              ) : (
                <>
                  <line x1="4" y1="6" x2="20" y2="6" />
                  <line x1="4" y1="12" x2="20" y2="12" />
                  <line x1="4" y1="18" x2="20" y2="18" />
                </>
              )}
            </svg>
          </button>
        </div>
      </nav>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 top-16 z-40 md:hidden"
          >
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="absolute inset-0 bg-black/20 backdrop-blur-sm"
              onClick={() => setMobileOpen(false)}
            />

            {/* Menu Panel */}
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="relative mx-4 mt-2 rounded-2xl border border-slate-200 bg-white shadow-xl overflow-hidden"
            >
              <div className="py-4 px-5 space-y-1">
                {navLinks.map((link) => (
                  <a
                    key={link.href}
                    href={link.href}
                    onClick={(e) => handleNavClick(e, link.href)}
                    className={`block py-3 px-3 rounded-xl text-base font-medium transition-colors duration-150 ${
                      activeSection === link.href.slice(1)
                        ? "text-slate-900 bg-slate-100/70"
                        : "text-slate-700 hover:text-slate-900 hover:bg-slate-50"
                    }`}
                  >
                    {link.label}
                  </a>
                ))}
                <hr className="my-2 border-slate-100" />
                <TransitionLink
                  href="/login"
                  onClick={() => setMobileOpen(false)}
                  className="block py-3 px-3 rounded-xl text-base font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-50 transition-colors duration-150"
                >
                  Log in
                </TransitionLink>
                <TransitionButton
                  href="/signup"
                  className="block w-full py-3 px-3 rounded-xl text-base font-semibold text-center text-white bg-navy-900 hover:bg-navy-800 transition-colors duration-150 mt-1"
                >
                  Get Started
                </TransitionButton>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}