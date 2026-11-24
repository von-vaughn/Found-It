import React from "react";
import { motion } from "motion/react";

export const FoundItMarquee: React.FC = () => {
  const words = Array.from({ length: 16 });

  return (
    <motion.section
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1], delay: 0.2 }}
      className="relative w-full overflow-hidden py-4 sm:py-5 bg-neutral-50/70 dark:bg-neutral-900/70 border-y border-neutral-100/90 dark:border-neutral-800/80 select-none"
    >
      <div className="absolute left-0 top-0 bottom-0 w-24 sm:w-40 bg-gradient-to-r from-white via-white/80 dark:from-neutral-950 dark:via-neutral-950/80 to-transparent z-10 pointer-events-none" />
      <div className="absolute right-0 top-0 bottom-0 w-24 sm:w-40 bg-gradient-to-l from-white via-white/80 dark:from-neutral-950 dark:via-neutral-950/80 to-transparent z-10 pointer-events-none" />

      <div className="flex w-fit overflow-hidden">
        <motion.div
          animate={{ x: ["0%", "-50%"] }}
          transition={{
            duration: 38,
            repeat: Infinity,
            ease: "linear",
          }}
          className="flex items-center gap-8 sm:gap-12 shrink-0 whitespace-nowrap"
        >
          {words.map((_, i) => (
            <div
              key={`marquee-1-${i}`}
              className="flex items-center gap-8 sm:gap-12"
            >
              <span className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black tracking-tighter uppercase text-neutral-900 dark:text-neutral-100">
                FOUND <span className="text-[#E5192D]">IT</span>
              </span>
            </div>
          ))}
        </motion.div>
      </div>
    </motion.section>
  );
};
