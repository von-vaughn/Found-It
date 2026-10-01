import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Menu, X } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useNavigate, useLocation } from "react-router-dom";

interface NavbarProps {
  onReportClick?: (type: "lost" | "found") => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onReportClick }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const navRef = useRef<HTMLElement>(null);
  const indicatorRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const location = useLocation();

  const moveIndicator = (linkElement: HTMLButtonElement) => {
    const indicator = indicatorRef.current;
    if (!indicator) return;

    indicator.style.left = `${linkElement.offsetLeft}px`;
    indicator.style.width = `${linkElement.offsetWidth}px`;
  };

  useEffect(() => {
    const updateScrollState = () => setIsScrolled(window.scrollY > 40);
    updateScrollState();
    window.addEventListener("scroll", updateScrollState, { passive: true });

    return () => window.removeEventListener("scroll", updateScrollState);
  }, []);

  useLayoutEffect(() => {
    const updateIndicatorPosition = () => {
      const activeLink = navRef.current?.querySelector<HTMLButtonElement>(
        "[data-active='true']",
      );
      if (activeLink) moveIndicator(activeLink);
    };

    updateIndicatorPosition();
    window.addEventListener("resize", updateIndicatorPosition);
    return () => window.removeEventListener("resize", updateIndicatorPosition);
  }, [location.pathname, location.hash]);

  const navLinks = [
    { name: "Home", path: "/", key: "home" },
    { name: "Lost Items", path: "/lost-items", key: "lost" },
    { name: "Found Items", path: "/found-items", key: "found" },
    { name: "How It Works", path: "/#how-it-works", key: "how-it-works" },
  ];

  // Determine current active item
  const getIsActive = (link: (typeof navLinks)[0]) => {
    if (link.key === "lost") return location.pathname === "/lost-items";
    if (link.key === "found") return location.pathname === "/found-items";
    if (link.key === "how-it-works") return location.hash === "#how-it-works";
    if (link.key === "home") return location.pathname === "/" && !location.hash;
    return false;
  };

  const handleNavClick = (link: (typeof navLinks)[0]) => {
    setMobileMenuOpen(false);

    if (link.key === "home") {
      navigate("/");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else if (link.key === "lost") {
      navigate("/lost-items");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else if (link.key === "found") {
      navigate("/found-items");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else if (link.key === "how-it-works") {
      if (location.pathname === "/") {
        const elem = document.getElementById("how-it-works");
        if (elem) elem.scrollIntoView({ behavior: "smooth" });
      } else {
        navigate("/#how-it-works");
        setTimeout(() => {
          const elem = document.getElementById("how-it-works");
          if (elem) elem.scrollIntoView({ behavior: "smooth" });
        }, 100);
      }
    }
  };

  const handleReportAction = (type: "lost" | "found") => {
    setMobileMenuOpen(false);
    if (onReportClick) {
      onReportClick(type);
    } else {
      navigate(type === "lost" ? "/lost-items" : "/found-items");
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full bg-white/95 backdrop-blur-md border-b border-neutral-100 transition-all shadow-xs">
      <div
        className={`${isScrolled ? "w-[calc(100%-15rem)]" : "w-full"} mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between transition-[width] duration-300 ease-out`}
      >
        {/* Brand Logo */}
        <button
          onClick={() => {
            navigate("/");
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
          className="flex items-center gap-2.5 group cursor-pointer text-left"
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
        </button>

        {/* Desktop Navigation */}
        <nav
          ref={navRef}
          className="relative hidden md:flex items-center gap-8"
        >
          {navLinks.map((link) => {
            const isActive = getIsActive(link);
            return (
              <button
                key={link.name}
                data-active={isActive ? "true" : undefined}
                onClick={(event) => {
                  moveIndicator(event.currentTarget);
                  handleNavClick(link);
                }}
                className={`relative py-2 text-sm font-semibold transition-colors duration-200 cursor-pointer ${
                  isActive
                    ? "text-neutral-900 font-bold"
                    : "text-neutral-600 hover:text-neutral-900"
                }`}
              >
                {link.name}
              </button>
            );
          })}
          <div
            ref={indicatorRef}
            aria-hidden="true"
            className="absolute bottom-0 h-[2.5px] rounded-full bg-[#E5192D] transition-[left,width] duration-300 ease-out"
          />
        </nav>

        {/* Right Actions */}
        <div className="hidden md:flex items-center gap-4">
          <button
            type="button"
            onClick={() =>
              handleNavClick({
                name: "Lost Items",
                path: "/lost-items",
                key: "lost",
              })
            }
            className="text-sm font-semibold text-neutral-700 hover:text-neutral-900 px-3 py-2 transition-colors cursor-pointer"
          >
            Sign up
          </button>

          <Button
            onClick={() => handleReportAction("lost")}
            className="h-11 px-6 rounded-full bg-[#E5192D] hover:bg-[#c81424] text-white font-semibold shadow-md shadow-red-500/20 hover:shadow-lg hover:shadow-red-500/30 transition-all duration-300 transform hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
          >
            Sign in
          </Button>
        </div>

        {/* Mobile menu button */}
        <div className="flex md:hidden items-center gap-2">
          <Button
            size="sm"
            onClick={() => handleReportAction("lost")}
            className="h-9 px-3.5 rounded-full bg-[#E5192D] text-white text-xs font-semibold cursor-pointer"
          >
            Report Item
          </Button>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-lg text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 transition-colors cursor-pointer"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? (
              <X className="w-6 h-6" />
            ) : (
              <Menu className="w-6 h-6" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden border-b border-neutral-200 bg-white px-4 pt-2 pb-6 shadow-xl"
          >
            <div className="flex flex-col space-y-3">
              {navLinks.map((link) => {
                const isActive = getIsActive(link);
                return (
                  <button
                    key={link.name}
                    onClick={() => handleNavClick(link)}
                    className={`text-left px-3 py-2 rounded-md text-base font-medium transition-colors ${
                      isActive
                        ? "bg-red-50 text-[#E5192D] font-bold"
                        : "text-neutral-700 hover:bg-neutral-50"
                    }`}
                  >
                    {link.name}
                  </button>
                );
              })}
              <div className="pt-3 border-t border-neutral-100 flex flex-col gap-2">
                <Button
                  onClick={() => handleReportAction("lost")}
                  className="w-full rounded-full bg-[#E5192D] hover:bg-[#c81424] text-white font-semibold py-2.5 cursor-pointer"
                >
                  Report a Lost Item
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleReportAction("found")}
                  className="w-full rounded-full border-neutral-300 font-semibold py-2.5 cursor-pointer"
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
