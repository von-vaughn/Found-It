import React from "react";
import { Shield, ArrowUp } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

export const Footer: React.FC = () => {
  const navigate = useNavigate();

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleHowItWorks = (e: React.MouseEvent) => {
    e.preventDefault();
    if (window.location.pathname === "/") {
      document
        .getElementById("how-it-works")
        ?.scrollIntoView({ behavior: "smooth" });
    } else {
      navigate("/#how-it-works");
      setTimeout(() => {
        document
          .getElementById("how-it-works")
          ?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    }
  };

  return (
    <footer
      id="about"
      className="bg-neutral-950 text-neutral-300 pt-16 pb-12 border-t border-neutral-900"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 pb-12 border-b border-neutral-900">
          <div className="lg:col-span-2 space-y-4">
            <Link
              to="/"
              onClick={scrollToTop}
              className="flex items-center gap-2.5 group"
            >
              <div className="w-9 h-9 rounded-full overflow-hidden shadow ring-1 ring-neutral-700 group-hover:scale-105 transition-transform">
                <img
                  src="/logo.jpeg"
                  alt="FoundIt logo"
                  className="w-full h-full object-cover"
                />
              </div>
              <span className="text-2xl font-extrabold tracking-tight text-white">
                Found<span className="text-[#E5192D]">It</span>
              </span>
            </Link>

            <p className="text-sm text-neutral-400 max-w-sm leading-relaxed">
              FoundIt is the modern lost and found network connecting campus
              communities and neighborhoods to reunite people with their
              cherished belongings.
            </p>

            <div className="flex items-center gap-2 text-xs text-neutral-500 pt-2">
              <Shield className="w-4 h-4 text-emerald-500" />
              <span>Safe Meetup &amp; Verified Ownership Protocol</span>
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-200">
              Explore
            </h4>
            <ul className="space-y-2 text-sm text-neutral-400">
              <li>
                <Link
                  to="/"
                  onClick={scrollToTop}
                  className="hover:text-white transition-colors"
                >
                  Home
                </Link>
              </li>
              <li>
                <Link
                  to="/lost-items"
                  onClick={scrollToTop}
                  className="hover:text-[#E5192D] transition-colors"
                >
                  Lost Items Directory
                </Link>
              </li>
              <li>
                <Link
                  to="/found-items"
                  onClick={scrollToTop}
                  className="hover:text-emerald-400 transition-colors"
                >
                  Found Items Directory
                </Link>
              </li>
              <li>
                <a
                  href="#how-it-works"
                  onClick={handleHowItWorks}
                  className="hover:text-white transition-colors"
                >
                  How It Works
                </a>
              </li>
              <li>
                <a href="#about" className="hover:text-white transition-colors">
                  About &amp; Safety
                </a>
              </li>
            </ul>
          </div>

          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-200">
              Categories
            </h4>
            <ul className="space-y-2 text-sm text-neutral-400">
              <li>
                <Link
                  to="/lost-items"
                  onClick={scrollToTop}
                  className="hover:text-white transition-colors"
                >
                  Backpacks &amp; Bags
                </Link>
              </li>
              <li>
                <Link
                  to="/lost-items"
                  onClick={scrollToTop}
                  className="hover:text-white transition-colors"
                >
                  Phones &amp; Laptops
                </Link>
              </li>
              <li>
                <Link
                  to="/lost-items"
                  onClick={scrollToTop}
                  className="hover:text-white transition-colors"
                >
                  Keys &amp; Fobs
                </Link>
              </li>
              <li>
                <Link
                  to="/lost-items"
                  onClick={scrollToTop}
                  className="hover:text-white transition-colors"
                >
                  Wallets &amp; Cards
                </Link>
              </li>
              <li>
                <Link
                  to="/lost-items"
                  onClick={scrollToTop}
                  className="hover:text-white transition-colors"
                >
                  Eyewear &amp; Watches
                </Link>
              </li>
            </ul>
          </div>

          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-200">
              Student Affairs
            </h4>
            <p className="text-xs text-neutral-400 leading-relaxed">
              Office of Student Affairs Lost &amp; Found Central Hub. Open
              Monday &ndash; Friday, 8:00 AM &ndash; 5:00 PM.
            </p>
            <div className="pt-2 text-xs text-neutral-400">
              <span className="font-semibold text-neutral-300">
                Desk Support:
              </span>{" "}
              Room 102, Student Union Bldg.
            </div>
          </div>
        </div>

        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between text-xs text-neutral-500 gap-4">
          <p>
            © {new Date().getFullYear()} FoundIt. Built for campus communities.
          </p>
          <button
            onClick={scrollToTop}
            className="flex items-center gap-1.5 text-neutral-400 hover:text-white transition-colors cursor-pointer"
          >
            Back to top <ArrowUp className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </footer>
  );
};
