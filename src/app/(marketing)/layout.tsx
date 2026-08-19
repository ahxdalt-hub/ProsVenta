import Navigation from "@/components/marketing/Navigation";
import Footer from "@/components/marketing/Footer";

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Navigation />
      <main
        id="main-content"
        className="min-h-screen bg-slate-50 text-slate-900 antialiased"
      >
        {children}
      </main>
      <Footer />
    </>
  );
}