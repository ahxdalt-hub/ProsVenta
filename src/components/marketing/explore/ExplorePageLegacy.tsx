import ExploreHero from "./ExploreHero";
import ProspectDiscovery from "./ProspectDiscovery";
import ProspectIntelligence from "./ProspectIntelligence";
import WorkflowAction from "./WorkflowAction";

/**
 * Explore — ORIGINAL public product exploration page.
 *
 * ARCHIVED — TEMPORARILY HIDDEN.
 *
 * This is the previous Explore composition, preserved verbatim while the
 * /explore route renders the temporary "currently being refined" experience
 * (see ExploreInProgress). None of the section components were modified.
 *
 * To restore the original experience, render <ExplorePageLegacy /> from the
 * route file instead of <ExploreInProgress />.
 */
export default function ExplorePageLegacy() {
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