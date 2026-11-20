import React from "react";
import { HeroSection } from "@/components/landing/HeroSection";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { FoundItMarquee } from "@/components/landing/FoundItMarquee";

interface HomePageProps {
  onBrowseLost: () => void;
  onBrowseFound: () => void;
}

export const HomePage: React.FC<HomePageProps> = ({
  onBrowseLost,
  onBrowseFound,
}) => {
  return (
    <div className="min-h-screen bg-white dark:bg-neutral-950 font-sans text-neutral-900 dark:text-neutral-100 selection:bg-[#E5192D] selection:text-white">
      <main>
        <HeroSection
          onBrowseLost={onBrowseLost}
          onBrowseFound={onBrowseFound}
        />

        <FoundItMarquee />

        <HowItWorks />
      </main>
    </div>
  );
};

export default HomePage;
