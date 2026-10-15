import React from "react";
import { motion } from "motion/react";

export const CommunityReunions: React.FC = () => {

  return (
    <section className="relative w-full bg-white text-neutral-900 overflow-hidden py-24 sm:py-32 lg:py-40 flex flex-col justify-center items-center select-none">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[350px] bg-red-100/70 rounded-full blur-[120px] pointer-events-none -z-0" />
      <div className="absolute -top-10 left-10 w-72 h-72 bg-red-100/60 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-10 right-10 w-80 h-80 bg-rose-100/60 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 w-full px-2 sm:px-6 flex flex-col items-center justify-center text-center">
        <motion.h2
          initial={{ opacity: 0, scale: 0.92, y: 30 }}
          whileInView={{ opacity: 1, scale: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="w-full text-[clamp(2.8rem,11.5vw,13.5rem)] font-black uppercase tracking-tighter leading-[0.88] text-center"
        >
          <span className="inline-block text-neutral-900">
            LOST
          </span>{" "}
          <span className="inline-block text-[#E5192D]">
            AND
          </span>{" "}
          <span className="inline-block text-neutral-900">
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

        </motion.div>
      </div>
    </section>
  );
};
