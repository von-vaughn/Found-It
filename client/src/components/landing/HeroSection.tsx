import React, { useState, useEffect, useRef } from "react";
import gsap from "gsap";
import { useNavigate } from "react-router-dom";
import { useFittedCategories } from "@/hooks/useFittedCategories";
import { useTheme } from "@/context/useTheme";
import {
  ItemSearchBar,
  type ItemSearchType,
} from "@/components/landing/ItemSearchBar";

const LIGHT_HERO_GRADIENT = [
  "radial-gradient(45% 40% at 18% 24%, rgba(254, 205, 211, 0.24) 0%, rgba(255, 241, 242, 0.2) 50%, transparent 82%)",
  "radial-gradient(44% 38% at 84% 22%, rgba(229, 25, 45, 0.06) 0%, rgba(254, 226, 226, 0.22) 48%, transparent 82%)",
  "radial-gradient(42% 36% at 44% 46%, rgba(229, 25, 45, 0.05) 0%, rgba(254, 205, 211, 0.14) 46%, transparent 80%)",
  "radial-gradient(40% 34% at 60% 50%, rgba(251, 113, 133, 0.06) 0%, rgba(254, 226, 226, 0.16) 50%, transparent 82%)",
  "radial-gradient(46% 36% at 16% 78%, rgba(254, 226, 226, 0.22) 0%, transparent 78%)",
  "radial-gradient(46% 34% at 82% 76%, rgba(254, 205, 211, 0.2) 0%, transparent 78%)",
  "radial-gradient(50% 34% at 50% 60%, rgba(254, 205, 211, 0.16) 0%, rgba(255, 241, 242, 0.2) 55%, transparent 85%)",
  "radial-gradient(32% 26% at 48% 40%, rgba(255, 255, 255, 0.72) 0%, transparent 78%)",
].join(", ");

const DARK_HERO_GRADIENT = [
  "radial-gradient(45% 40% at 18% 24%, rgba(159, 18, 57, 0.16) 0%, rgba(76, 5, 25, 0.12) 50%, transparent 82%)",
  "radial-gradient(44% 38% at 84% 22%, rgba(229, 25, 45, 0.14) 0%, rgba(136, 19, 55, 0.1) 48%, transparent 82%)",
  "radial-gradient(42% 36% at 44% 46%, rgba(229, 25, 45, 0.1) 0%, rgba(159, 18, 57, 0.08) 46%, transparent 80%)",
  "radial-gradient(40% 34% at 60% 50%, rgba(244, 63, 94, 0.08) 0%, rgba(136, 19, 55, 0.08) 50%, transparent 82%)",
  "radial-gradient(46% 36% at 16% 78%, rgba(136, 19, 55, 0.12) 0%, transparent 78%)",
  "radial-gradient(46% 34% at 82% 76%, rgba(159, 18, 57, 0.12) 0%, transparent 78%)",
  "radial-gradient(50% 34% at 50% 60%, rgba(159, 18, 57, 0.1) 0%, rgba(76, 5, 25, 0.1) 55%, transparent 85%)",
  "radial-gradient(32% 26% at 48% 40%, rgba(10, 10, 10, 0.35) 0%, transparent 78%)",
].join(", ");

interface HeroSectionProps {
  onBrowseLost: () => void;
  onBrowseFound: () => void;
}

export const HeroSection: React.FC<HeroSectionProps> = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchType, setSearchType] = useState<ItemSearchType>("lost");
  const navigate = useNavigate();
  const { theme } = useTheme();

  const heroRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const badgeRef = useRef<HTMLDivElement>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const {
    categories,
    visibleCategories,
    visibleCategoryCount,
    categoryRowRef,
    categoryMeasureRef,
    moreCategoryMeasureRef,
  } = useFittedCategories();

  useEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: "power3.out" } });

      tl.fromTo(
        badgeRef.current,
          { opacity: 0, y: 30 },
          { opacity: 1, y: 0, duration: 0.8, delay: 0.1 },
          "<",
        )
        .fromTo(
          titleRef.current,
          { opacity: 0, y: 30 },
          { opacity: 1, y: 0, duration: 0.8, delay: 0.1 },
          "<",
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

  return (
    <section
      id="home"
      ref={heroRef}
      style={{
        backgroundImage: theme === "dark" ? DARK_HERO_GRADIENT : LIGHT_HERO_GRADIENT,
      }}
      className="relative pt-20 pb-4 md:pt-22 md:pb-6 overflow-hidden flex flex-col items-center justify-center min-h-[calc(100svh-5rem)] sm:min-h-[calc(100svh-6.25rem)] bg-white dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 select-none"
    >
      <div className="relative z-20 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center flex flex-col items-center">
        <div
          ref={badgeRef}
          className="mb-3 sm:mb-4 flex w-fit max-w-full items-center justify-center gap-2.5 sm:gap-3.5"
        >
          <img
            src="/WMSU_LOGO.JPG"
            alt="Western Mindanao State University logo"
            className="h-10 w-10 shrink-0 rounded-full object-cover sm:h-14 sm:w-14"
          />
          <span className="whitespace-nowrap text-[clamp(0.75rem,3.1vw,0.95rem)] font-bold uppercase tracking-[0.05em] text-neutral-700 dark:text-neutral-300 sm:text-lg sm:tracking-[0.16em] md:text-xl">
            Western Mindanao State University
          </span>
        </div>
        <h1
          ref={titleRef}
          className="w-full text-center font-bold tracking-[-0.04em] text-neutral-900 dark:text-neutral-50 leading-[1.02] mb-5 md:mb-6 text-[clamp(2.5rem,11vw,3.35rem)] sm:text-[clamp(3rem,8.5vw,7.75rem)]"
        >
          <span className="whitespace-nowrap">Lost Something?</span>
          <br className="sm:hidden" /> We’ll Help You{" "}
          <br className="sm:hidden" />
          <span className="inline-block pr-1 sm:pr-2 font-semibold italic tracking-normal text-[#E5192D] [font-family:var(--font-serif-display)]">
            FOUND IT.
          </span>
        </h1>

        <div ref={searchContainerRef} className="w-[90%] max-w-3xl mb-4 flex flex-col gap-3">
          <ItemSearchBar
            searchQuery={searchQuery}
            searchType={searchType}
            theme={theme}
            showTypeToggle={false}
            onSearchQueryChange={setSearchQuery}
            onSearchTypeChange={setSearchType}
            onSubmit={handleSearchSubmit}
          />

          <div
            ref={categoryRowRef}
            aria-label="Browse items by category"
            className="relative flex w-full max-w-full min-w-0 flex-nowrap items-center gap-2 overflow-hidden"
          >
            {visibleCategories.map((category) => {
              const Icon = "icon" in category ? category.icon : null;
              const isAll = category.id === "all";
              return (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => {
                    const query = searchQuery.trim();
                    const params = new URLSearchParams({ type: "all" });
                    if (query) params.set("q", query);
                    navigate(`/browse?${params.toString()}`, {
                      state: { category: category.id },
                    });
                  }}
                  className={`grow shrink-0 basis-auto whitespace-nowrap px-4 py-2 rounded-xl text-xs font-semibold transition-all border cursor-pointer flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5192D] focus-visible:ring-offset-2 dark:focus-visible:ring-offset-neutral-950 ${
                    isAll
                      ? "bg-[#E5192D] text-white border-[#E5192D] shadow-sm shadow-red-500/20 hover:bg-[#c81424]"
                      : "bg-white dark:bg-neutral-900/90 text-neutral-600 dark:text-neutral-300 border-neutral-200/80 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800 hover:text-neutral-900 dark:hover:text-white"
                  }`}
                >
                  {Icon ? <Icon className="w-3.5 h-3.5 shrink-0" /> : null}
                  <span>{category.label}</span>
                </button>
              );
            })}
            {visibleCategoryCount < categories.length && (
              <button
                type="button"
                onClick={() => {
                  const query = searchQuery.trim();
                  const params = new URLSearchParams({ type: "all" });
                  if (query) params.set("q", query);
                  if (window.matchMedia("(max-width: 767px)").matches) {
                    navigate(`/browse/filters?${params.toString()}`);
                    return;
                  }
                  navigate(`/browse?${params.toString()}`, {
                    state: { openFilters: true },
                  });
                }}
                aria-label="More category filters"
                className="ml-auto shrink-0 whitespace-nowrap px-4 py-2 rounded-xl text-xs font-semibold transition-colors border border-neutral-200/80 dark:border-neutral-800 bg-white dark:bg-neutral-900/90 text-neutral-600 dark:text-neutral-300 hover:border-neutral-300 dark:hover:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800 hover:text-neutral-900 dark:hover:text-white cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5192D] focus-visible:ring-offset-2 dark:focus-visible:ring-offset-neutral-950 inline-flex items-center gap-2"
              >
                <span>More</span>
              </button>
            )}
            <div
              ref={categoryMeasureRef}
              aria-hidden="true"
              className="pointer-events-none absolute left-0 top-0 flex w-max flex-nowrap items-center gap-2 invisible"
            >
              {categories.map((category) => {
                const Icon = "icon" in category ? category.icon : null;
                return (
                  <button
                    key={category.id}
                    type="button"
                    tabIndex={-1}
                    className="shrink-0 whitespace-nowrap px-4 py-2 rounded-xl text-xs font-semibold border flex items-center gap-2"
                  >
                    {Icon ? <Icon className="w-3.5 h-3.5" /> : null}
                    <span>{category.label}</span>
                  </button>
                );
              })}
              <button
                ref={moreCategoryMeasureRef}
                type="button"
                tabIndex={-1}
                className="shrink-0 whitespace-nowrap px-4 py-2 rounded-xl text-xs font-semibold border inline-flex items-center gap-2"
              >
                <span>More</span>
              </button>
            </div>
          </div>
        </div>

        <div aria-hidden="true" className="mt-4 flex w-full items-center justify-center gap-4">
          <span className="h-2 w-2 rounded-full bg-[#E5192D]/30 dark:bg-[#E5192D]/50" />
          <span className="h-px w-24 border-t border-dashed border-neutral-300 dark:border-neutral-800 sm:w-40" />
          <span className="h-5 w-5 rounded-full border-2 border-[#E5192D]/25 dark:border-[#E5192D]/45" />
          <span className="h-px w-24 border-t border-dashed border-neutral-300 dark:border-neutral-800 sm:w-40" />
          <span className="h-2 w-2 rounded-full bg-[#E5192D]/30 dark:bg-[#E5192D]/50" />
        </div>
      </div>
    </section>
  );
};
