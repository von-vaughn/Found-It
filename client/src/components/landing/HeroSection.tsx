import React, { useState, useEffect, useRef } from "react";
import gsap from "gsap";
import {
  ArrowRight,
  PlusCircle,
  Backpack,
  Smartphone,
  KeyRound,
  Wallet,
  Headphones,
  Glasses,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import {
  ItemSearchBar,
  type ItemSearchType,
} from "@/components/landing/ItemSearchBar";

interface HeroSectionProps {
  onBrowseLost: () => void;
  onBrowseFound: () => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({
  onBrowseLost,
  onBrowseFound,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchType, setSearchType] = useState<ItemSearchType>("lost");
  const navigate = useNavigate();

  const heroRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const subtitleRef = useRef<HTMLParagraphElement>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const ctaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: "power3.out" } });

      tl.fromTo(
        ".hero-tag",
        { opacity: 0, y: -15 },
        { opacity: 1, y: 0, duration: 0.6, delay: 0.1 },
      )
        .fromTo(
          titleRef.current,
          { opacity: 0, y: 30 },
          { opacity: 1, y: 0, duration: 0.8 },
          "-=0.3",
        )
        .fromTo(
          subtitleRef.current,
          { opacity: 0, y: 20 },
          { opacity: 1, y: 0, duration: 0.7 },
          "-=0.5",
        )
        .fromTo(
          searchContainerRef.current,
          { opacity: 0, y: 25, scale: 0.97 },
          { opacity: 1, y: 0, scale: 1, duration: 0.8, ease: "back.out(1.1)" },
          "-=0.4",
        )
        .fromTo(
          ctaRef.current,
          { opacity: 0, y: 20 },
          { opacity: 1, y: 0, duration: 0.7 },
          "-=0.4",
        );
    }, heroRef);

    return () => ctx.revert();
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const query = searchQuery.trim();
    const targetPath = searchType === "found" ? "/found-items" : "/lost-items";
    if (query) {
      navigate(`${targetPath}?q=${encodeURIComponent(query)}`);
    } else {
      navigate(targetPath);
    }
  };

  const handleQuickTagClick = (tag: string) => {
    const targetPath = searchType === "found" ? "/found-items" : "/lost-items";
    navigate(`${targetPath}?q=${encodeURIComponent(tag)}`);
  };

  const popularTags = [
    { label: "Backpack", icon: Backpack },
    { label: "iPhone", icon: Smartphone },
    { label: "Keys", icon: KeyRound },
    { label: "Wallet", icon: Wallet },
    { label: "AirPods", icon: Headphones },
    { label: "Glasses", icon: Glasses },
  ];

  return (
    <section
      id="home"
      ref={heroRef}
      className="relative py-8 md:py-10 overflow-hidden flex items-center justify-center min-h-[calc(100svh-12rem)] bg-neutral-950 text-white select-none"
    >
      <div className="absolute inset-0 z-0">
        <img
          src="/images/campus.jpg"
          alt="Campus background"
          className="w-full h-full object-cover object-center opacity-25 filter brightness-50"
        />
        <div className="absolute inset-0 bg-neutral-95/85 backdrop-blur-[3px]" />
      </div>

      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-red-600/15 rounded-full blur-[140px] pointer-events-none z-10" />
      <div className="absolute top-12 left-10 w-80 h-80 bg-[#E5192D]/10 rounded-full blur-3xl pointer-events-none z-10" />
      <div className="absolute bottom-10 right-10 w-96 h-96 bg-rose-600/10 rounded-full blur-3xl pointer-events-none z-10" />

      <div className="relative z-20 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center flex flex-col items-center">
        <div className="hero-tag inline-flex items-center gap-3 px-5 py-2 rounded-full bg-white/10 border border-white/15 shadow-sm backdrop-blur-md mb-5">
          <span className="w-2.5 h-2.5 rounded-full bg-[#E5192D] animate-pulse" />
          <span className="text-xs sm:text-sm md:text-base font-bold tracking-[0.18em] text-neutral-200 uppercase">
            Office of Student Affairs
          </span>
        </div>

        <h1
          ref={titleRef}
          className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black tracking-tight text-white leading-[1.04] mb-5 md:mb-6"
        >
          Lost Something? <br />
          We’ll Help You{" "}
          <span className="text-[#E5192D] relative inline-block drop-shadow-[0_0_35px_rgba(229,25,45,0.45)]">
            Find It.
            <svg
              className="absolute -bottom-2 sm:-bottom-3 left-0 w-full h-3.5 sm:h-5 text-[#E5192D]/50"
              viewBox="0 0 200 12"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M3 9C50 3 150 3 197 9"
                stroke="currentColor"
                strokeWidth="5"
                strokeLinecap="round"
              />
            </svg>
          </span>
        </h1>

        <p
          ref={subtitleRef}
          className="text-base sm:text-lg md:text-xl text-neutral-300 max-w-3xl mx-auto leading-relaxed font-normal mb-6"
        >
          FoundIt connects people across campus and the community to report,
          discover, and safely return lost belongings — quickly and easily.
        </p>

        <div ref={searchContainerRef} className="w-full max-w-3xl mx-auto mb-6">
          <ItemSearchBar
            searchQuery={searchQuery}
            searchType={searchType}
            onSearchQueryChange={setSearchQuery}
            onSearchTypeChange={setSearchType}
            onSubmit={handleSearchSubmit}
          />

          <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-xs sm:text-sm text-neutral-400">
            {popularTags.map((tag) => {
              const Icon = tag.icon;
              return (
                <button
                  key={tag.label}
                  type="button"
                  onClick={() => handleQuickTagClick(tag.label)}
                  className="px-3.5 py-1.5 rounded-full bg-neutral-900/80 hover:bg-neutral-800 text-neutral-300 hover:text-white border border-neutral-700/60 transition-all cursor-pointer flex items-center gap-1.5 font-medium hover:scale-105 hover:border-red-500/40"
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tag.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div
          ref={ctaRef}
          className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-1"
        >
          <Button
            onClick={onBrowseLost}
            className="w-full sm:w-auto h-12 sm:h-13 px-7 rounded-full bg-[#E5192D] hover:bg-[#c91424] text-white text-sm sm:text-base font-bold shadow-xl shadow-red-600/30 hover:shadow-red-600/50 transition-all duration-300 transform hover:-translate-y-0.5 active:translate-y-0 cursor-pointer flex items-center justify-center gap-2.5"
          >
            <PlusCircle className="w-5 h-5 stroke-[2.5]" />
            Report a Lost Item
          </Button>

          <Button
            variant="outline"
            onClick={onBrowseFound}
            className="w-full sm:w-auto h-12 sm:h-13 px-7 rounded-full border-neutral-700 bg-neutral-900/80 hover:bg-neutral-800 text-white hover:text-white text-sm sm:text-base font-bold shadow-lg hover:border-neutral-500 transition-all duration-300 flex items-center justify-center gap-2.5 cursor-pointer group"
          >
            Browse Found Item
            <ArrowRight className="w-5 h-5 text-neutral-400 group-hover:translate-x-1 group-hover:text-white transition-all" />
          </Button>
        </div>
      </div>
    </section>
  );
};
