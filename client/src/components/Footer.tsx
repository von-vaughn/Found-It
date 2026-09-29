import React from 'react';
import { Heart, Mail, Shield, ArrowUp } from 'lucide-react';

export const Footer: React.FC = () => {
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer className="bg-neutral-950 text-neutral-300 pt-16 pb-12 border-t border-neutral-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 pb-12 border-b border-neutral-900">
          
          {/* Brand info */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-full overflow-hidden shadow ring-1 ring-neutral-700">
                <img src="/logo.jpeg" alt="FindIt Logo" className="w-full h-full object-cover" />
              </div>
              <span className="text-2xl font-extrabold tracking-tight text-white">
                Find<span className="text-[#E5192D]">It</span>
              </span>
            </div>
            
            <p className="text-sm text-neutral-400 max-w-sm leading-relaxed">
              FindIt is the modern lost and found network connecting campus communities and neighborhoods to reunite people with their cherished belongings.
            </p>

            <div className="flex items-center gap-2 text-xs text-neutral-500 pt-2">
              <Shield className="w-4 h-4 text-emerald-500" />
              <span>Safe Meetup &amp; Verified Ownership Protocol</span>
            </div>
          </div>

          {/* Quick Links */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-200">
              Explore
            </h4>
            <ul className="space-y-2 text-sm text-neutral-400">
              <li><a href="#home" className="hover:text-white transition-colors">Home</a></li>
              <li><a href="#items" className="hover:text-white transition-colors">Lost Items Feed</a></li>
              <li><a href="#items" className="hover:text-white transition-colors">Found Items Feed</a></li>
              <li><a href="#how-it-works" className="hover:text-white transition-colors">How It Works</a></li>
              <li><a href="#about" className="hover:text-white transition-colors">About &amp; Safety</a></li>
            </ul>
          </div>

          {/* Categories */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-200">
              Popular Categories
            </h4>
            <ul className="space-y-2 text-sm text-neutral-400">
              <li><a href="#items" className="hover:text-white transition-colors">Backpacks &amp; Bags</a></li>
              <li><a href="#items" className="hover:text-white transition-colors">Phones &amp; Laptops</a></li>
              <li><a href="#items" className="hover:text-white transition-colors">Keys &amp; Fobs</a></li>
              <li><a href="#items" className="hover:text-white transition-colors">Wallets &amp; Cards</a></li>
              <li><a href="#items" className="hover:text-white transition-colors">Eyewear &amp; Watches</a></li>
            </ul>
          </div>

          {/* Community & Contact */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-200">
              Partner With Us
            </h4>
            <p className="text-xs text-neutral-400 leading-relaxed">
              Are you a university campus, airport, library or transit hub? Deploy FindIt for your facility.
            </p>
            <div className="pt-2">
              <a 
                href="mailto:contact@findit.community" 
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#ff4b5c] hover:underline"
              >
                <Mail className="w-3.5 h-3.5" />
                partnerships@findit.community
              </a>
            </div>
          </div>

        </div>

        {/* Bottom bar */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-neutral-500">
          <div className="flex items-center gap-1">
            <span>© {new Date().getFullYear()} FindIt Network. Built with</span>
            <Heart className="w-3.5 h-3.5 text-[#E5192D] fill-current" />
            <span>for warmer reunions.</span>
          </div>

          <div className="flex items-center gap-6">
            <a href="#privacy" className="hover:text-neutral-300 transition-colors">Privacy Policy</a>
            <a href="#terms" className="hover:text-neutral-300 transition-colors">Terms of Service</a>
            <button 
              onClick={scrollToTop}
              className="flex items-center gap-1 text-neutral-400 hover:text-white transition-colors ml-2"
            >
              <span>Back to top</span>
              <ArrowUp className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

      </div>
    </footer>
  );
};
