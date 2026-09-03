import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { AuthPageContainer } from "@/components/auth/AuthPageContainer";
import { AuthContent } from "@/components/loading/AuthContent";
import { BrandIcon, BRAND_ORBIT_PATHS } from "@/components/branding/BrandIcon";

/**
 * Shared auth layout — "The Split Signal".
 *
 * A deliberate dark/light split: the left panel carries the brand (deep navy,
 * ghosted orbit glyph, editorial capability list); the right panel is a calm,
 * light surface where the auth form sits directly — no floating card.
 * The left panel hides below `lg` so mobile users reach the form immediately.
 */

const CAPABILITIES = [
  {
    label: "Find matching prospects",
    icon: (
      <>
        <circle cx="12" cy="12" r="7.5" />
        <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
        <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none" />
      </>
    ),
  },
  {
    label: "Enrich prospect information",
    icon: (
      <>
        <ellipse cx="12" cy="5" rx="8" ry="3" />
        <path d="M4 5v14c0 1.66 3.58 3 8 3s8-1.34 8-3V5" />
        <path d="M4 12c0 1.66 3.58 3 8 3s8-1.34 8-3" />
      </>
    ),
  },
  {
    label: "Understand useful signals",
    icon: <path d="M22 12h-4l-3 9L9 3l-3 9H2" />,
  },
  {
    label: "Prioritize who deserves attention",
    icon: (
      <>
        <circle cx="6" cy="6" r="2" />
        <circle cx="6" cy="18" r="2" />
        <path d="M10 6h10M10 18h10" />
      </>
    ),
  },
];

function BrandPanel() {
  return (
    <div className="relative flex h-full w-full flex-col justify-between overflow-hidden px-10 py-12 sm:px-14 xl:px-20">
      {/* Ghosted orbit — the brand glyph itself, blown up as ambient art */}
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <svg
          className="absolute -right-48 -bottom-56 h-[46rem] w-[46rem] rotate-[8deg] text-white"
          viewBox="0 0 24 24"
          fill="none"
        >
          {BRAND_ORBIT_PATHS.map((d, i) => (
            <path
              key={i}
              d={d}
              stroke="currentColor"
              strokeOpacity={0.05}
              strokeWidth={0.14}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ))}
        </svg>
        <div className="absolute -top-40 -left-32 h-96 w-96 rounded-full bg-blue-500/[0.08] blur-3xl" />
        <div className="absolute -bottom-32 right-1/4 h-80 w-80 rounded-full bg-indigo-500/[0.07] blur-3xl" />
        <div className="absolute inset-0 opacity-[0.04] grid-pattern" />
      </div>

      {/* Brand */}
      <div className="relative flex items-center gap-2.5">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/10 ring-1 ring-white/15">
          <BrandIcon size={20} />
        </div>
        <span className="text-lg font-semibold tracking-tight text-white">
          Prosventa
        </span>
      </div>

      {/* Statement + capabilities */}
      <div className="relative max-w-lg space-y-10">
        <div className="space-y-5">
          <h1 className="text-[2.5rem] font-semibold leading-[1.12] tracking-tight text-white xl:text-[3rem]">
            Turn your prospect data
            <br />
            into your next{" "}
            <span
              className="text-gradient"
              style={{
                backgroundImage:
                  "linear-gradient(120deg, #93c5fd 0%, #60a5fa 55%, #3b82f6 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              opportunity.
            </span>
          </h1>
          <p className="max-w-md text-[15px] leading-relaxed text-blue-200/70">
            Find prospects that fit your ideal customer profile, enrich their
            information, uncover useful signals, and focus on the accounts worth
            your attention.
          </p>
        </div>

        {/* Editorial capability list — hairline dividers, no chip clutter */}
        <ul className="max-w-md divide-y divide-white/[0.08] border-y border-white/[0.08]">
          {CAPABILITIES.map((cap) => (
            <li
              key={cap.label}
              className="flex items-center gap-3.5 py-3.5 text-sm text-blue-100/85"
            >
              <svg
                className="h-[17px] w-[17px] shrink-0 text-blue-300/80"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                {cap.icon}
              </svg>
              {cap.label}
            </li>
          ))}
        </ul>
      </div>

      <p className="relative text-xs text-blue-200/35">
        &copy; {new Date().getFullYear()} Prosventa. All rights reserved.
      </p>
    </div>
  );
}

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Redirect authenticated users away from auth pages
  if (user) {
    redirect("/dashboard");
  }

  return (
    <AuthPageContainer>
      <AuthContent />
      <div className="flex min-h-screen flex-col lg:flex-row">
        {/* Left brand panel — hidden on mobile so the form comes first */}
        <div className="relative hidden overflow-hidden bg-gradient-to-br from-navy-950 via-navy-900 to-navy-800 lg:block lg:w-[55%]">
          <BrandPanel />
        </div>

        {/* Right auth surface — calm, grounded, no floating card */}
        <div className="relative flex flex-1 flex-col bg-slate-50">
          {/* Compact brand strip for mobile/tablet */}
          <div className="flex items-center gap-2.5 px-6 pt-6 lg:hidden">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-navy-900">
              <BrandIcon size={16} />
            </div>
            <span className="text-base font-semibold tracking-tight text-slate-900">
              Prosventa
            </span>
          </div>

          <div className="flex flex-1 items-center justify-center px-6 py-10 sm:px-10 lg:px-16">
            <div className="w-full max-w-[400px]">{children}</div>
          </div>

          <p className="px-6 pb-6 text-center text-xs text-slate-400 lg:hidden">
            &copy; {new Date().getFullYear()} Prosventa. All rights reserved.
          </p>
        </div>
      </div>
    </AuthPageContainer>
  );
}