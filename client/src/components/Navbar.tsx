import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Menu, X, LogOut } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/context/useAuth";
import { AuthModal } from "@/components/auth/AuthModal";

interface NavbarProps {
  onReportClick?: (type: "lost" | "found") => void;
}

export const Navbar: React.FC<NavbarProps> = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<"signin" | "signup" | null>(
    null,
  );
  const navRef = useRef<HTMLElement>(null);
  const indicatorRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAuthenticated, logout } = useAuth();

  const openAuthModal = (mode: "signin" | "signup") => {
    setMobileMenuOpen(false);
    setAuthModalMode(mode);
  };

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
      if (activeLink) {
        moveIndicator(activeLink);
      } else {
        const indicator = indicatorRef.current;
        if (indicator) indicator.style.width = "0px";
      }
    };

    updateIndicatorPosition();
    window.addEventListener("resize", updateIndicatorPosition);
    return () => window.removeEventListener("resize", updateIndicatorPosition);
  }, [location.pathname, location.hash]);

  const navLinks = [
    { name: "Home", path: "/", key: "home" },
    { name: "Dashboard", path: "/dashboard", key: "dashboard" },
    { name: "Lost Items", path: "/lost-items", key: "lost" },
    { name: "Found Items", path: "/found-items", key: "found" },
    { name: "How It Works", path: "/#how-it-works", key: "how-it-works" },
  ];

  const getIsActive = (link: (typeof navLinks)[0]) => {
    if (link.key === "dashboard") return location.pathname === "/dashboard";
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
    } else if (link.key === "dashboard") {
      navigate("/dashboard");
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

  return (
    <>
    <header className="sticky top-0 z-50 w-full bg-white/95 backdrop-blur-md border-b border-neutral-100 transition-all shadow-xs">
      <div
        className={`${isScrolled ? "md:w-[calc(100%-15rem)]" : ""} w-full mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between transition-[width] duration-300 ease-out`}
      >
        <button
          onClick={() => {
            navigate("/");
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
          className="flex items-center gap-2.5 group cursor-pointer text-left"
        >
          <img
            src="/logo.jpeg"
            alt="FoundIt logo"
            className="w-9 h-9 object-cover rounded-none shadow-none ring-0 group-hover:scale-105 transition-transform duration-300"
          />
          <span className="text-2xl font-extrabold tracking-tight text-neutral-900">
            Found<span className="text-[#E5192D]">It</span>
          </span>
        </button>

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

        <div className="hidden md:flex items-center gap-4">
          {isAuthenticated && user ? (
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-neutral-100 border border-neutral-200/80">
                <span className="w-7 h-7 rounded-full bg-[#E5192D] text-white flex items-center justify-center font-bold text-xs uppercase shadow-xs">
                  {user.name.charAt(0)}
                </span>
                <span className="text-xs font-bold text-neutral-800 max-w-[120px] truncate">
                  {user.name}
                </span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={logout}
                className="h-10 px-4 rounded-full border-neutral-200 text-neutral-700 hover:text-[#E5192D] hover:border-neutral-300 hover:bg-neutral-50 text-xs font-semibold cursor-pointer flex items-center gap-1.5 transition-all"
              >
                <LogOut className="w-3.5 h-3.5" />
                Sign out
              </Button>
            </div>
          ) : (
            <>
              <button
                type="button"
                onClick={() => openAuthModal("signin")}
                className="text-sm font-semibold text-neutral-700 hover:text-neutral-900 px-3 py-2 transition-colors cursor-pointer"
              >
                Sign in
              </button>

              <Button
                onClick={() => openAuthModal("signup")}
                className="h-11 px-6 rounded-full bg-[#E5192D] hover:bg-[#c81424] text-white font-semibold shadow-md shadow-red-500/20 hover:shadow-lg hover:shadow-red-500/30 transition-all duration-300 transform hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
              >
                Sign up
              </Button>
            </>
          )}
        </div>

        <div className="flex md:hidden items-center gap-2">
          {isAuthenticated ? (
            <Button
              size="sm"
              variant="outline"
              onClick={logout}
              className="h-9 px-3 rounded-full text-xs font-semibold cursor-pointer"
            >
              Sign out
            </Button>
          ) : (
            <Button
              size="sm"
              onClick={() => openAuthModal("signup")}
              className="h-9 px-3.5 rounded-full bg-[#E5192D] text-white text-xs font-semibold cursor-pointer"
            >
              Sign up
            </Button>
          )}
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
                {isAuthenticated && user ? (
                  <div className="flex items-center justify-between py-2">
                    <span className="text-sm font-bold text-neutral-800">
                      {user.name}
                    </span>
                    <button
                      onClick={() => {
                        setMobileMenuOpen(false);
                        logout();
                      }}
                      className="text-xs text-red-600 font-bold"
                    >
                      Sign out
                    </button>
                  </div>
                ) : (
                  <>
                    <button
                      onClick={() => openAuthModal("signin")}
                      className="text-left py-2 text-sm font-semibold text-neutral-700 hover:text-neutral-900"
                    >
                      Sign in
                    </button>
                    <button
                      onClick={() => openAuthModal("signup")}
                      className="text-left py-2 text-sm font-semibold text-[#E5192D]"
                    >
                      Create an account (Sign up)
                    </button>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
    <AnimatePresence>
      {authModalMode && (
        <AuthModal
          key={authModalMode}
          initialMode={authModalMode}
          onClose={() => setAuthModalMode(null)}
        />
      )}
    </AnimatePresence>
    </>
  );
};
