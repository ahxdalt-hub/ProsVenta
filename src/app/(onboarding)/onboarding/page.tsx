import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import OnboardingForm from "./OnboardingForm";
import { WorkspaceContent } from "@/components/loading/WorkspaceContent";

export default async function OnboardingPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Check if onboarding is already completed
  const { data: profile } = await supabase
    .from("profiles")
    .select("onboarding_completed")
    .eq("id", user.id)
    .single();

  if (profile?.onboarding_completed) {
    redirect("/dashboard");
  }

  return (
    <WorkspaceContent>
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header */}
      <header className="w-full border-b border-slate-200 bg-white/80 backdrop-blur-xl">
        <div className="max-w-3xl mx-auto px-6 py-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-navy-900 flex items-center justify-center">
              <span className="text-white font-bold text-sm">P</span>
            </div>
            <span className="text-lg font-bold text-navy-900">Prosventa</span>
          </div>
        </div>
      </header>

      {/* Main content */}
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-[560px] mx-auto animate-fade-in-up">
          <div className="rounded-2xl border border-slate-200 bg-white/80 backdrop-blur-xl shadow-sm p-8 sm:p-10">
            <OnboardingForm />
          </div>
        </div>
      </div>
    </div>
    </WorkspaceContent>
  );
}
