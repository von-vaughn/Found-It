import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Menu, X, PlusCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface NavbarProps {
  onOpenReport: (type?: 'lost' | 'found') => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenReport, activeTab, setActiveTab }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    { name: 'Home', href: '#home', key: 'home' },
    { name: 'Lost Items', href: '#items', key: 'lost' },
    { name: 'Found Items', href: '#items', key: 'found' },
    { name: 'How It Works', href: '#how-it-works', key: 'how-it-works' },
    { name: 'About', href: '#about', key: 'about' },
  ];

  const handleNavClick = (key: string, href: string) => {
    setActiveTab(key);
    setMobileMenuOpen(false);
    const element = document.querySelector(href);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full bg-white/90 backdrop-blur-md border-b border-neutral-100 transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
        {/* Brand Logo */}
        <a 
          href="#home" 
          onClick={(e) => { e.preventDefault(); handleNavClick('home', '#home'); }}
          className="flex items-center gap-2.5 group cursor-pointer"
        >
          <div className="relative w-9 h-9 rounded-full overflow-hidden shadow-sm ring-1 ring-neutral-200/60 group-hover:scale-105 transition-transform duration-300">
            <img 
              src="/logo.jpeg" 
              alt="FindIt Logo" 
              className="w-full h-full object-cover"
            />
          </div>
          <span className="text-2xl font-extrabold tracking-tight text-neutral-900">
            Find<span className="text-[#E5192D]">It</span>
          </span>
        </a>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-8">
          {navLinks.map((link) => {
            const isActive = activeTab === link.key;
            return (
              <a
                key={link.name}
                href={link.href}
                onClick={(e) => {
                  e.preventDefault();
                  handleNavClick(link.key, link.href);
                }}
                className={`relative py-2 text-sm font-semibold transition-colors duration-200 ${
                  isActive ? 'text-neutral-900 font-bold' : 'text-neutral-600 hover:text-neutral-900'
                }`}
              >
                {link.name}
                {isActive && (
                  <motion.div
                    layoutId="activeNavIndicator"
                    className="absolute bottom-0 left-0 right-0 h-[2.5px] bg-[#E5192D] rounded-full"
                    transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                  />
                )}
              </a>
            );
          })}
        </nav>

        {/* Right Actions */}
        <div className="hidden md:flex items-center gap-4">
          <button 
            type="button"
            onClick={() => handleNavClick('items', '#items')}
            className="text-sm font-semibold text-neutral-700 hover:text-neutral-900 px-3 py-2 transition-colors cursor-pointer"
          >
            Login
          </button>
          
          <Button
            onClick={() => onOpenReport('lost')}
            className="h-11 px-6 rounded-full bg-[#E5192D] hover:bg-[#c81424] text-white font-semibold shadow-md shadow-red-500/20 hover:shadow-lg hover:shadow-red-500/30 transition-all duration-300 transform hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
          >
            <PlusCircle className="w-4 h-4 mr-1.5" />
            Get Started Free
          </Button>
        </div>

        {/* Mobile menu button */}
        <div className="flex md:hidden items-center gap-2">
          <Button
            size="sm"
            onClick={() => onOpenReport('lost')}
            className="h-9 px-3.5 rounded-full bg-[#E5192D] text-white text-xs font-semibold"
          >
            Report Item
          </Button>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-lg text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 transition-colors"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden border-b border-neutral-200 bg-white px-4 pt-2 pb-6 shadow-xl"
          >
            <div className="flex flex-col space-y-3">
              {navLinks.map((link) => (
                <a
                  key={link.name}
                  href={link.href}
                  onClick={(e) => {
                    e.preventDefault();
                    handleNavClick(link.key, link.href);
                  }}
                  className={`px-3 py-2 rounded-md text-base font-medium ${
                    activeTab === link.key ? 'bg-red-50 text-[#E5192D] font-bold' : 'text-neutral-700 hover:bg-neutral-50'
                  }`}
                >
                  {link.name}
                </a>
              ))}
              <div className="pt-3 border-t border-neutral-100 flex flex-col gap-2">
                <Button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onOpenReport('lost');
                  }}
                  className="w-full rounded-full bg-[#E5192D] hover:bg-[#c81424] text-white font-semibold py-2.5"
                >
                  Report a Lost Item
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onOpenReport('found');
                  }}
                  className="w-full rounded-full border-neutral-300 font-semibold py-2.5"
                >
                  Report a Found Item
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
};
