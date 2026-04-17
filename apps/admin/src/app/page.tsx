import { SiteHeader } from "@/components/landing/site-header";
import { HeroSection } from "@/components/landing/hero-section";
import { FeaturesSection } from "@/components/landing/features-section";
import { WhatWeProvideSection } from "@/components/landing/what-we-provide";
import { HowItWorksSection } from "@/components/landing/how-it-works";
import { AboutSection } from "@/components/landing/about-section";
import { CTASection } from "@/components/landing/cta-section";
import { SiteFooter } from "@/components/landing/site-footer";

export default function Home() {
  return (
    <div className="min-h-screen bg-white font-sans text-gray-900 selection:bg-indigo-100 selection:text-indigo-900 overflow-x-hidden">
      <SiteHeader />
      <main>
        <HeroSection />
        <FeaturesSection />
        <WhatWeProvideSection />
        <HowItWorksSection />
        <AboutSection />
        <CTASection />
      </main>
      {/* <SiteFooter /> */}
    </div>
  );
}
