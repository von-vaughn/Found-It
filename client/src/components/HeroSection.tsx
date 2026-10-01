import React, { useState, useEffect, useRef } from "react";
import gsap from "gsap";
import { Search, ArrowRight, PlusCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

interface HeroSectionProps {
  onBrowseLost: () => void;
  onBrowseFound: () => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({
  onBrowseLost,
  onBrowseFound,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchType, setSearchType] = useState<"lost" | "found">("lost");
  const navigate = useNavigate();

  const heroRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const subtitleRef = useRef<HTMLParagraphElement>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const ctaRef = useRef<HTMLDivElement>(null);

  // GSAP entrance animation
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
    { label: "Backpack", icon: "🎒" },
    { label: "iPhone", icon: "📱" },
    { label: "Keys", icon: "🔑" },
    { label: "Wallet", icon: "👛" },
    { label: "AirPods", icon: "🎧" },
    { label: "Glasses", icon: "👓" },
  ];

  return (
    <section
      id="home"
      ref={heroRef}
      className="relative py-8 md:py-10 overflow-hidden flex items-center justify-center min-h-[calc(100svh-12rem)] bg-neutral-950 text-white select-none"
    >
      {/* Campus background image with deep dark overlay */}
      <div className="absolute inset-0 z-0">
        <img
          src="/images/campus.jpg"
          alt="Campus background"
          className="w-full h-full object-cover object-center opacity-25 filter brightness-50"
        />
        <div className="absolute inset-0 bg-neutral-95/85 backdrop-blur-[3px]" />
      </div>

      {/* Decorative ambient glowing orbs */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-red-600/15 rounded-full blur-[140px] pointer-events-none z-10" />
      <div className="absolute top-12 left-10 w-80 h-80 bg-[#E5192D]/10 rounded-full blur-3xl pointer-events-none z-10" />
      <div className="absolute bottom-10 right-10 w-96 h-96 bg-rose-600/10 rounded-full blur-3xl pointer-events-none z-10" />

      {/* Centered Main Hero Content */}
      <div className="relative z-20 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center flex flex-col items-center">
        {/* Tag / Category line */}
        <div className="hero-tag inline-flex items-center gap-3 px-5 py-2 rounded-full bg-white/10 border border-white/15 shadow-sm backdrop-blur-md mb-5">
          <span className="w-2.5 h-2.5 rounded-full bg-[#E5192D] animate-pulse" />
          <span className="text-xs sm:text-sm md:text-base font-bold tracking-[0.18em] text-neutral-200 uppercase">
            Office of Student Affairs
          </span>
        </div>

        {/* Giant Centered Headline */}
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

        {/* Subtext */}
        <p
          ref={subtitleRef}
          className="text-base sm:text-lg md:text-xl text-neutral-300 max-w-3xl mx-auto leading-relaxed font-normal mb-6"
        >
          FindIt connects people across campus and the community to report,
          discover, and safely return lost belongings — quickly and easily.
        </p>

        {/* Hero Search Bar Container */}
        <div ref={searchContainerRef} className="w-full max-w-3xl mx-auto mb-6">
          {/* Main Search Box */}
          <form
            onSubmit={handleSearchSubmit}
            className="p-2 sm:p-2.5 bg-neutral-900/90 rounded-3xl shadow-2xl shadow-black/80 border border-white/15 backdrop-blur-xl flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 transition-all focus-within:border-red-500/80 focus-within:ring-2 focus-within:ring-red-500/20"
          >
            {/* Type selector toggle (Lost vs Found) */}
            <div className="flex items-center p-1 bg-neutral-800/90 rounded-2xl shrink-0 self-center sm:self-auto border border-neutral-700/50">
              <button
                type="button"
                onClick={() => setSearchType("lost")}
                className={`px-4 py-2 text-xs sm:text-sm font-bold rounded-xl transition-all cursor-pointer ${
                  searchType === "lost"
                    ? "bg-[#E5192D] text-white shadow-md shadow-red-500/30"
                    : "text-neutral-400 hover:text-white"
                }`}
              >
                Lost
              </button>
              <button
                type="button"
                onClick={() => setSearchType("found")}
                className={`px-4 py-2 text-xs sm:text-sm font-bold rounded-xl transition-all cursor-pointer ${
                  searchType === "found"
                    ? "bg-emerald-600 text-white shadow-md shadow-emerald-500/30"
                    : "text-neutral-400 hover:text-white"
                }`}
              >
                Found
              </button>
            </div>

            {/* Input field */}
            <div className="relative flex-1 flex items-center min-w-0 px-2">
              <Search className="w-5 h-5 text-neutral-400 shrink-0 mr-3" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={`Search ${searchType === "lost" ? "lost" : "found"} items (e.g. AirPods, keys, backpack)...`}
                className="w-full h-12 text-base sm:text-lg bg-transparent text-white placeholder-neutral-500 focus:outline-none"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="p-1 rounded-full text-neutral-400 hover:text-white transition-colors shrink-0"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              className={`h-12 sm:h-13 px-7 rounded-2xl font-bold text-sm sm:text-base shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2 shrink-0 ${
                searchType === "lost"
                  ? "bg-[#E5192D] hover:bg-[#c91424] text-white shadow-red-500/30"
                  : "bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-500/30"
              }`}
            >
              <Search className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.5]" />
              <span>Search {searchType === "lost" ? "Lost" : "Found"}</span>
            </Button>
          </form>

          {/* Quick Trending Tags */}
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-xs sm:text-sm text-neutral-400">
            <span className="font-semibold text-neutral-400">Popular:</span>
            {popularTags.map((tag) => (
              <button
                key={tag.label}
                type="button"
                onClick={() => handleQuickTagClick(tag.label)}
                className="px-3.5 py-1.5 rounded-full bg-neutral-900/80 hover:bg-neutral-800 text-neutral-300 hover:text-white border border-neutral-700/60 transition-all cursor-pointer flex items-center gap-1.5 font-medium hover:scale-105 hover:border-red-500/40"
              >
                <span>{tag.icon}</span>
                <span>{tag.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Action Buttons Row */}
        <div
          ref={ctaRef}
          className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-1"
        >
          {/* Primary button */}
          <Button
            onClick={onBrowseLost}
            className="w-full sm:w-auto h-12 sm:h-13 px-7 rounded-full bg-[#E5192D] hover:bg-[#c91424] text-white text-sm sm:text-base font-bold shadow-xl shadow-red-600/30 hover:shadow-red-600/50 transition-all duration-300 transform hover:-translate-y-0.5 active:translate-y-0 cursor-pointer flex items-center justify-center gap-2.5"
          >
            <PlusCircle className="w-5 h-5 stroke-[2.5]" />
            Report a Lost Item
          </Button>

          {/* Secondary button */}
          <Button
            variant="outline"
            onClick={onBrowseFound}
            className="w-full sm:w-auto h-12 sm:h-13 px-7 rounded-full border-neutral-700 bg-neutral-900/80 hover:bg-neutral-800 text-white text-sm sm:text-base font-bold shadow-lg hover:border-neutral-500 transition-all duration-300 flex items-center justify-center gap-2.5 cursor-pointer group"
          >
            Browse Found Directory
            <ArrowRight className="w-5 h-5 text-neutral-400 group-hover:translate-x-1 group-hover:text-white transition-all" />
          </Button>
        </div>
      </div>
    </section>
  );
};
