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
import type { Item } from "@/data/mockItems";
import {
  defaultFilters,
  type ItemFilters,
} from "@/components/school_user/itemFilters";
import type {
  NewReturnItemRequest,
  ReturnItemRequest,
} from "@/types/claim";

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
  const [items, setItems] = useState<Item[]>([]);
  const [returnRequests, setReturnRequests] = useState<ReturnItemRequest[]>(
    [],
  );
  const [filters, setFilters] = useState<ItemFilters>(defaultFilters);
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, isLoading: isAuthLoading } = useAuth();

  const handleAddItem = (newItem: Item) => {
    setItems((prev) => [newItem, ...prev]);
  };

  const handleUpdateItem = (updatedItem: Item) => {
    setItems((prev) =>
      prev.map((item) => (item.id === updatedItem.id ? updatedItem : item)),
    );
  };

  const handleDeleteItem = (id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  const handleSubmitReturnRequest = (request: NewReturnItemRequest) => {
    setReturnRequests((current) => {
      if (current.some((entry) => entry.sourceClaimId === request.sourceClaimId)) {
        return current;
      }
      return [
        {
          ...request,
          id: `RT-${String(Date.now()).slice(-6)}`,
          status: "Pending",
          submitted: new Intl.DateTimeFormat("en", {
            dateStyle: "medium",
            timeStyle: "short",
          }).format(new Date()),
        },
        ...current,
      ];
    });
  };


  const handleBrowseLost = () => {
    navigate("/browse?type=lost");
  };

  const handleBrowseFound = () => {
    navigate("/browse?type=found");
  };

  const isDashboard =
    location.pathname.startsWith("/dashboard") ||
    location.pathname.startsWith("/admin") ||
    location.pathname.startsWith("/superadmin");
  const isHome = location.pathname === "/";
  const shouldShowHomeChrome = !isAuthenticated && !isAuthLoading;

  return (
    <div className="min-h-screen bg-white font-sans text-neutral-900 selection:bg-[#E5192D] selection:text-white flex flex-col justify-between">
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

      {!isDashboard && (
        <Navbar
          onReportClick={(type) => {
            navigate(
              type === "lost" ? "/browse?type=lost" : "/browse?type=found",
            );
          }}
        />
      )}

      <div className="flex-1">
        <AppRoutes
          items={items}
          onAddItem={handleAddItem}
          onUpdateItem={handleUpdateItem}
          onDeleteItem={handleDeleteItem}
          returnRequests={returnRequests}
          onSubmitReturnRequest={handleSubmitReturnRequest}
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
