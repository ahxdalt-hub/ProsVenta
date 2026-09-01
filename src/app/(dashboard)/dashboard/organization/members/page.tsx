import { redirect } from "next/navigation";

// Legacy route. Member management is contextual inside /dashboard/organization
// (the "Manage Members" action opens the in-page Members window), so this
// standalone page was removed in Phase 4. Direct visits are redirected so old
// links and bookmarks keep working without a broken experience.
export default function MembersPage() {
  redirect("/dashboard/organization");
}
