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
  const badgeRef = useRef<HTMLDivElement>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);

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

  const floatingIcons = [
    { id: "electronics", className: "left-[2%] top-[32%] h-12 w-12", duration: 7 },
    { id: "keys", className: "right-[3%] top-[52%] h-10 w-10", duration: 8.5 },
    { id: "bags", className: "left-[3%] top-[48%] h-14 w-14", duration: 9 },
    { id: "sports-gym-equipment", className: "left-[14%] bottom-[7%] h-10 w-10 hidden sm:block", duration: 8.2 },
    { id: "documents-papers", className: "right-[18%] bottom-[7%] h-10 w-10 hidden sm:block", duration: 8 },
    { id: "jewelry", className: "right-[18%] top-[40%] h-8 w-8 hidden md:block", duration: 7.2 },
    { id: "cards", className: "left-[calc(50%-260px)] top-[13%] h-9 w-9 hidden md:block", duration: 9.8 },
    { id: "id", className: "right-[calc(50%-260px)] top-[14%] h-8 w-8 hidden md:block", duration: 8.8 },
  ].map((entry, index) => ({
    ...entry,
    Icon:
      ITEM_CATEGORIES.find((category) => category.id === entry.id)?.icon ??
      ITEM_CATEGORIES[0].icon,
    delay: index * 0.9,
  }));

  return (
    <section
      id="home"
      ref={heroRef}
      className="relative py-8 md:py-10 overflow-hidden flex flex-col items-center justify-center min-h-svh bg-white text-neutral-900 select-none"
    >
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-0">
        <div className="absolute -right-24 top-[8%] h-72 w-72 rounded-full border-[22px] border-red-50" />
        <div className="absolute -left-20 bottom-[10%] h-60 w-60 rounded-full border-[18px] border-neutral-100" />
        <div
          className="absolute left-[4%] top-[10%] h-28 w-44 opacity-70"
          style={{
            backgroundImage: "radial-gradient(#fecdd3 1.6px, transparent 1.6px)",
            backgroundSize: "14px 14px",
          }}
        />
        <div
          className="absolute bottom-[8%] right-[5%] h-24 w-40 opacity-70 hidden sm:block"
          style={{
            backgroundImage: "radial-gradient(#e7e5e4 1.6px, transparent 1.6px)",
            backgroundSize: "14px 14px",
          }}
        />
        {floatingIcons.map(({ id, Icon, className, duration, delay }) => (
          <motion.span
            key={`floating-${id}`}
            animate={{ y: [0, -14, 0], rotate: [0, 6, 0] }}
            transition={{ duration, repeat: Infinity, ease: "easeInOut", delay }}
            className={`absolute text-[#E5192D]/10 ${className}`}
          >
            <Icon className="h-full w-full" strokeWidth={1.5} />
          </motion.span>
        ))}
      </div>
      <div className="relative z-20 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8 md:mt-12 text-center flex flex-col items-center">
        <div
          ref={badgeRef}
          className="mt-6 mb-5 flex w-fit max-w-full items-center justify-center gap-2.5 sm:mt-0 sm:gap-3"
        >
          <img
            src="/WMSU_LOGO.JPG"
            alt="Western Mindanao State University logo"
            className="h-8 w-8 shrink-0 rounded-full object-cover sm:h-9 sm:w-9"
          />
          <span className="whitespace-nowrap text-[10px] font-bold uppercase tracking-[0.08em] text-neutral-700 sm:text-sm sm:tracking-[0.18em]">
            Western Mindanao State University
          </span>
        </div>
        <h1
          ref={titleRef}
          className="w-full text-center font-black tracking-tight text-neutral-900 leading-[1.0] mb-6 md:mb-8 text-[clamp(2.375rem,11vw,3rem)] sm:text-[clamp(2.25rem,9vw,8rem)]"
        >
          <span className="whitespace-nowrap">Lost Something?</span>
          <br className="sm:hidden" /> We’ll Help You{" "}
          <br className="sm:hidden" />
          <span className="relative inline-block bg-gradient-to-r from-[#B51224] via-[#E5192D] to-[#FF5A67] bg-clip-text text-transparent">
            FOUND IT.
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

        <div ref={searchContainerRef} className="w-[90%] max-w-3xl mb-4">
          <ItemSearchBar
            searchQuery={searchQuery}
            searchType={searchType}
            theme="light"
            showTypeToggle={false}
            onSearchQueryChange={setSearchQuery}
            onSearchTypeChange={setSearchType}
            onSubmit={handleSearchSubmit}
          />
        </div>

        <div aria-hidden="true" className="mt-8 flex w-full items-center justify-center gap-4">
          <span className="h-2 w-2 rounded-full bg-[#E5192D]/30" />
          <span className="h-px w-24 border-t border-dashed border-neutral-300 sm:w-40" />
          <span className="h-5 w-5 rounded-full border-2 border-[#E5192D]/25" />
          <span className="h-px w-24 border-t border-dashed border-neutral-300 sm:w-40" />
          <span className="h-2 w-2 rounded-full bg-[#E5192D]/30" />
        </div>
      </div>
    </section>
  );
};
