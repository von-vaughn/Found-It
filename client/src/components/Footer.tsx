import React from "react";
import { ArrowUp } from "lucide-react";
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
      className="bg-white text-neutral-700 pt-16 pb-12 border-t border-neutral-200"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 pb-12 border-b border-neutral-200">
          <div className="space-y-4">
            <Link
              to="/"
              onClick={scrollToTop}
              className="flex items-center gap-2.5 group"
            >
              <img
                src="/logo.jpeg"
                alt="FoundIt logo"
                className="w-9 h-9 object-cover rounded-none shadow-none ring-0 group-hover:scale-105 transition-transform"
              />
              <span className="text-2xl font-extrabold tracking-tight text-neutral-900">
                Found<span className="text-[#E5192D]">It</span>
              </span>
            </Link>

            <p className="text-sm text-neutral-600 max-w-sm leading-relaxed">
              FoundIt is the modern lost and found network connecting campus
              communities and neighborhoods to reunite people with their
              cherished belongings.
            </p>
          </div>

          <div className="space-y-6">
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-900">
                Explore
              </h4>
              <ul className="space-y-2 text-sm text-neutral-600">
                <li>
                  <Link
                    to="/"
                    onClick={scrollToTop}
                    className="hover:text-neutral-900 transition-colors"
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
                    className="hover:text-[#E5192D] transition-colors"
                  >
                    Found Items Directory
                  </Link>
                </li>
                <li>
                  <a
                    href="#how-it-works"
                    onClick={handleHowItWorks}
                    className="hover:text-neutral-900 transition-colors"
                  >
                    How It Works
                  </a>
                </li>
                <li>
                  <a
                    href="#about"
                    className="hover:text-neutral-900 transition-colors"
                  >
                    About &amp; Safety
                  </a>
                </li>
              </ul>
            </div>

            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-900">
                Student Affairs
              </h4>
              <p className="text-xs text-neutral-600 leading-relaxed">
                Office of Student Affairs Lost &amp; Found Central Hub. Open
                Monday &ndash; Friday, 8:00 AM &ndash; 5:00 PM.
              </p>
            </div>
          </div>
        </div>

        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between text-xs text-neutral-500 gap-4">
          <p>
            © {new Date().getFullYear()} FoundIt. Built for campus communities.
          </p>
          <button
            onClick={scrollToTop}
            className="flex items-center gap-1.5 text-neutral-600 hover:text-neutral-900 transition-colors cursor-pointer"
          >
            Back to top <ArrowUp className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </footer>
  );
};
