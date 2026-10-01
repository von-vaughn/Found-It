import React from "react";
import { HeroSection } from "@/components/landing/HeroSection";
import { FoundItMarquee } from "@/components/landing/FoundItMarquee";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { CommunityReunions } from "@/components/landing/CommunityReunions";

interface HomePageProps {
  onBrowseLost: () => void;
  onBrowseFound: () => void;
}

export const HomePage: React.FC<HomePageProps> = ({
  onBrowseLost,
  onBrowseFound,
}) => {
  return (
    <div className="min-h-screen bg-white font-sans text-neutral-900 selection:bg-[#E5192D] selection:text-white">
      <main>
        <HeroSection
          onBrowseLost={onBrowseLost}
          onBrowseFound={onBrowseFound}
        />

        <FoundItMarquee />

        <HowItWorks onBrowseLost={onBrowseLost} />
      </main>

      <CommunityReunions />
    </div>
  );
};

export default HomePage;
