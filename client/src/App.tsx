import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { CommunityReunions } from "@/components/landing/CommunityReunions";
import { AuthProvider } from "@/context/AuthContext";
import { useAuth } from "@/context/useAuth";
import { ThemeProvider } from "@/context/ThemeContext";
import { AppRoutes } from "@/routes/AppRoutes";
import {
  defaultFilters,
  type ItemFilters,
} from "@/components/school_user/itemFilters";

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
  }, [pathname]);
  return null;
}

export function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <AppContent />
      </ThemeProvider>
    </AuthProvider>
  );
}

function AppContent() {
  const [filters, setFilters] = useState<ItemFilters>(defaultFilters);
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, isLoading: isAuthLoading } = useAuth();


  const handleBrowseLost = () => {
    navigate("/browse?type=lost");
  };

  const handleBrowseFound = () => {
    navigate("/browse?type=found");
  };

  const isDashboard =
    location.pathname.startsWith("/dashboard") ||
    location.pathname.startsWith("/admin");
  const isHome = location.pathname === "/";
  const shouldShowHomeChrome = !isAuthenticated && !isAuthLoading;

  return (
    <div className="min-h-screen bg-[#f7f7f8] dark:bg-neutral-950 font-sans text-neutral-900 dark:text-neutral-100 selection:bg-[#E5192D] selection:text-white flex flex-col justify-between">
      <ScrollToTop />

      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            borderRadius: "16px",
            background: "#171717",
            color: "#fff",
            fontSize: "13px",
            fontWeight: 500,
          },
        }}
      />

      {!isDashboard && (!isHome || shouldShowHomeChrome) && <Navbar />}

      <div className="flex-1 flex flex-col">
        <AppRoutes
          onBrowseLost={handleBrowseLost}
          onBrowseFound={handleBrowseFound}
          filters={filters}
          onFiltersChange={setFilters}
        />
      </div>

      {isHome && shouldShowHomeChrome && <CommunityReunions />}
      {!isDashboard &&
        location.pathname !== "/lost-items" &&
        location.pathname !== "/found-items" &&
        !location.pathname.startsWith("/browse") &&
        (!isHome || shouldShowHomeChrome) && <Footer />}
    </div>
  );
}

export default App;
