import React from "react";
import { motion } from "motion/react";
import {
  Camera,
  Cpu,
  ShieldCheck,
  ArrowRight,
  Sparkles,
  CheckCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface HowItWorksProps {
  onBrowseLost: () => void;
}

export const HowItWorks: React.FC<HowItWorksProps> = ({ onBrowseLost }) => {
  const steps = [
    {
      step: "01",
      title: "Snap & Report in 60s",
      description:
        "Upload a quick photo or describe key features like color, brand, or unique markings. Our smart form takes less than a minute.",
      icon: Camera,
      tag: "Quick Submission",
      color: "bg-red-50 text-[#E5192D] border-red-200/60",
    },
    {
      step: "02",
      title: "Smart Match & Instant Ping",
      description:
        "Our matching engine instantly cross-references lost and found logs in your area. Both parties get notified immediately upon a match.",
      icon: Cpu,
      tag: "AI Assisted",
      color: "bg-blue-50 text-blue-600 border-blue-200/60",
    },
    {
      step: "03",
      title: "Safe Reunion & Handover",
      description:
        "Verify ownership through custom security questions or serial numbers. Meet safely at campus security desks or verified drop zones.",
      icon: ShieldCheck,
      tag: "100% Protected",
      color: "bg-emerald-50 text-emerald-600 border-emerald-200/60",
    },
  ];

  return (
    <section
      id="how-it-works"
      className="py-24 bg-neutral-50/70 border-t border-neutral-100 relative overflow-hidden"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Section title */}
        <div className="text-center max-w-2xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-100/60 text-[#E5192D] text-xs font-bold uppercase tracking-wider mb-3">
            <Sparkles className="w-3.5 h-3.5" />
            Simple 3-Step Process
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-neutral-900 tracking-tight">
            How FindIt Works
          </h2>
          <p className="text-neutral-500 text-base mt-3">
            We’ve eliminated the chaos of lost item bulletin boards. Here is how
            we make reunions happen faster.
          </p>
        </div>

        {/* 3 Steps Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
          {steps.map((item, idx) => {
            const Icon = item.icon;
            return (
              <motion.div
                key={item.step}
                initial={{ opacity: 0, y: 25 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: idx * 0.15 }}
                className="bg-white rounded-3xl p-8 border border-neutral-200/80 shadow-xs hover:shadow-xl hover:shadow-neutral-200/40 transition-all duration-300 flex flex-col justify-between relative group"
              >
                {/* Step number badge */}
                <div className="flex items-center justify-between mb-6">
                  <div
                    className={`w-14 h-14 rounded-2xl ${item.color} border flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform`}
                  >
                    <Icon className="w-7 h-7 stroke-[2.2]" />
                  </div>
                  <span className="text-3xl font-black text-neutral-200 group-hover:text-neutral-400 transition-colors">
                    {item.step}
                  </span>
                </div>

                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">
                    {item.tag}
                  </span>
                  <h3 className="text-xl font-bold text-neutral-900 mt-1 mb-3">
                    {item.title}
                  </h3>
                  <p className="text-sm text-neutral-500 leading-relaxed">
                    {item.description}
                  </p>
                </div>

                <div className="pt-6 mt-6 border-t border-neutral-100 flex items-center text-xs font-semibold text-neutral-400 group-hover:text-neutral-700 transition-colors">
                  <CheckCircle className="w-4 h-4 mr-1.5 text-emerald-500" />
                  Verified Safe Flow
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Report CTA */}
        <div className="mt-14 p-8 bg-neutral-900 rounded-3xl text-white flex flex-col sm:flex-row items-center justify-between gap-6 shadow-xl shadow-neutral-950/10">
          <div>
            <h3 className="text-xl sm:text-2xl font-bold">
              Looking for something right now?
            </h3>
            <p className="text-neutral-400 text-sm mt-1">
              File a report in under a minute and let our community start
              looking.
            </p>
          </div>
          <Button
            onClick={onBrowseLost}
            className="rounded-full bg-[#E5192D] hover:bg-[#c81424] text-white px-7 py-3 font-semibold text-sm shrink-0 cursor-pointer shadow-md"
          >
            File a Report Now
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </div>
    </section>
  );
};
