import { ArrowLeft } from "lucide-react";
import { BRAND_ORBIT_PATHS } from "@/components/branding/BrandIcon";
import TransitionLink from "@/components/transitions/TransitionLink";
import "./explore-in-progress.css";

/**
 * ExploreInProgress — colorful "we're still working on this" page for /explore.
 *
 * Centerpiece is a looping Prosventa orbit: gradient brand mark, rotating rings,
 * and drifting color nodes. Animation is opacity/transform only.
 */

const MICROCOPY = [
  "rearranging pixels until they confess",
  "teaching the logo to look busy",
  "almost impressive, give or take a quarter",
  "please don't refresh. it won't help.",
];

function ColorfulLogo() {
  return (
    <div aria-hidden="true" className="explore-stage">
      <div className="explore-glow" />

      <svg className="explore-rings" viewBox="0 0 280 280">
        <defs>
          <linearGradient id="explore-ring-a" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#6366f1" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#22d3ee" stopOpacity="0.15" />
          </linearGradient>
          <linearGradient id="explore-ring-b" x1="100%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.85" />
            <stop offset="100%" stopColor="#ec4899" stopOpacity="0.12" />
          </linearGradient>
          <linearGradient id="explore-ring-c" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#34d399" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.12" />
          </linearGradient>
        </defs>
        <ellipse
          className="explore-ring explore-ring-a"
          cx="140"
          cy="140"
          rx="118"
          ry="78"
          fill="none"
          stroke="url(#explore-ring-a)"
          strokeWidth="1.6"
        />
        <ellipse
          className="explore-ring explore-ring-b"
          cx="140"
          cy="140"
          rx="96"
          ry="116"
          fill="none"
          stroke="url(#explore-ring-b)"
          strokeWidth="1.4"
        />
        <ellipse
          className="explore-ring explore-ring-c"
          cx="140"
          cy="140"
          rx="108"
          ry="108"
          fill="none"
          stroke="url(#explore-ring-c)"
          strokeWidth="1.2"
          strokeDasharray="6 10"
        />
      </svg>

      <span className="explore-sat explore-sat-1" />
      <span className="explore-sat explore-sat-2" />
      <span className="explore-sat explore-sat-3" />
      <span className="explore-sat explore-sat-4" />

      <div className="explore-mark">
        <svg width="56" height="56" viewBox="0 0 24 24" fill="none">
          <defs>
            <linearGradient id="explore-logo-grad" x1="2" y1="2" x2="22" y2="22">
              <stop offset="0%" stopColor="#818cf8" />
              <stop offset="45%" stopColor="#3b82f6" />
              <stop offset="100%" stopColor="#22d3ee" />
            </linearGradient>
          </defs>
          <path
            d={BRAND_ORBIT_PATHS[0]}
            stroke="url(#explore-logo-grad)"
            strokeWidth="2.15"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d={BRAND_ORBIT_PATHS[1]}
            stroke="url(#explore-logo-grad)"
            strokeWidth="2.15"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d={BRAND_ORBIT_PATHS[2]}
            stroke="url(#explore-logo-grad)"
            strokeWidth="2.15"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d={BRAND_ORBIT_PATHS[3]}
            stroke="#f59e0b"
            strokeWidth="2.15"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx="16.2" cy="3" r="1.15" fill="#ec4899" />
        </svg>
      </div>
    </div>
  );
}

export default function ExploreInProgress() {
  return (
    <main
      id="main-content"
      className="explore-page relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-6 py-16 text-center"
    >
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="explore-aurora explore-aurora-1" />
        <div className="explore-aurora explore-aurora-2" />
        <div className="explore-aurora explore-aurora-3" />
        <div className="explore-aurora explore-aurora-4" />
      </div>

      <div
        className="relative animate-fade-up"
        style={{ animationDelay: "40ms" }}
      >
        <span className="explore-badge">
          <span className="explore-badge-dot" />
          Under construction
        </span>
      </div>

      <h1
        className="relative mt-7 max-w-3xl text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl lg:text-[56px] lg:leading-[1.08] animate-fade-up"
        style={{ animationDelay: "100ms" }}
      >
        This page is currently
        <span className="explore-headline-accent"> pretending to be ready.</span>
      </h1>

      <div className="relative mt-10 animate-fade-up" style={{ animationDelay: "160ms" }}>
        <ColorfulLogo />
      </div>

      <div aria-hidden className="relative mt-2 h-12 w-full max-w-lg">
        {MICROCOPY.map((text, index) => (
          <span
            key={text}
            className={`explore-microcopy explore-microcopy-${index + 1} absolute inset-0 flex items-center justify-center px-4 text-center text-[13px] italic leading-snug text-slate-500`}
          >
            {text}
          </span>
        ))}
      </div>

      <p
        className="relative mx-auto mt-8 max-w-lg text-base leading-relaxed text-slate-600 animate-fade-up"
        style={{ animationDelay: "220ms" }}
      >
        We hid Explore behind this little light show while we rebuild it into
        something that actually, you know, explores. Progress is happening.
        Just not on a schedule you would respect.
      </p>

      <p
        className="relative mt-4 max-w-md text-sm italic text-slate-500 animate-fade-up"
        style={{ animationDelay: "280ms" }}
      >
        If you came here expecting a product tour, congratulations — you found
        the waiting room. Complimentary sarcasm included.
      </p>

      <div className="relative mt-10 animate-fade-up" style={{ animationDelay: "320ms" }}>
        <TransitionLink
          href="/"
          ariaLabel="Back to Prosventa"
          className="explore-back group inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white"
        >
          <ArrowLeft className="h-4 w-4 transition-transform duration-200 group-hover:-translate-x-0.5" />
          Back to something that exists
        </TransitionLink>
      </div>
    </main>
  );
}
