import React from 'react';
import { motion } from 'motion/react';

export const FoundItMarquee: React.FC = () => {
  const words = Array.from({ length: 16 });

  return (
    <section className="relative w-full overflow-hidden py-5 sm:py-7 bg-neutral-50/70 border-y border-neutral-100/90 select-none">
      {/* Edge gradient masks for seamless fade */}
      <div className="absolute left-0 top-0 bottom-0 w-24 sm:w-40 bg-gradient-to-r from-white via-white/80 to-transparent z-10 pointer-events-none" />
      <div className="absolute right-0 top-0 bottom-0 w-24 sm:w-40 bg-gradient-to-l from-white via-white/80 to-transparent z-10 pointer-events-none" />

      {/* Single Horizontal Infinite Marquee */}
      <div className="flex w-fit overflow-hidden">
        <motion.div
          animate={{ x: ['0%', '-50%'] }}
          transition={{
            duration: 38,
            repeat: Infinity,
            ease: 'linear',
          }}
          className="flex items-center gap-8 sm:gap-12 shrink-0 whitespace-nowrap"
        >
          {words.map((_, i) => (
            <div key={`marquee-1-${i}`} className="flex items-center gap-8 sm:gap-12">
              <span className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black tracking-tighter uppercase text-neutral-900">
                FOUND <span className="text-[#E5192D]">IT</span>
              </span>
              <span className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-neutral-300" />
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};
