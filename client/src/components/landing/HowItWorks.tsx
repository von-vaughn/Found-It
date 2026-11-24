import React from "react";
import { motion } from "motion/react";
import { useNavigate } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { paths } from "@/routes/paths";

interface StepData {
  id: string;
  number: string;
  title: string;
  subtitle: string;
  ctaText?: string;
  ctaAction?: "signup" | "browse";
  mockupImage: string;
  fallbackImage: string;
  bgTint: string;
}

const stepsData: StepData[] = [
  {
    id: "step-1",
    number: "01",
    title: "Sign up",
    subtitle: "Join with your @wmsu.edu.ph email.",
    ctaText: "Join with WMSU Email",
    ctaAction: "signup",
    mockupImage: "/mockups/step1-signup.png",
    fallbackImage: "/1.Sign-up.png",
    bgTint: "bg-[#F7F5F0] dark:bg-neutral-900/95",
  },
  {
    id: "step-2",
    number: "02",
    title: "Browse",
    subtitle: "Search and filter campus items.",
    ctaText: "Browse Campus Items",
    ctaAction: "browse",
    mockupImage: "/mockups/step2-browse.png",
    fallbackImage: "/2.Browse.png",
    bgTint: "bg-[#EFF4EE] dark:bg-emerald-950/35",
  },
  {
    id: "step-3",
    number: "03",
    title: "Post",
    subtitle: "Report a lost or found item with photos.",
    mockupImage: "/mockups/step3-post.png",
    fallbackImage: "/3.post-item.png",
    bgTint: "bg-[#FDF2EC] dark:bg-orange-950/30",
  },
  {
    id: "step-4",
    number: "04",
    title: "Claim",
    subtitle: "Prove ownership with details and photos.",
    mockupImage: "/mockups/step4-claim.png",
    fallbackImage: "/4.Claim.png",
    bgTint: "bg-[#EFF3F7] dark:bg-slate-900/80",
  },
  {
    id: "step-5",
    number: "05",
    title: "Track",
    subtitle: "Pick up approved claims at OSA.",
    mockupImage: "/mockups/step5-track.png",
    fallbackImage: "/5.Track.png",
    bgTint: "bg-[#F9F4EB] dark:bg-amber-950/30",
  },
];

export const HowItWorks: React.FC = () => {
  const navigate = useNavigate();

  const handleAction = (action?: StepData["ctaAction"]) => {
    if (!action) return;
    switch (action) {
      case "signup":
        window.dispatchEvent(
          new CustomEvent("foundit:open-auth", { detail: "signup" }),
        );
        break;
      case "browse":
        navigate(paths.browse);
        break;
    }
  };

  return (
    <section
      id="how-it-works"
      className="py-20 sm:py-28 bg-[#f7f7f8] dark:bg-neutral-950 border-t border-neutral-200/80 dark:border-neutral-800/80 relative overflow-hidden"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* ═══════════════════════ HEADER ═══════════════════════ */}
        <div className="text-center max-w-2xl mx-auto mb-14 sm:mb-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-4xl sm:text-5xl lg:text-[3.25rem] font-black text-neutral-950 dark:text-neutral-50 tracking-tight leading-[1.08]">
              How It Works
            </h2>
          </motion.div>
        </div>

        {/* ═══════════════════════ ALL 5 STEPS (CLEAN MOCKUP) ═══════════════════════ */}
        <div className="space-y-16 sm:space-y-24">
          {stepsData.map((step, idx) => {
            const isEven = idx % 2 === 1;
            return (
              <motion.div
                key={step.id}
                initial={{ opacity: 0, y: 35 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ duration: 0.6, ease: "easeOut" }}
                className="py-4"
              >
                <div
                  className={`grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-16 items-center ${
                    isEven ? "lg:flex-row-reverse" : ""
                  }`}
                >
                  {/* ────── MOCKUP COLUMN: Clean Soft-Tinted Rounded Card ────── */}
                  <div
                    className={`lg:col-span-6 ${
                      isEven ? "lg:order-2" : "lg:order-1"
                    }`}
                  >
                    <div
                      className={`${step.bgTint} rounded-[2.5rem] sm:rounded-[3rem] pt-10 sm:pt-14 lg:pt-16 px-6 sm:px-10 pb-0 relative overflow-hidden flex items-end justify-center min-h-[440px] sm:min-h-[520px] dark:border dark:border-white/5`}
                    >
                      {/* Subtle radial light */}
                      <div className="absolute inset-0 bg-radial from-white/40 dark:from-white/5 via-transparent to-transparent pointer-events-none" />

                      {/* Phone mockup positioned lower */}
                      <div className="relative z-10 w-full max-w-[280px] sm:max-w-[320px] translate-y-6 sm:translate-y-10 transition-transform duration-500 hover:scale-[1.02]">
                        <img
                          src={step.mockupImage}
                          alt={`${step.title} preview`}
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            if (target.src !== step.fallbackImage) {
                              target.src = step.fallbackImage;
                            }
                          }}
                          className="w-full h-auto drop-shadow-2xl object-contain"
                        />
                      </div>
                    </div>
                  </div>

                  {/* ────── EDITORIAL CONTENT COLUMN ────── */}
                  <div
                    className={`lg:col-span-6 flex flex-col justify-center ${
                      isEven ? "lg:order-1" : "lg:order-2"
                    }`}
                  >
                    {/* Bold Heading */}
                    <h3 className="text-4xl sm:text-5xl lg:text-6xl font-black text-neutral-950 dark:text-neutral-50 tracking-tight leading-[1.08] mb-4">
                      {step.title}
                    </h3>

                    <p className="text-xl sm:text-2xl font-bold text-neutral-900 dark:text-neutral-300 leading-snug">
                      {step.subtitle}
                    </p>

                    {/* Bold Red CTA Button (only for steps 1 & 2) */}
                    {step.ctaText && step.ctaAction && (
                      <div className="pt-8">
                        <button
                          onClick={() => handleAction(step.ctaAction)}
                          className="bg-[#E5192D] hover:bg-[#a3161a] text-white px-8 py-3.5 rounded-full font-bold text-sm sm:text-base shadow-lg shadow-red-600/25 hover:shadow-xl hover:shadow-red-700/30 transition-all duration-300 hover:scale-[1.02] cursor-pointer inline-flex items-center gap-2 group"
                        >
                          <span>{step.ctaText}</span>
                          <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* ═══════════════════════ OSA BUILDING HOURS & RETRIEVAL HUB ═══════════════════════ */}
      </div>
    </section>
  );
};

export default HowItWorks;
