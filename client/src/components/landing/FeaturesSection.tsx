import React from "react";
import { motion } from "motion/react";
import {
  Sparkles,
  ShieldCheck,
  Lock,
  QrCode,
  Award,
  Bell,
  Check,
} from "lucide-react";

export const FeaturesSection: React.FC = () => {
  const features = [
    {
      icon: Sparkles,
      title: "AI Visual Matching",
      description:
        "Our computer vision models match item contours, brands, and colors even from blurry phone photos.",
      badge: "Smart Tech",
    },
    {
      icon: Lock,
      title: "Privacy-Shielded Messaging",
      description:
        "Chat directly inside FoundIt. Your phone number, email address, and personal socials are never exposed.",
      badge: "Zero Spam",
    },
    {
      icon: QrCode,
      title: "Safe Drop Zones & QR Tags",
      description:
        "Drop items at designated campus desks or library lockers. Claim with an authenticated verification code.",
      badge: "Verified",
    },
    {
      icon: Bell,
      title: "Real-Time Radar Alerts",
      description:
        "Subscribed to your dorm, building, or commute path? Get instant notifications when relevant items are found.",
      badge: "Instant Ping",
    },
    {
      icon: ShieldCheck,
      title: "Proof-of-Ownership Check",
      description:
        "Prevents fraudulent claims through serial number verification, lock-screen testing, or unique mark questions.",
      badge: "Secure",
    },
    {
      icon: Award,
      title: "Good Samaritan Rewards",
      description:
        "Say thanks with optional finder rewards or boost their campus karma score and community standing.",
      badge: "Community",
    },
  ];

  return (
    <section id="about" className="py-24 bg-white border-t border-neutral-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-100/60 text-[#E5192D] text-xs font-bold uppercase tracking-wider mb-3">
            <ShieldCheck className="w-3.5 h-3.5" />
            Built For Trust & Velocity
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-neutral-900 tracking-tight">
            Why People Trust FoundIt
          </h2>
          <p className="text-neutral-500 text-base mt-3">
            Every feature is designed to eliminate uncertainty, protect privacy,
            and accelerate reunions.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feat, idx) => {
            const Icon = feat.icon;
            return (
              <motion.div
                key={feat.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: idx * 0.1 }}
                className="p-7 rounded-3xl border border-neutral-200/80 bg-neutral-50/50 hover:bg-white hover:border-red-200 hover:shadow-lg hover:shadow-red-500/5 transition-all duration-300 flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 rounded-2xl bg-white border border-neutral-200 flex items-center justify-center text-[#E5192D] group-hover:bg-[#E5192D] group-hover:text-white transition-colors shadow-xs">
                      <Icon className="w-6 h-6 stroke-[2.2]" />
                    </div>
                    <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-neutral-200/60 text-neutral-700">
                      {feat.badge}
                    </span>
                  </div>

                  <h3 className="text-lg font-bold text-neutral-900 mb-2">
                    {feat.title}
                  </h3>
                  <p className="text-sm text-neutral-500 leading-relaxed">
                    {feat.description}
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t border-neutral-200/60 flex items-center text-xs text-neutral-400 font-medium">
                  <Check className="w-3.5 h-3.5 text-emerald-500 mr-1.5" />
                  Active in all regions
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
