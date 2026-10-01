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
      {/* Main Landing Page Content */}
      <main>
        {/* Hero Section with interactive phone demo & CTAs */}
        <HeroSection
          onBrowseLost={onBrowseLost}
          onBrowseFound={onBrowseFound}
        />

        {/* Infinite Moving 'found it' Marquee */}
        <FoundItMarquee />

        {/* How It Works - Process explanation */}
        <HowItWorks onBrowseLost={onBrowseLost} />
      </main>

      {/* Big Display LOST AND FOUND Section */}
      <CommunityReunions />
    </div>
  );
};

export default HomePage;
