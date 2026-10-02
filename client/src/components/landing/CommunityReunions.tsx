import React from "react";
import { motion } from "motion/react";
import { ArrowUpRight } from "lucide-react";

export const CommunityReunions: React.FC = () => {
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <section className="relative w-full bg-neutral-950 text-white overflow-hidden py-24 sm:py-32 lg:py-40 flex flex-col justify-center items-center select-none">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[350px] bg-red-600/15 rounded-full blur-[120px] pointer-events-none -z-0" />
      <div className="absolute -top-10 left-10 w-72 h-72 bg-[#E5192D]/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-10 right-10 w-80 h-80 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 w-full px-2 sm:px-6 flex flex-col items-center justify-center text-center">
        <motion.h2
          initial={{ opacity: 0, scale: 0.92, y: 30 }}
          whileInView={{ opacity: 1, scale: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="w-full text-[clamp(2.8rem,11.5vw,13.5rem)] font-black uppercase tracking-tighter leading-[0.88] text-center"
        >
          <span className="inline-block text-white hover:text-neutral-200 transition-colors drop-shadow-[0_10px_35px_rgba(0,0,0,0.8)]">
            LOST
          </span>{" "}
          <span className="inline-block text-[#E5192D] drop-shadow-[0_0_40px_rgba(229,25,45,0.45)]">
            AND
          </span>{" "}
          <span className="inline-block text-white hover:text-neutral-200 transition-colors drop-shadow-[0_10px_35px_rgba(0,0,0,0.8)]">
            FOUND
          </span>
        </motion.h2>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.35 }}
          className="mt-8 sm:mt-10 flex items-center justify-center px-4"
        >
          <button
            type="button"
            onClick={scrollToTop}
            className="h-12 px-8 rounded-full bg-white/10 hover:bg-white/15 text-white border border-white/15 font-semibold text-sm backdrop-blur-md transition-all duration-300 flex items-center gap-2 cursor-pointer"
          >
            Back to Top
            <ArrowUpRight className="w-4 h-4 text-neutral-400" />
          </button>
        </motion.div>
      </div>
    </section>
  );
};
