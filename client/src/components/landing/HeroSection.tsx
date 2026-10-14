import React, { useState, useEffect, useRef } from "react";
import gsap from "gsap";
import { motion } from "motion/react";
import { useNavigate } from "react-router-dom";
import { ITEM_CATEGORIES } from "@/data/itemCategories";
import type { Item } from "@/data/mockItems";
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
  const [recentPosts, setRecentPosts] = useState<Item[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;
    fetch(`${import.meta.env.BASE_URL}data/examples.json`)
      .then((response) => {
        if (!response.ok) return null;
        return response.json();
      })
      .then((data) => {
        if (cancelled || !data || !Array.isArray(data.items)) return;
        setRecentPosts(
          (data.items as Item[]).filter((item) => item.image).slice(0, 8),
        );
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  const heroRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const categoryRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: "power3.out" } });

      tl.fromTo(
        titleRef.current,
          { opacity: 0, y: 30 },
          { opacity: 1, y: 0, duration: 0.8, delay: 0.1 },
        )
        .fromTo(
          searchContainerRef.current,
          { opacity: 0, y: 25, scale: 0.97 },
          { opacity: 1, y: 0, scale: 1, duration: 0.8, ease: "back.out(1.1)" },
          "-=0.4",
        )
        .fromTo(
          categoryRef.current,
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

  const floatingIcons = [
    { id: "electronics", className: "left-[2%] top-[32%] h-12 w-12", duration: 7 },
    { id: "keys", className: "right-[3%] top-[52%] h-10 w-10", duration: 8.5 },
    { id: "bags", className: "left-[3%] top-[48%] h-14 w-14", duration: 9 },
    { id: "sports-gym-equipment", className: "left-[14%] bottom-[7%] h-10 w-10 hidden sm:block", duration: 8.2 },
    { id: "documents-papers", className: "right-[18%] bottom-[7%] h-10 w-10 hidden sm:block", duration: 8 },
    { id: "jewelry", className: "right-[18%] top-[40%] h-8 w-8 hidden md:block", duration: 7.2 },
    { id: "cards", className: "left-[45%] top-[7%] h-9 w-9 hidden md:block", duration: 9.8 },
    { id: "id", className: "right-[42%] top-[9%] h-8 w-8 hidden md:block", duration: 8.8 },
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
      <div className="relative z-20 w-full max-w-5xl mx-auto px-1 sm:px-1.5 lg:px-2 mt-8 md:mt-12 text-left flex flex-col items-start">
        <h1
          ref={titleRef}
          className="font-black tracking-tight text-neutral-900 leading-[1.0] mb-6 md:mb-8 text-[clamp(2.25rem,9vw,8rem)]"
        >
          <span className="whitespace-nowrap">Lost Something?</span> We’ll Help You{" "}
          <span className="text-[#E5192D] relative inline-block">
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

        <div ref={searchContainerRef} className="w-full max-w-5xl mb-4">
          <ItemSearchBar
            searchQuery={searchQuery}
            searchType={searchType}
            theme="light"
            onSearchQueryChange={setSearchQuery}
            onSearchTypeChange={setSearchType}
            onSubmit={handleSearchSubmit}
          />
        </div>

        <div
          ref={categoryRef}
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

        {recentPosts.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: "easeOut", delay: 1.5 }}
            className="relative mt-5 w-full overflow-hidden"
          >
            <div className="absolute left-0 top-0 bottom-0 w-10 bg-gradient-to-r from-white to-transparent z-10 pointer-events-none" />
            <div className="absolute right-0 top-0 bottom-0 w-10 bg-gradient-to-l from-white to-transparent z-10 pointer-events-none" />
            <motion.div
              animate={{ x: ["-50%", "0%"] }}
              transition={{
                duration: 45,
                repeat: Infinity,
                ease: "linear",
              }}
              className="flex w-fit items-stretch gap-3"
            >
              {[0, 1].map((copy) => (
                <div
                  key={`recent-copy-${copy}`}
                  aria-hidden={copy === 1}
                  className="flex items-stretch gap-3"
                >
                  {recentPosts.map((post) => (
                    <button
                      key={`${post.id}-${copy}`}
                      type="button"
                      tabIndex={copy === 1 ? -1 : undefined}
                      onClick={() => navigate(`/browse?type=${post.type}`)}
                      className="w-60 shrink-0 overflow-hidden rounded-xl border border-neutral-200 bg-white text-left shadow-xs transition-colors hover:border-neutral-300 cursor-pointer"
                    >
                      <img
                        src={post.image}
                        alt=""
                        loading="lazy"
                        className="h-36 w-full object-cover"
                      />
                      <span className="block p-2.5">
                        <span className="block truncate text-sm font-bold text-neutral-900">
                          {post.title}
                        </span>
                        <span className="mt-0.5 block text-[11px] font-medium text-neutral-500">
                          {post.type === "lost" ? "Lost" : "Found"} • {post.timeAgo}
                        </span>
                      </span>
                    </button>
                  ))}
                </div>
              ))}
            </motion.div>
          </motion.div>
        )}

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
