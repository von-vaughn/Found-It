import { useState } from "react";
import { Toaster } from "react-hot-toast";
import { Navbar } from "@/components/Navbar";
import { HeroSection } from "@/components/HeroSection";
import { FoundItMarquee } from "@/components/FoundItMarquee";
import { ItemsFeed } from "@/components/ItemsFeed";
import { HowItWorks } from "@/components/HowItWorks";
import { CommunityReunions } from "@/components/CommunityReunions";
import { Footer } from "@/components/Footer";
import { initialItems } from "@/data/mockItems";

export function App() {
  const items = initialItems;
  const [navActiveTab, setNavActiveTab] = useState("home");
  const [feedType, setFeedType] = useState<"all" | "lost" | "found">("all");

  const handleBrowseItems = (type: "lost" | "found") => {
    setFeedType(type);
    setNavActiveTab(type);
    const itemsElem = document.getElementById("items");
    if (itemsElem) {
      itemsElem.scrollIntoView({ behavior: "smooth" });
    }
  };

  const handleBrowseFound = () => handleBrowseItems("found");
  const handleBrowseLost = () => handleBrowseItems("lost");

  return (
    <div className="min-h-screen bg-white font-sans text-neutral-900 selection:bg-[#E5192D] selection:text-white">
      {/* Toast notifications */}
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            borderRadius: "16px",
            background: "#171717",
            color: "#fff",
            fontSize: "13px",
            fontWeight: 500,
          },
        }}
      />

      {/* Navigation */}
      <Navbar
        onBrowseItems={handleBrowseItems}
        activeTab={navActiveTab}
        setActiveTab={(tab) => {
          setNavActiveTab(tab);
          if (tab === "lost") setFeedType("lost");
          if (tab === "found") setFeedType("found");
          if (tab === "home") setFeedType("all");
        }}
      />

      {/* Hero Section */}
      <main>
        <HeroSection
          onBrowseLost={handleBrowseLost}
          onBrowseFound={handleBrowseFound}
        />

        {/* Infinite Moving 'found it' Marquee */}
        <FoundItMarquee />

        {/* Interactive Items Feed */}
        <ItemsFeed
          items={items}
          onBrowseItems={handleBrowseItems}
          feedType={feedType}
          setFeedType={setFeedType}
        />

        {/* How It Works */}
        <HowItWorks onBrowseLost={handleBrowseLost} />
      </main>

      {/* Footer */}
      <Footer />

      {/* Big Display LOST AND FOUND Section */}
      <CommunityReunions />
    </div>
  );
}

export default App;
