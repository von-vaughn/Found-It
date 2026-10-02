import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Search,
  User,
  Package,
  Clock,
  MapPin,
  Building2,
  CreditCard,
  Sparkles,
  Maximize2,
  X,
  ShieldCheck,
} from "lucide-react";

interface HowItWorksProps {
  onBrowseLost: () => void;
}

interface GalleryItem {
  id: string;
  image: string;
  code: string;
  category: string;
  title: string;
  caption: string;
  badgeIcon: React.ElementType;
}

export const HowItWorks: React.FC<HowItWorksProps> = ({
  onBrowseLost: _onBrowseLost,
}) => {
  // Real images from 10 to 16.jpeg as requested
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

  const activeItem = galleryItems[selectedIndex] || galleryItems[0];
  const thumbnailItems = galleryItems
    .filter((_, idx) => idx !== selectedIndex)
    .slice(0, 4);

  return (
    <section
      id="how-it-works"
      className="py-16 sm:py-24 bg-[#FAFAFA] border-t border-neutral-200/80 relative overflow-hidden"
    >
      <div className="absolute top-1/4 right-10 w-96 h-96 bg-red-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 left-10 w-80 h-80 bg-neutral-300/20 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-screen-2xl mx-auto px-2 sm:px-4 lg:px-4 relative z-10">
        {/* Main 2-Column Split Section */}
        <div className="grid grid-cols-1 lg:grid-cols-[13fr_11fr] xl:grid-cols-[8fr_5fr] gap-8 items-start">
          {/* ================= LEFT COLUMN: Visual Showcase & 4 Thumbnail Cards ================= */}
          <div className="relative">
            <div className="bg-[#7F1D1D] rounded-[2rem] p-3 sm:p-4 border border-white/10 shadow-sm relative overflow-hidden">
              <div className="relative z-10 grid grid-cols-1 sm:grid-cols-12 gap-3 sm:gap-3.5 lg:h-[720px]">
                {/* Large Featured Card (Spans 8 cols on sm+) */}
                <motion.div
                  layout
                  className="sm:col-span-8 relative rounded-2xl sm:rounded-3xl overflow-hidden bg-neutral-900 shadow-md group min-h-[360px] sm:min-h-[460px] lg:min-h-0 lg:h-full flex flex-col justify-between"
                >
                  <AnimatePresence mode="wait">
                    <motion.img
                      key={activeItem.id}
                      src={activeItem.image}
                      alt={activeItem.title}
                      initial={{ opacity: 0, scale: 1.05 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.4, ease: "easeOut" }}
                      className="absolute inset-0 w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-700"
                    />
                  </AnimatePresence>

                  {/* Top Header Badge: [Search Icon] LOST & FOUND | 01 */}
                  <div className="relative z-10 p-4 sm:p-5 flex items-center justify-between">
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/60 backdrop-blur-md border border-white/20 text-white text-xs font-bold tracking-wider shadow-lg">
                      <div className="w-4 h-4 rounded-full bg-[#E5192D] flex items-center justify-center">
                        <Search className="w-2.5 h-2.5 text-white stroke-[2.5]" />
                      </div>
                      <span>LOST &amp; FOUND</span>
                      <span className="text-white/40">|</span>
                      <span className="text-neutral-200">
                        {activeItem.code}
                      </span>
                    </div>

                    <button
                      onClick={() => setLightboxOpen(true)}
                      className="w-8 h-8 rounded-full bg-black/50 hover:bg-black/80 backdrop-blur-md border border-white/20 text-white flex items-center justify-center cursor-pointer transition-all hover:scale-105"
                      title="Enlarge Photo"
                    >
                      <Maximize2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Bottom Text Overlay: "Real Items. Real People." in stylish cursive font */}
                  <div className="relative z-10 p-5 sm:p-6 mt-auto">
                    <div className="mb-2">
                      <span className="text-xs uppercase tracking-widest text-[#E5192D] font-extrabold bg-white/90 backdrop-blur-sm px-2.5 py-0.5 rounded-md inline-block mb-1.5 shadow-xs">
                        {activeItem.category}
                      </span>
                      <h4 className="text-white font-bold text-base sm:text-lg leading-snug drop-shadow-sm">
                        {activeItem.title}
                      </h4>
                    </div>

                    {/* Cursive Handwriting Flourish */}
                    <div className="pt-2 border-t border-white/15">
                      <p
                        className="text-white text-2xl sm:text-3xl font-bold leading-tight drop-shadow-md select-none"
                        style={{ fontFamily: "'Caveat', cursive, sans-serif" }}
                      >
                        Real Items. <br />
                        <span className="relative inline-block text-neutral-100">
                          Real People.
                          <svg
                            className="absolute -bottom-1 left-0 w-full h-2 text-[#E5192D]"
                            viewBox="0 0 100 8"
                            fill="none"
                            xmlns="http://www.w3.org/2000/svg"
                          >
                            <path
                              d="M2 6C30 2 70 2 98 6"
                              stroke="currentColor"
                              strokeWidth="3"
                              strokeLinecap="round"
                            />
                          </svg>
                        </span>
                      </p>
                    </div>
                  </div>
                </motion.div>

                {/* 4 Stacked Thumbnail Cards (Spans 4 cols on sm+) */}
                <div className="sm:col-span-4 grid grid-cols-2 sm:grid-cols-1 sm:grid-rows-4 gap-2.5 sm:gap-3 flex-col justify-between lg:min-h-0 lg:h-full">
                  {thumbnailItems.map((item) => {
                    const BadgeIcon = item.badgeIcon;
                    const realIndex = galleryItems.findIndex(
                      (it) => it.id === item.id,
                    );

                    return (
                      <motion.div
                        key={item.id}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setSelectedIndex(realIndex)}
                        className="relative h-[95px] sm:h-full sm:min-h-[105px] rounded-xl sm:rounded-2xl overflow-hidden cursor-pointer group border border-neutral-200/80 shadow-xs hover:shadow-md hover:border-[#E5192D]/60 transition-all duration-200 bg-neutral-100"
                      >
                        <img
                          src={item.image}
                          alt={item.title}
                          className="w-full h-full object-cover object-center group-hover:scale-110 transition-transform duration-500"
                        />
                        {/* Pill badge at bottom-left */}
                        <div className="absolute bottom-2 left-2 z-10">
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/65 backdrop-blur-md text-white text-[11px] font-semibold border border-white/15 shadow-sm group-hover:bg-[#E5192D] group-hover:border-transparent transition-colors">
                            <BadgeIcon className="w-3 h-3 text-white/90" />
                            <span>{item.category}</span>
                          </div>
                        </div>

                        {/* Code index at top right */}
                        <div className="absolute top-2 right-2 text-[10px] font-bold text-white/60 bg-black/40 px-1.5 py-0.5 rounded backdrop-blur-xs">
                          {item.code}
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>

              {/* Quick instructions indicator below thumbnails */}
              <div className="relative z-10 mt-3 pt-3 border-t border-white/20 flex items-center justify-between text-xs text-white/75 px-1">
                <span className="flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-white" />
                  <span>Click any photo to inspect station details</span>
                </span>
                <span className="font-semibold text-white">
                  {selectedIndex + 1} of {galleryItems.length} Photos
                </span>
              </div>
            </div>
          </div>

          {/* ================= RIGHT COLUMN: Header & 2 Process Cards ================= */}
          <div className="flex flex-col justify-between">
            <div>
              {/* Header Title */}
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

              <p className="text-neutral-600 text-base sm:text-lg leading-relaxed max-w-xl font-normal mb-8">
                Here’s where you can claim your lost item or turn over a lost
                and found item.
              </p>

              {/* The Two Process Cards (Side by Side) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                {/* Card 1: To Claim Your Lost Item */}
                <motion.div
                  whileHover={{ y: -3 }}
                  transition={{ duration: 0.2 }}
                  className="bg-[#a3161a] rounded-3xl p-6 sm:p-7 shadow-lg hover:shadow-xl hover:shadow-red-900/40 transition-all duration-300 flex flex-col justify-between relative group overflow-hidden"
                >
                  <div className="absolute -top-16 -right-12 w-48 h-48 rounded-full bg-white/10 blur-[70px] pointer-events-none" />
                  <div className="absolute -bottom-20 -left-12 w-44 h-44 rounded-full bg-black/10 blur-3xl pointer-events-none" />
                  <div className="relative z-10">
                    {/* Top circular icon badge */}
                    <div className="flex items-center gap-3.5 mb-5">
                      <div className="w-12 h-12 rounded-full bg-white text-[#a3161a] flex items-center justify-center shrink-0 shadow-md shadow-black/20 group-hover:scale-105 transition-transform">
                        <User className="w-6 h-6 stroke-[2.2]" />
                      </div>
                      <h3 className="text-base font-black text-white leading-snug min-h-[66px]">
                        To Claim Your <br />
                        Lost Item
                      </h3>
                    </div>

                    {/* Step list */}
                    <div className="space-y-4">
                      {/* Step 1 */}
                      <div className="flex items-start gap-3">
                        <div className="w-6 h-6 rounded-full bg-white text-[#a3161a] text-xs font-bold flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
                          1
                        </div>
                        <p className="text-xs sm:text-[13px] text-white/90 leading-relaxed">
                          Go to the{" "}
                          <span className="font-bold text-white">
                            Office of Student Affairs (OSA)
                          </span>
                          .
                        </p>
                      </div>

                      {/* Step 2 */}
                      <div className="flex items-start gap-3">
                        <div className="w-6 h-6 rounded-full bg-white text-[#a3161a] text-xs font-bold flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
                          2
                        </div>
                        <p className="text-xs sm:text-[13px] text-white/90 leading-relaxed">
                          Provide a description of your lost item (e.g.,{" "}
                          <span className="font-bold text-white">
                            type, color, brand, date, location
                          </span>
                          ).
                        </p>
                      </div>

                      {/* Step 3 */}
                      <div className="flex items-start gap-3">
                        <div className="w-6 h-6 rounded-full bg-white text-[#a3161a] text-xs font-bold flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
                          3
                        </div>
                        <p className="text-xs sm:text-[13px] text-white/90 leading-relaxed">
                          Our staff will check the records and assist you with
                          the claim process.
                        </p>
                      </div>
                    </div>
                  </div>
                </motion.div>

                {/* Card 2: To Turn Over a Lost and Found Item */}
                <motion.div
                  whileHover={{ y: -3 }}
                  transition={{ duration: 0.2 }}
                  className="bg-[#a3161a] rounded-3xl p-6 sm:p-7 shadow-lg hover:shadow-xl hover:shadow-red-900/40 transition-all duration-300 flex flex-col justify-between relative group overflow-hidden"
                >
                  <div className="absolute -top-16 -right-12 w-48 h-48 rounded-full bg-white/10 blur-[70px] pointer-events-none" />
                  <div className="absolute -bottom-20 -left-12 w-44 h-44 rounded-full bg-black/10 blur-3xl pointer-events-none" />
                  <div className="relative z-10">
                    {/* Top circular icon badge */}
                    <div className="flex items-center gap-3.5 mb-5">
                      <div className="w-12 h-12 rounded-full bg-white text-[#a3161a] flex items-center justify-center shrink-0 shadow-md shadow-black/20 group-hover:scale-105 transition-transform">
                        <Package className="w-6 h-6 stroke-[2.2]" />
                      </div>
                      <h3 className="text-base font-black text-white leading-snug min-h-[66px]">
                        Turn Over a <br />
                        Lost and Found Item
                      </h3>
                    </div>

                    {/* Step list */}
                    <div className="space-y-4">
                      {/* Step 1 */}
                      <div className="flex items-start gap-3">
                        <div className="w-6 h-6 rounded-full bg-white text-[#a3161a] text-xs font-bold flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
                          1
                        </div>
                        <p className="text-xs sm:text-[13px] text-white/90 leading-relaxed">
                          Bring the item to the{" "}
                          <span className="font-bold text-white">
                            Office of Student Affairs (OSA)
                          </span>
                          .
                        </p>
                      </div>

                      {/* Step 2 */}
                      <div className="flex items-start gap-3">
                        <div className="w-6 h-6 rounded-full bg-white text-[#a3161a] text-xs font-bold flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
                          2
                        </div>
                        <p className="text-xs sm:text-[13px] text-white/90 leading-relaxed">
                          Provide your name and contact details (optional).
                        </p>
                      </div>

                      {/* Step 3 */}
                      <div className="flex items-start gap-3">
                        <div className="w-6 h-6 rounded-full bg-white text-[#a3161a] text-xs font-bold flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
                          3
                        </div>
                        <p className="text-xs sm:text-[13px] text-white/90 leading-relaxed">
                          Our staff will log the item and compare it with
                          existing reports. If it matches, we will notify the
                          owner.
                        </p>
                      </div>
                    </div>
                  </div>
                </motion.div>

                <motion.div
                  whileHover={{ y: -3 }}
                  transition={{ duration: 0.2 }}
                  className="md:col-span-2 bg-[#a3161a] rounded-3xl p-5 sm:p-6 shadow-lg hover:shadow-xl hover:shadow-red-900/40 transition-all duration-300 relative group overflow-hidden"
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
        </div>
      </div>

      {/* Lightbox Modal for inspecting photos 10 to 16.jpeg in full resolution */}
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
