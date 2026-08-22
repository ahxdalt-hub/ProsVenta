import type { Metadata } from "next";
import ExploreInProgress from "@/components/marketing/explore/ExploreInProgress";

/**
 * Explore — temporary "under construction" experience.
 *
 * Original product-tour sections live in ExplorePageLegacy while this
 * route shows a colorful in-progress page.
 */
export const metadata: Metadata = {
  title: "Explore — Prosventa",
  description: "Explore is being rebuilt. Check back soon.",
};

export default function ExplorePage() {
  return <ExploreInProgress />;
}
