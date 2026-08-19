import ExploreHero from "@/components/marketing/explore/ExploreHero";
import ProspectDiscovery from "@/components/marketing/explore/ProspectDiscovery";
import ProspectIntelligence from "@/components/marketing/explore/ProspectIntelligence";
import WorkflowAction from "@/components/marketing/explore/WorkflowAction";

/**
 * Explore — public product exploration page.
 *
 * Phase 2: Hero experience.
 * Phase 3: Prospect Discovery section.
 * Phase 4: Prospect Intelligence section.
 * Phase 5: Workflow / Action section.
 *
 * The hero introduces what Prosventa is and invites the visitor into the
 * product story. The Prospect Discovery section demonstrates how Prosventa
 * helps users start with the right prospects — a focused workspace instead
 * of manual searching through scattered information. The Prospect
 * Intelligence section shows how Prosventa helps users understand the
 * context around a company so they can make better decisions. The Workflow
 * Action section demonstrates how Prosventa turns that intelligence into
 * an actionable next step — DISCOVER → UNDERSTAND → DECIDE → ACT.
 *
 * Future sections (larger interactive product demonstrations) will be added
 * in subsequent phases.
 *
 * The marketing layout provides the public Navigation + Footer shell.
 */
export default function ExplorePage() {
  return (
    <>
      <ExploreHero />

      {/* Phase 3 — Prospect Discovery */}
      <ProspectDiscovery />

      {/* Phase 4 — Prospect Intelligence */}
      <ProspectIntelligence />

      {/* Phase 5 — Workflow / Action */}
      <WorkflowAction />

      {/* Structural boundary — future sections will be added here. */}
      <div
        id="explore-how-it-works"
        className="scroll-mt-20 border-t border-slate-200/60 bg-slate-50"
      />
    </>
  );
}
