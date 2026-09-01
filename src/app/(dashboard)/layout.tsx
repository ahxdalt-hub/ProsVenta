import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { DashboardShell } from "@/components/dashboard/layout/DashboardShell";
import { ShellDataProvider } from "@/components/dashboard/layout/ShellDataProvider";
import { ThemeProvider } from "@/components/dashboard/settings/ThemeProvider";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Check if user has completed onboarding and fetch settings in parallel
  const [{ data: profile }, { data: settings }] = await Promise.all([
    supabase
      .from("profiles")
      .select(
        "onboarding_completed, full_name, company_name, avatar_url, job_role"
      )
      .eq("id", user.id)
      .single(),
    supabase
      .from("user_settings")
      .select("reduced_motion")
      .eq("user_id", user.id)
      .single(),
  ]);

  if (!profile?.onboarding_completed) {
    redirect("/onboarding");
  }

  const workspaceName = profile.company_name || "Prosventa";
  const userEmail = user.email ?? "P";
  const userName = profile.full_name ?? "";

  // Generate a signed URL for the user's avatar (stored in a private bucket)
  let avatarUrl: string | null = null;
  if (profile.avatar_url) {
    const { data: signedUrl } = await supabase.storage
      .from("profile-images")
      .createSignedUrl(profile.avatar_url, 3600);
    avatarUrl = signedUrl?.signedUrl ?? null;
  }

  // Derive initial reduced motion from server data
  const initialReducedMotion = settings?.reduced_motion ?? false;

  return (
    <ThemeProvider initialReducedMotion={initialReducedMotion}>
      {/* Single shared identity source for the whole dashboard shell — the
          layout re-renders on navigation so signed URLs stay fresh. */}
      <ShellDataProvider
        initialData={{
          workspaceName,
          userEmail,
          userName,
          avatarUrl,
        }}
      >
        <DashboardShell
          workspaceName={workspaceName}
          userEmail={userEmail}
          userName={userName}
          avatarUrl={avatarUrl}
          jobRole={profile.job_role ?? null}
        >
          {children}
        </DashboardShell>
      </ShellDataProvider>
    </ThemeProvider>
  );
}
