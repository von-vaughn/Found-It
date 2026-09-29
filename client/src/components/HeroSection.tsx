import React, { useState, useEffect, useRef } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'motion/react';
import gsap from 'gsap';
import {
  Search,
  ArrowRight,
  Clock,
  ShieldCheck,
  CheckCircle2,
  SlidersHorizontal,
  Home,
  Plus,
  User,
  Wifi,
  BatteryCharging
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface HeroSectionProps {
  onReportLost: () => void;
  onBrowseFound: () => void;
  onSelectItem: (id: string) => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({
  onReportLost,
  onBrowseFound,
  onSelectItem
}) => {
  const [phoneTab, setPhoneTab] = useState<'lost' | 'found'>('lost');
  const [phoneSearchQuery, setPhoneSearchQuery] = useState('');
  const heroRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const subtitleRef = useRef<HTMLParagraphElement>(null);
  const ctaRef = useRef<HTMLDivElement>(null);
  const visualRef = useRef<HTMLDivElement>(null);

  // 3D tilt effect on mouse move
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const springConfig = { damping: 25, stiffness: 150 };
  const rotateX = useSpring(useTransform(mouseY, [-300, 300], [8, -8]), springConfig);
  const rotateY = useSpring(useTransform(mouseX, [-300, 300], [-8, 8]), springConfig);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!visualRef.current) return;
    const rect = visualRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    mouseX.set(e.clientX - centerX);
    mouseY.set(e.clientY - centerY);
  };

  const handleMouseLeave = () => {
    mouseX.set(0);
    mouseY.set(0);
  };

  // GSAP entrance animation
  useEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });

      tl.fromTo(
        '.hero-tag',
        { opacity: 0, y: -15 },
        { opacity: 1, y: 0, duration: 0.6, delay: 0.1 }
      )
        .fromTo(
          titleRef.current,
          { opacity: 0, y: 30 },
          { opacity: 1, y: 0, duration: 0.8 },
          '-=0.3'
        )
        .fromTo(
          subtitleRef.current,
          { opacity: 0, y: 20 },
          { opacity: 1, y: 0, duration: 0.7 },
          '-=0.5'
        )
        .fromTo(
          ctaRef.current,
          { opacity: 0, y: 20 },
          { opacity: 1, y: 0, duration: 0.7 },
          '-=0.4'
        )
        .fromTo(
          '.hero-visual-container',
          { opacity: 0, scale: 0.92, y: 40 },
          { opacity: 1, scale: 1, y: 0, duration: 1, ease: 'back.out(1.2)' },
          '-=0.6'
        );
    }, heroRef);

    return () => ctx.revert();
  }, []);

  // Phone mock items
  const phoneItems = [
    {
      id: 'item-1',
      title: 'Black Backpack',
      subtitle: 'Lost 2 days ago',
      type: 'lost',
      thumb: '/images/backpack.jpg',
      badge: 'Lost'
    },
    {
      id: 'item-2',
      title: 'Keys & Fob',
      subtitle: 'Found 1 day ago',
      type: 'found',
      thumb: '/images/keys.jpg',
      badge: 'Found'
    },
    {
      id: 'item-3',
      title: 'iPhone 13',
      subtitle: 'Lost 3 days ago',
      type: 'lost',
      thumb: '/images/iphone.jpg',
      badge: 'Lost'
    },
    {
      id: 'item-4',
      title: 'Leather Wallet',
      subtitle: 'Found 5 days ago',
      type: 'found',
      thumb: '/images/wallet.jpg',
      badge: 'Found'
    },
  ];

  const filteredPhoneItems = phoneItems.filter((item) => {
    const matchesTab = phoneTab === 'lost' ? item.type === 'lost' : item.type === 'found';
    const matchesSearch = item.title.toLowerCase().includes(phoneSearchQuery.toLowerCase());
    return matchesTab && matchesSearch;
  });

  return (
    <section
      id="home"
      ref={heroRef}
      className="relative pt-6 pb-20 md:pt-14 md:pb-28 overflow-hidden"
    >
      {/* Campus building background image — visible behind all content */}
      <div className="absolute inset-0 z-0">
        <img
          src="/images/campus.jpg"
          alt="Campus background"
          className="w-full h-full object-cover object-center"
        />
        {/* Light white tint — keeps content readable while campus photo shows through */}
        <div className="absolute inset-0 bg-white/60" />
      </div>

      {/* Decorative red arc lines on top of the photo */}
      <div className="absolute top-12 right-0 w-[55vw] max-w-[700px] h-[500px] pointer-events-none select-none z-10 opacity-60">
        <svg
          viewBox="0 0 700 500"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full"
        >
          <path
            d="M 60 420 C 180 200, 340 100, 680 180"
            stroke="#E5192D"
            strokeWidth="1.75"
            strokeDasharray="4 4"
            opacity="0.5"
          />
          <path
            d="M 120 440 C 220 230, 420 140, 700 240"
            stroke="#E5192D"
            strokeWidth="2"
            opacity="0.65"
          />
        </svg>
      </div>

      <div className="relative z-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">

          {/* Left Column: Headlines & CTAs */}
          <div className="lg:col-span-6 xl:col-span-6 space-y-7 z-10">
            {/* Tag / Category line */}
            <div className="hero-tag flex items-center gap-3">
              <span className="w-8 h-[2.5px] bg-[#E5192D] rounded-full inline-block" />
              <span className="text-xs sm:text-sm font-bold tracking-[0.18em] text-neutral-500 uppercase">
                OFFICE OF THE STUDENT AFFAIRS.
              </span>
            </div>

            {/* Giant Title */}
            <h1
              ref={titleRef}
              className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-neutral-900 leading-[1.08]"
            >
              Lost Something? <br />
              We’ll Help You{' '}
              <span className="text-[#E5192D] relative inline-block">
                Find It.
                <svg
                  className="absolute -bottom-1.5 left-0 w-full h-2.5 text-[#E5192D]/30"
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

            {/* Subtext */}
            <p
              ref={subtitleRef}
              className="text-base sm:text-lg text-neutral-600 max-w-xl leading-relaxed font-normal"
            >
              FindIt connects people to report, discover, and return lost items in your community — quickly and easily.
            </p>

            {/* Action Buttons */}
            <div
              ref={ctaRef}
              className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 pt-2"
            >
              {/* Primary button */}
              <Button
                onClick={onReportLost}
                className="h-13 px-7 rounded-full bg-[#E5192D] hover:bg-[#c91424] text-white text-base font-semibold shadow-lg shadow-red-500/25 hover:shadow-xl hover:shadow-red-500/35 transition-all duration-300 transform hover:-translate-y-0.5 active:translate-y-0 cursor-pointer flex items-center justify-center gap-2.5"
              >
                <Search className="w-5 h-5 stroke-[2.5]" />
                Report a Lost Item
              </Button>

              {/* Secondary button */}
              <Button
                variant="outline"
                onClick={onBrowseFound}
                className="h-13 px-7 rounded-full border-neutral-300 bg-white hover:bg-neutral-50 text-neutral-800 text-base font-semibold shadow-sm hover:border-neutral-400 transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer group"
              >
                Browse Found Items
                <ArrowRight className="w-4 h-4 text-neutral-500 group-hover:translate-x-1 transition-transform" />
              </Button>
            </div>

            {/* Quick Micro-proof stats */}
            <div className="pt-4 flex flex-wrap items-center gap-6 text-xs sm:text-sm text-neutral-500 font-medium">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span><strong className="text-neutral-900 font-bold">24,000+</strong> Items Reunited</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-[#E5192D]" />
                <span><strong className="text-neutral-900 font-bold">&lt; 24h</strong> Average Match Time</span>
              </div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-blue-600" />
                <span><strong className="text-neutral-900 font-bold">100%</strong> Free for Community</span>
              </div>
            </div>

          </div>

          {/* Right Column: Layered 3D Floating Phone & Real Items Showcase */}
          <div
            ref={visualRef}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            className="lg:col-span-6 xl:col-span-6 flex justify-center items-center relative py-6"
          >
            <motion.div
              style={{ rotateX, rotateY, transformStyle: 'preserve-3d' }}
              className="hero-visual-container relative w-full max-w-[490px] aspect-[4/4.4] flex items-center justify-center"
            >
              {/* Layer 1: Ambient soft radial backdrop circle */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[340px] h-[340px] rounded-full bg-gradient-to-tr from-red-100/70 via-rose-50/50 to-transparent blur-2xl -z-10" />

              {/* Layer 2: Black Backpack placed naturally behind phone (left side) */}
              <motion.div
                animate={{ y: [0, -6, 0] }}
                transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
                className="absolute left-2 sm:left-4 top-10 sm:top-14 w-44 sm:w-56 aspect-[3/4] z-10 select-none pointer-events-none drop-shadow-2xl"
              >
                <div className="relative w-full h-full rounded-2xl overflow-hidden shadow-2xl border border-neutral-800/10">
                  <img
                    src="/images/backpack.jpg"
                    alt="Backpack item"
                    className="w-full h-full object-cover brightness-95"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
                  <div className="absolute bottom-2.5 left-2.5 bg-black/60 backdrop-blur-md text-white text-[11px] font-medium px-2 py-0.5 rounded-full flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#E5192D] animate-ping" />
                    Black Backpack
                  </div>
                </div>
              </motion.div>

              {/* Layer 3: Sleek Leather Wallet resting on right side */}
              <motion.div
                animate={{ y: [0, 5, 0] }}
                transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
                className="absolute right-0 sm:right-2 top-28 sm:top-36 w-32 sm:w-40 aspect-[4/3] z-10 select-none pointer-events-none drop-shadow-xl"
              >
                <div className="relative w-full h-full rounded-xl overflow-hidden shadow-xl border border-neutral-900/10">
                  <img
                    src="/images/wallet.jpg"
                    alt="Leather Wallet"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute bottom-2 left-2 bg-black/60 backdrop-blur-md text-white text-[10px] font-medium px-2 py-0.5 rounded-full">
                    Found Wallet
                  </div>
                </div>
              </motion.div>

              {/* Layer 4: Car Keys resting at bottom left */}
              <motion.div
                animate={{ y: [0, -4, 0] }}
                transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
                className="absolute left-0 sm:left-6 bottom-4 sm:bottom-8 w-28 sm:w-36 aspect-[4/3] z-30 select-none pointer-events-none drop-shadow-2xl"
              >
                <div className="relative w-full h-full rounded-xl overflow-hidden shadow-2xl border border-neutral-300/40 bg-white/70 backdrop-blur-sm p-1">
                  <img
                    src="/images/keys.jpg"
                    alt="Car Keys and Fob"
                    className="w-full h-full object-cover rounded-lg"
                  />
                  <div className="absolute bottom-1.5 left-1.5 bg-[#E5192D] text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow">
                    FOUND
                  </div>
                </div>
              </motion.div>

              {/* Layer 5: The Centerpiece iPhone Mockup (Interactive!) */}
              <motion.div
                className="relative z-20 w-[270px] sm:w-[290px] h-[550px] sm:h-[580px] bg-neutral-950 rounded-[48px] p-3 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.35),0_0_0_1px_rgba(255,255,255,0.15)] ring-1 ring-neutral-900 border border-neutral-800"
                style={{ transform: 'translateZ(30px)' }}
              >
                {/* Outer frame glossy edge highlight */}
                <div className="absolute inset-0 rounded-[48px] ring-1 ring-inset ring-white/10 pointer-events-none" />

                {/* iPhone Screen Content */}
                <div className="relative w-full h-full bg-white rounded-[38px] overflow-hidden flex flex-col font-sans select-none">

                  {/* Status Bar */}
                  <div className="pt-2 px-6 pb-1 flex items-center justify-between text-[11px] font-bold text-neutral-900 bg-white">
                    <span>9:41</span>
                    {/* Dynamic Island pill */}
                    <div className="w-20 h-4 bg-black rounded-full mx-auto -mt-0.5 flex items-center justify-center">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#E5192D] mr-1.5 animate-pulse" />
                      <span className="text-[7.5px] text-white font-medium">FindIt Radar</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-neutral-800">
                      <Wifi className="w-3 h-3" />
                      <BatteryCharging className="w-3.5 h-3.5" />
                    </div>
                  </div>

                  {/* App Header */}
                  <div className="px-4 py-2 flex items-center justify-center gap-1.5 border-b border-neutral-100">
                    <div className="w-5 h-5 rounded-full overflow-hidden">
                      <img src="/logo.jpeg" alt="Logo" className="w-full h-full object-cover" />
                    </div>
                    <span className="text-base font-bold text-neutral-900 tracking-tight">
                      Find<span className="text-[#E5192D]">It</span>
                    </span>
                  </div>

                  {/* Search Bar inside app */}
                  <div className="p-3">
                    <div className="relative flex items-center">
                      <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-2.5" />
                      <input
                        type="text"
                        value={phoneSearchQuery}
                        onChange={(e) => setPhoneSearchQuery(e.target.value)}
                        placeholder="Search lost or found items..."
                        className="w-full h-8 pl-8 pr-7 text-xs bg-neutral-100/90 rounded-lg text-neutral-800 placeholder-neutral-400 focus:outline-none focus:ring-1 focus:ring-red-500"
                      />
                      <SlidersHorizontal className="w-3 h-3 text-neutral-400 absolute right-2.5" />
                    </div>
                  </div>

                  {/* Tabs: Lost Items / Found Items */}
                  <div className="px-4 flex gap-6 border-b border-neutral-100">
                    <button
                      onClick={() => setPhoneTab('lost')}
                      className={`pb-2 text-xs font-bold transition-all relative ${phoneTab === 'lost' ? 'text-neutral-900' : 'text-neutral-400 hover:text-neutral-600'
                        }`}
                    >
                      Lost Items
                      {phoneTab === 'lost' && (
                        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#E5192D] rounded-full" />
                      )}
                    </button>
                    <button
                      onClick={() => setPhoneTab('found')}
                      className={`pb-2 text-xs font-bold transition-all relative ${phoneTab === 'found' ? 'text-neutral-900' : 'text-neutral-400 hover:text-neutral-600'
                        }`}
                    >
                      Found Items
                      {phoneTab === 'found' && (
                        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#E5192D] rounded-full" />
                      )}
                    </button>
                  </div>

                  {/* Item List inside Phone */}
                  <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2">
                    {filteredPhoneItems.map((item) => (
                      <div
                        key={item.id}
                        onClick={() => onSelectItem(item.id)}
                        className="flex items-center gap-2.5 p-2 rounded-xl bg-white border border-neutral-100 hover:border-red-200 hover:shadow-sm transition-all cursor-pointer group"
                      >
                        <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0 bg-neutral-100 border border-neutral-200/60">
                          <img
                            src={item.thumb}
                            alt={item.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <h4 className="text-xs font-semibold text-neutral-900 truncate">
                              {item.title}
                            </h4>
                            <span
                              className={`text-[9px] font-bold px-1.5 py-0.2 rounded-full ${item.type === 'lost'
                                  ? 'bg-red-50 text-[#E5192D]'
                                  : 'bg-emerald-50 text-emerald-600'
                                }`}
                            >
                              {item.badge}
                            </span>
                          </div>
                          <p className="text-[10px] text-neutral-400">
                            {item.subtitle}
                          </p>
                        </div>
                        <ArrowRight className="w-3.5 h-3.5 text-neutral-300 group-hover:text-red-500 group-hover:translate-x-0.5 transition-all shrink-0" />
                      </div>
                    ))}

                    {filteredPhoneItems.length === 0 && (
                      <div className="text-center py-6 text-neutral-400 text-xs">
                        No items match your filter
                      </div>
                    )}
                  </div>

                  {/* Interactive In-App Quick Action Banner */}
                  <div className="px-3 pb-2">
                    <button
                      onClick={onReportLost}
                      className="w-full py-1.5 px-3 bg-red-50 hover:bg-red-100/80 text-[#E5192D] rounded-lg text-[11px] font-bold flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <Plus className="w-3 h-3 stroke-[3]" />
                      Report an item now
                    </button>
                  </div>

                  {/* App Bottom Navigation Bar */}
                  <div className="h-12 border-t border-neutral-100 bg-white/95 px-6 flex items-center justify-between">
                    <div className="flex flex-col items-center gap-0.5 text-[#E5192D]">
                      <Home className="w-4 h-4 stroke-[2.2]" />
                      <span className="text-[9px] font-bold">Home</span>
                    </div>
                    <button
                      onClick={onReportLost}
                      className="flex flex-col items-center gap-0.5 text-neutral-500 hover:text-neutral-900"
                    >
                      <div className="w-6 h-6 rounded-full bg-neutral-100 flex items-center justify-center">
                        <Plus className="w-3.5 h-3.5 text-neutral-700" />
                      </div>
                      <span className="text-[9px] font-medium">Report</span>
                    </button>
                    <div className="flex flex-col items-center gap-0.5 text-neutral-400">
                      <User className="w-4 h-4" />
                      <span className="text-[9px] font-medium">Profile</span>
                    </div>
                  </div>

                  {/* iPhone bottom home indicator pill */}
                  <div className="pb-1 pt-0.5 flex justify-center bg-white">
                    <div className="w-24 h-1 bg-neutral-300 rounded-full" />
                  </div>

                </div>
              </motion.div>

            </motion.div>
          </div>

        </div>
      </div>
    </section>
  );
};
