import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  User,
  Package,
  Clock,
  MapPin,
  Building2,
  CreditCard,
  Maximize2,
  X,
  ShieldCheck,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

interface GalleryItem {
  id: string;
  image: string;
  code: string;
  category: string;
  title: string;
  caption: string;
  badgeIcon: React.ElementType;
}

/* ── Step data for the right-side list ── */
interface ProcessStep {
  number: string;
  title: string;
  category: string;
  detail: string;
  readTime: string;
}

const claimSteps: ProcessStep[] = [
  {
    number: "01",
    title: "Visit the Office of Student Affairs (OSA).",
    category: "VISIT",
    detail: "Head to the OSA office on campus to start the claim process.",
    readTime: "Step 1",
  },
  {
    number: "02",
    title: "Describe your item — type, color, brand, date & location.",
    category: "DESCRIBE",
    detail: "Provide details so staff can match your report with found items.",
    readTime: "Step 2",
  },
  {
    number: "03",
    title: "Staff will verify records and help you claim your item.",
    category: "VERIFY",
    detail: "Our team checks the database and assists with the return process.",
    readTime: "Step 3",
  },
];

const turnoverSteps: ProcessStep[] = [
  {
    number: "01",
    title: "Bring the found item to the OSA office.",
    category: "TURN OVER",
    detail: "Deliver the item to the receiving desk at Student Affairs.",
    readTime: "Step 1",
  },
  {
    number: "02",
    title: "Provide your name and contact details (optional).",
    category: "REGISTER",
    detail: "Your info helps us follow up and acknowledge your good deed.",
    readTime: "Step 2",
  },
  {
    number: "03",
    title: "Staff will log and match it with existing reports.",
    category: "MATCH",
    detail: "If a match is found, we'll notify the owner immediately.",
    readTime: "Step 3",
  },
];

export const HowItWorks: React.FC = () => {
  /* ── Gallery data ── */
  const galleryItems: GalleryItem[] = [
    {
      id: "osa-main",
      image: "/images/10.jpeg",
      code: "01",
      category: "Main Facade",
      title: "Office of Student Affairs",
      caption: "Main entrance and student reception plaza",
      badgeIcon: Building2,
    },
    {
      id: "osa-signboard",
      image: "/images/11.jpeg",
      code: "02",
      category: "Signboard",
      title: "WMSU Student Affairs Hub",
      caption: "Official directory & USC office signage",
      badgeIcon: MapPin,
    },
    {
      id: "osa-campus",
      image: "/images/13.jpeg",
      code: "03",
      category: "Campus Grounds",
      title: "Student Center Grounds",
      caption: "Baliwasan campus perimeter & exterior",
      badgeIcon: ShieldCheck,
    },
    {
      id: "osa-porch",
      image: "/images/14.jpeg",
      code: "04",
      category: "Drop-off Post",
      title: "Receiving Entrance",
      caption: "Turn-over walkway & assistance window",
      badgeIcon: Package,
    },
    {
      id: "osa-records",
      image: "/images/16.jpeg",
      code: "05",
      category: "Claims Desk",
      title: "Verification Office",
      caption: "Lobby intake desk & records verification",
      badgeIcon: CreditCard,
    },
  ];

  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const [lightboxOpen, setLightboxOpen] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<"claim" | "turnover">("claim");

  const activeItem = galleryItems[selectedIndex] || galleryItems[0];
  const currentSteps = activeTab === "claim" ? claimSteps : turnoverSteps;

  /* ── Pagination helpers ── */
  const totalPages = galleryItems.length;
  const goNext = () =>
    setSelectedIndex((prev) => (prev + 1) % totalPages);
  const goPrev = () =>
    setSelectedIndex((prev) => (prev - 1 + totalPages) % totalPages);

  return (
    <section
      id="how-it-works"
      className="py-16 sm:py-24 bg-[#FAFAFA] border-t border-neutral-200/80 relative overflow-hidden"
    >
      {/* Ambient blurs */}
      <div className="absolute top-1/4 right-10 w-96 h-96 bg-red-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 left-10 w-80 h-80 bg-neutral-300/20 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* ═══════════════════════ MAIN 2-COLUMN LAYOUT ═══════════════════════ */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 xl:gap-14 items-start">
          {/* ─────── LEFT: Featured Card (magazine-style) ─────── */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.7, ease: "easeOut" }}
            className="relative"
          >
            <div className="bg-white rounded-[1.75rem] border border-neutral-200/90 shadow-lg shadow-black/[0.04] overflow-hidden group">
              {/* Image area */}
              <div className="relative aspect-[4/3] bg-neutral-100 overflow-hidden">
                <AnimatePresence mode="wait">
                  <motion.img
                    key={activeItem.id}
                    src={activeItem.image}
                    alt={activeItem.title}
                    initial={{ opacity: 0, scale: 1.06 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.45, ease: "easeOut" }}
                    className="w-full h-full object-cover object-center group-hover:scale-[1.03] transition-transform duration-700"
                  />
                </AnimatePresence>

                {/* Top-left badge: FEATURED · 01 */}
                <div className="absolute top-4 left-4 z-10">
                  <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-black/60 backdrop-blur-md border border-white/20 text-white text-[11px] font-bold tracking-[0.14em] uppercase shadow-lg">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#E5192D]" />
                    <span>Featured</span>
                    <span className="text-white/40">·</span>
                    <span className="text-neutral-300">{activeItem.code}</span>
                  </div>
                </div>

                {/* Top-right badge: Category pill */}
                <div className="absolute top-4 right-4 z-10">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#E5192D] text-white text-[11px] font-bold tracking-wider uppercase shadow-lg">
                    {activeItem.category}
                  </div>
                </div>

                {/* Expand button */}
                <button
                  onClick={() => setLightboxOpen(true)}
                  className="absolute bottom-4 right-4 z-10 w-9 h-9 rounded-full bg-black/50 hover:bg-black/80 backdrop-blur-md border border-white/20 text-white flex items-center justify-center cursor-pointer transition-all hover:scale-110"
                  title="Enlarge Photo"
                >
                  <Maximize2 className="w-4 h-4" />
                </button>
              </div>

              {/* Text content area below image */}
              <div className="p-6 sm:p-8">
                {/* Meta line */}
                <div className="flex items-center gap-2 text-[11px] font-bold text-neutral-400 tracking-[0.16em] uppercase mb-3">
                  <span>OSA</span>
                  <span className="text-neutral-300">·</span>
                  <span>{galleryItems.length} Locations</span>
                </div>

                {/* Title */}
                <h3 className="text-2xl sm:text-[1.75rem] font-black text-neutral-950 leading-snug tracking-tight mb-3">
                  {activeItem.title}
                </h3>

                {/* Description */}
                <p className="text-neutral-500 text-sm sm:text-[15px] leading-relaxed mb-6 max-w-md">
                  {activeItem.caption}. Where students come together to report,
                  recover, and return lost belongings through the Office of
                  Student Affairs.
                </p>

                {/* CTA row */}
                <div className="flex items-center justify-between">
                  <button
                    onClick={() => setLightboxOpen(true)}
                    className="inline-flex items-center gap-2.5 text-xs font-bold tracking-[0.16em] uppercase text-neutral-950 hover:text-[#E5192D] transition-colors group/cta cursor-pointer"
                  >
                    <span>View Location</span>
                    <div className="w-8 h-8 rounded-full border-2 border-neutral-300 group-hover/cta:border-[#E5192D] flex items-center justify-center transition-colors">
                      <ArrowRight className="w-3.5 h-3.5 group-hover/cta:translate-x-0.5 transition-transform" />
                    </div>
                  </button>

                  {/* Pagination dots */}
                  <div className="flex items-center gap-4">
                    <button
                      onClick={goPrev}
                      className="text-xs font-semibold text-neutral-400 hover:text-neutral-900 transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                      <span className="tracking-[0.12em] uppercase">Prev</span>
                    </button>

                    <div className="flex items-center gap-1.5">
                      {galleryItems.map((_, idx) => (
                        <button
                          key={idx}
                          onClick={() => setSelectedIndex(idx)}
                          className={`transition-all duration-200 cursor-pointer ${
                            selectedIndex === idx
                              ? "w-7 h-7 rounded-full bg-neutral-950 text-white text-[11px] font-bold flex items-center justify-center"
                              : "text-[12px] font-semibold text-neutral-400 hover:text-neutral-900 px-1"
                          }`}
                        >
                          {String(idx + 1).padStart(2, "0")}
                        </button>
                      ))}
                    </div>

                    <button
                      onClick={goNext}
                      className="text-xs font-semibold text-neutral-400 hover:text-neutral-900 transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      <span className="tracking-[0.12em] uppercase">Next</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* ─────── RIGHT: Title + Numbered editorial list ─────── */}
          <div className="flex flex-col">
            {/* Section header */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.6, delay: 0.15 }}
              className="mb-8"
            >
              <h2 className="text-4xl sm:text-5xl lg:text-[3.25rem] font-black text-neutral-950 tracking-tight leading-[1.08] mb-3">
                Lost an item? <br />
                Found something? <br />
                <span className="text-[#E5192D] relative inline-block">
                  Find It.
                  <svg
                    className="absolute -bottom-1.5 left-0 w-full h-2.5 text-[#E5192D]/40"
                    viewBox="0 0 100 8"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M1 5C25 2 75 2 99 5"
                      stroke="currentColor"
                      strokeWidth="3"
                      strokeLinecap="round"
                    />
                  </svg>
                </span>
              </h2>

              <p className="text-neutral-500 text-base sm:text-lg leading-relaxed max-w-xl font-normal">
                Here's where you can claim your lost item or turn over a found
                item. Follow the simple steps below.
              </p>
            </motion.div>

            {/* Tab switcher: Claim / Turn Over */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.5, delay: 0.25 }}
              className="flex items-center gap-1 mb-6 bg-neutral-100 rounded-full p-1 w-fit border border-neutral-200/80"
            >
              <button
                onClick={() => setActiveTab("claim")}
                className={`px-5 py-2 rounded-full text-sm font-bold tracking-wide transition-all cursor-pointer ${
                  activeTab === "claim"
                    ? "bg-[#a3161a] text-white shadow-md"
                    : "text-neutral-500 hover:text-neutral-900"
                }`}
              >
                <span className="flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Claim Item
                </span>
              </button>
              <button
                onClick={() => setActiveTab("turnover")}
                className={`px-5 py-2 rounded-full text-sm font-bold tracking-wide transition-all cursor-pointer ${
                  activeTab === "turnover"
                    ? "bg-[#a3161a] text-white shadow-md"
                    : "text-neutral-500 hover:text-neutral-900"
                }`}
              >
                <span className="flex items-center gap-2">
                  <Package className="w-4 h-4" />
                  Turn Over
                </span>
              </button>
            </motion.div>

            {/* ── Numbered list of steps (editorial style) ── */}
            <div className="flex flex-col">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  transition={{ duration: 0.35 }}
                >
                  {currentSteps.map((step, idx) => (
                    <motion.div
                      key={step.number}
                      initial={{ opacity: 0, x: 20 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{
                        duration: 0.4,
                        delay: idx * 0.1,
                      }}
                      className="group border-t border-neutral-200 last:border-b"
                    >
                      <div className="flex items-start gap-5 sm:gap-7 py-6 sm:py-7 cursor-default">
                        {/* Step number */}
                        <span className="text-lg sm:text-xl font-black text-neutral-300 group-hover:text-[#E5192D] transition-colors duration-300 shrink-0 mt-0.5 w-8 text-right tabular-nums">
                          {step.number}
                        </span>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <h4 className="text-base sm:text-lg font-extrabold text-neutral-900 leading-snug group-hover:text-neutral-950 transition-colors">
                            {step.title}
                          </h4>
                          <div className="flex items-center gap-2 mt-1.5 text-[11px] font-bold text-neutral-400 tracking-[0.14em] uppercase">
                            <span className="text-[#E5192D]/80">
                              {step.category}
                            </span>
                            <span className="text-neutral-300">·</span>
                            <span>{step.readTime}</span>
                          </div>
                        </div>

                        {/* Arrow button */}
                        <div className="shrink-0 mt-1">
                          <div className="w-9 h-9 rounded-full border-2 border-neutral-200 group-hover:border-[#E5192D] group-hover:bg-[#E5192D] flex items-center justify-center transition-all duration-300">
                            <ArrowRight className="w-4 h-4 text-neutral-400 group-hover:text-white transition-colors duration-300" />
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Building hours card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.5, delay: 0.35 }}
              whileHover={{ y: -3 }}
              className="mt-8 bg-[#a3161a] rounded-2xl p-5 sm:p-6 shadow-lg hover:shadow-xl hover:shadow-red-900/30 transition-all duration-300 relative group overflow-hidden"
            >
              <div className="absolute -top-16 -right-12 w-48 h-48 rounded-full bg-white/10 blur-[70px] pointer-events-none" />
              <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-full bg-white text-[#a3161a] flex items-center justify-center shrink-0 shadow-md shadow-black/20 group-hover:scale-105 transition-transform">
                    <Clock className="w-6 h-6 stroke-[2.2]" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-white leading-snug">
                      Building Hours
                    </h3>
                    <p className="text-sm text-white/80">
                      Office of Student Affairs
                    </p>
                  </div>
                </div>
                <div className="sm:text-right">
                  <p className="text-xs font-semibold uppercase text-white/80">
                    Monday–Friday
                  </p>
                  <p className="text-lg font-bold text-white">
                    8:00 AM – 5:00 PM
                  </p>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      {/* ═══════════════════════ LIGHTBOX ═══════════════════════ */}
      <AnimatePresence>
        {lightboxOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 sm:p-6"
            onClick={() => setLightboxOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="relative max-w-4xl w-full bg-neutral-950 rounded-3xl overflow-hidden border border-white/10 shadow-2xl"
            >
              <div className="relative aspect-[4/3] sm:aspect-[16/10] bg-black">
                <img
                  src={activeItem.image}
                  alt={activeItem.title}
                  className="w-full h-full object-contain"
                />

                <button
                  onClick={() => setLightboxOpen(false)}
                  className="absolute top-4 right-4 w-9 h-9 rounded-full bg-black/60 hover:bg-black text-white flex items-center justify-center cursor-pointer border border-white/20 transition-transform hover:scale-105"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-5 bg-neutral-900 text-white flex items-center justify-between">
                <div>
                  <span className="text-xs uppercase font-extrabold text-[#E5192D] tracking-wider">
                    {activeItem.category} &bull; Image {activeItem.code}
                  </span>
                  <h3 className="text-lg font-bold">{activeItem.title}</h3>
                  <p className="text-xs text-neutral-400 mt-0.5">
                    {activeItem.caption}
                  </p>
                </div>

                <div className="flex gap-2">
                  {galleryItems.map((item, idx) => (
                    <button
                      key={item.id}
                      onClick={() => setSelectedIndex(idx)}
                      className={`w-9 h-9 rounded-lg overflow-hidden border-2 cursor-pointer transition-all ${
                        selectedIndex === idx
                          ? "border-[#E5192D] scale-105"
                          : "border-white/20 opacity-60 hover:opacity-100"
                      }`}
                    >
                      <img
                        src={item.image}
                        alt={item.title}
                        className="w-full h-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
};

export default HowItWorks;
