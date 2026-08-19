import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { AuthPageContainer } from "@/components/auth/AuthPageContainer";
import { AuthContent } from "@/components/loading/AuthContent";
import { BrandIcon } from "@/components/branding/BrandIcon";

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
      <div className="min-h-screen flex flex-col lg:flex-row">
        {/* Left brand panel - hidden on mobile */}
        <div className="hidden lg:flex lg:w-1/2 relative bg-gradient-to-br from-navy-950 via-navy-900 to-navy-800 overflow-hidden">
          {/* Abstract background shapes */}
          <div className="absolute inset-0">
            <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-blue-500/10 blur-3xl" />
            <div className="absolute -bottom-40 -left-40 w-80 h-80 rounded-full bg-indigo-500/10 blur-3xl" />
            <div className="absolute top-1/3 left-1/4 w-64 h-64 rounded-full bg-cyan-500/5 blur-3xl" />
            <div className="absolute bottom-1/4 right-1/3 w-48 h-48 rounded-full bg-blue-400/5 blur-2xl" />
            {/* Grid pattern overlay */}
            <div className="absolute inset-0 opacity-[0.04] grid-pattern" />
          </div>

          {/* Content */}
          <div className="relative flex flex-col justify-between p-12 w-full animate-fade-in">
            <div className="flex items-center gap-2.5">
              <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-white/10 backdrop-blur-sm">
                <BrandIcon size={20} />
              </div>
              <span className="text-lg font-semibold tracking-tight text-white">Prosventa</span>
            </div>

            <div className="space-y-5">
              <h2 className="text-4xl font-bold tracking-tight text-white leading-tight">
                Find your next<br />
                <span className="text-gradient" style={{ backgroundImage: "linear-gradient(135deg, #60a5fa 0%, #3b82f6 50%, #93c5fd 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
                  big opportunity
                </span>
              </h2>
              <p className="text-base text-blue-200/80 max-w-md leading-relaxed">
                Discover and connect with qualified prospects that match your ideal customer profile.
                Turn data into revenue.
              </p>
              <div className="flex items-center gap-4 pt-2">
                <div className="flex -space-x-2">
                  {[1, 2, 3, 4].map((i) => (
                    <div
                      key={i}
                      className="w-9 h-9 rounded-full ring-2 ring-navy-900 bg-slate-600/50"
                    />
                  ))}
                </div>
                <p className="text-sm text-blue-200/60">
                  Join thousands of businesses
                </p>
              </div>
            </div>

            <p className="text-xs text-blue-200/40">
              &copy; {new Date().getFullYear()} Prosventa. All rights reserved.
            </p>
          </div>
        </div>

        {/* Right auth panel */}
        <div className="flex-1 flex items-center justify-center p-4 sm:p-8 lg:p-12 bg-slate-50">
          <div className="w-full max-w-[440px] animate-fade-in">
            {children}
          </div>
        </div>
      </div>
    </AuthPageContainer>
  );
}