import Hero from "@/components/marketing/hero/Hero";
import ProductJourney from "@/components/marketing/product-journey/ProductJourney";
import ProductExperience from "@/components/marketing/product-experience/ProductExperience";
import BrandOrigin from "@/components/marketing/brand-origin/BrandOrigin";
import Explore from "@/components/marketing/explore/Explore";

// Public homepage — Phase 7.
// This phase delivers the hero, the product journey, the product experience
// preview, the brand origin detail, the Explore bridge, and the global
// marketing footer rendered in the layout.
export default function HomePage() {
  return (
    <>
      <Hero />
      <ProductJourney />
      <ProductExperience />
      <BrandOrigin />
      <Explore />
    </>
  );
}
