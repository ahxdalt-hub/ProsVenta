import Hero from "@/components/marketing/hero/Hero";
import ProductJourney from "@/components/marketing/product-journey/ProductJourney";
import Features from "@/components/marketing/features/Features";
import ProductExperience from "@/components/marketing/product-experience/ProductExperience";
import BrandOrigin from "@/components/marketing/brand-origin/BrandOrigin";
import Explore from "@/components/marketing/explore/Explore";
import PricingSection from "@/components/marketing/pricing/PricingSection";

// Public homepage — Phase 7.
// Hero, product journey (Find → Enrich → Understand → Prioritize → Act),
// feature overview, product experience preview, brand origin detail, the
// Explore bridge, and the global marketing footer rendered in the layout.
export default function HomePage() {
  return (
    <>
      <Hero />
      <ProductJourney />
      <Features />
      <ProductExperience />
      <BrandOrigin />
      <Explore />
      <PricingSection />
    </>
  );
}
