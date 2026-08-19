import { CommandCenterPage } from "@/features/intelligence/command-center/components/CommandCenterPage";
import { WorkspacePage } from "@/features/intelligence/workspace/components/WorkspacePage";

export const dynamic = "force-dynamic";

export default async function IntelligencePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const prospectParam = params.prospect;
  const prospectId =
    typeof prospectParam === "string" && prospectParam.trim().length > 0
      ? prospectParam.trim()
      : null;

  if (prospectId) {
    return <WorkspacePage prospectId={prospectId} />;
  }

  return <CommandCenterPage />;
}