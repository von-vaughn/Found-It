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
  const titleRef = useRef<HTMLHeadingElement>(null);
  const subtitleRef = useRef<HTMLParagraphElement>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: "power3.out" } });

      tl.fromTo(
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
      className="relative py-8 md:py-10 overflow-hidden flex flex-col items-center justify-center min-h-svh bg-white text-neutral-900 select-none"
    >
      <div className="relative z-20 w-full max-w-5xl mx-auto px-1 sm:px-1.5 lg:px-2 text-left flex flex-col items-start">
        <h1
          ref={titleRef}
          className="font-black tracking-tight text-neutral-900 leading-[1.0] mb-3 md:mb-4 text-[clamp(2.25rem,9vw,8rem)]"
        >
          <span className="whitespace-nowrap">Lost Something?</span> We’ll Help You{" "}
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
          className="text-base sm:text-lg md:text-xl text-neutral-600 max-w-3xl leading-relaxed font-normal mb-4"
        >
          FoundIt connects people across campus and the community to report,
          discover, and safely return lost belongings — quickly and easily.
        </p>

        <div ref={searchContainerRef} className="w-full max-w-3xl mb-4">
          <ItemSearchBar
            searchQuery={searchQuery}
            searchType={searchType}
            theme="light"
            onSearchQueryChange={setSearchQuery}
            onSearchTypeChange={setSearchType}
            onSubmit={handleSearchSubmit}
          />
        </div>
      </div>

        <div
          aria-label="Browse items by category"
          className="relative w-full overflow-hidden text-xs sm:text-sm"
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
    </section>
  );
};
