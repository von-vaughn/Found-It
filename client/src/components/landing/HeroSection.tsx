import React, { useState, useEffect, useRef } from "react";
import gsap from "gsap";
import { motion } from "motion/react";
import { useNavigate } from "react-router-dom";
import { ITEM_CATEGORIES } from "@/data/itemCategories";
import {
  ItemSearchBar,
  type ItemSearchType,
} from "@/components/landing/ItemSearchBar";

interface HeroSectionProps {
  onBrowseLost: () => void;
  onBrowseFound: () => void;
}

export const HeroSection: React.FC<HeroSectionProps> = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchType, setSearchType] = useState<ItemSearchType>("lost");
  const navigate = useNavigate();

  const heroRef = useRef<HTMLDivElement>(null);
  const macRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const subtitleRef = useRef<HTMLParagraphElement>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: "power3.out" } });

      tl.fromTo(
        macRef.current,
        { opacity: 0, y: 28 },
        { opacity: 1, y: 0, duration: 0.9 },
        0,
      )
        .fromTo(
          titleRef.current,
          { opacity: 0, y: 30 },
          { opacity: 1, y: 0, duration: 0.8, delay: 0.1 },
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
        );
    }, heroRef);

    return () => ctx.revert();
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const query = searchQuery.trim();
    const targetPath = `/browse?type=${searchType}`;
    if (query) {
      navigate(`${targetPath}&q=${encodeURIComponent(query)}`);
    } else {
      navigate(targetPath);
    }
  };

  const handleQuickTagClick = (tag: string) => {
    const targetPath = `/browse?type=${searchType}`;
    navigate(`${targetPath}&q=${encodeURIComponent(tag)}`);
  };

  const categories = ITEM_CATEGORIES;

  return (
    <section
      id="home"
      ref={heroRef}
      className="relative py-14 md:py-20 overflow-hidden flex items-center justify-center min-h-svh bg-white text-neutral-900 select-none"
    >
      <div className="relative z-20 w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div ref={macRef} className="flex min-h-[75svh] flex-col overflow-hidden rounded-2xl border border-red-200 bg-white shadow-2xl shadow-red-600/15">
          <div className="flex items-center gap-3 border-b border-red-100 bg-red-50 px-4 py-3">
            <div className="flex items-center gap-1.5" aria-hidden="true">
              <span className="h-3 w-3 rounded-full bg-[#FF5F57]" />
              <span className="h-3 w-3 rounded-full bg-[#FEBC2E]" />
              <span className="h-3 w-3 rounded-full bg-[#28C840]" />
            </div>
          </div>

          <div className="flex flex-1 flex-col items-center justify-center px-4 sm:px-8 lg:px-12 py-10 md:py-14 text-center">
        <h1
          ref={titleRef}
          className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black tracking-tight text-neutral-900 leading-[1.04] mb-5 md:mb-6"
        >
          Lost Something? <br />
          We’ll Help You{" "}
          <span className="text-[#E5192D] relative inline-block">
            Find It.
            <svg
              className="absolute -bottom-2 sm:-bottom-3 left-0 w-full h-3.5 sm:h-5 text-[#E5192D]/40"
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
          className="text-base sm:text-lg md:text-xl text-neutral-600 max-w-3xl mx-auto leading-relaxed font-normal mb-6"
        >
          FoundIt connects people across campus and the community to report,
          discover, and safely return lost belongings — quickly and easily.
        </p>

        <div ref={searchContainerRef} className="w-full max-w-3xl mx-auto mb-6">
          <ItemSearchBar
            searchQuery={searchQuery}
            searchType={searchType}
            theme="light"
            onSearchQueryChange={setSearchQuery}
            onSearchTypeChange={setSearchType}
            onSubmit={handleSearchSubmit}
          />

          <div
            aria-label="Browse items by category"
            className="relative mt-4 overflow-hidden text-xs sm:text-sm"
          >
            <div className="absolute left-0 top-0 bottom-0 w-10 bg-gradient-to-r from-white to-transparent z-10 pointer-events-none" />
            <div className="absolute right-0 top-0 bottom-0 w-10 bg-gradient-to-l from-white to-transparent z-10 pointer-events-none" />
            <motion.div
              animate={{ x: ["-50%", "0%"] }}
              transition={{
                duration: 55,
                repeat: Infinity,
                ease: "linear",
              }}
              className="flex w-fit items-center gap-2"
            >
              {[0, 1].map((copy) => (
                <div
                  key={`category-copy-${copy}`}
                  aria-hidden={copy === 1}
                  className="flex items-center gap-2"
                >
                  {categories.map((category) => {
                    const Icon = category.icon;
                    return (
                      <button
                        key={`${category.id}-${copy}`}
                        type="button"
                        tabIndex={copy === 1 ? -1 : undefined}
                        onClick={() => handleQuickTagClick(category.label)}
                        className="shrink-0 whitespace-nowrap px-3.5 py-1.5 rounded-full bg-white hover:bg-neutral-50 text-neutral-600 hover:text-neutral-900 border border-neutral-200 shadow-xs transition-colors cursor-pointer flex items-center gap-1.5 font-medium"
                      >
                        <Icon className="w-3.5 h-3.5" />
                        <span>{category.label}</span>
                      </button>
                    );
                  })}
                </div>
              ))}
            </motion.div>
          </div>
        </div>
          </div>
        </div>
      </div>
    </section>
  );
};
