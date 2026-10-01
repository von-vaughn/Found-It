import { useState, useEffect } from "react";
import {
  Routes,
  Route,
  useNavigate,
  useLocation,
  Navigate,
} from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { HomePage } from "@/pages/landing/HomePage";
import { LostItemsPage } from "@/pages/landing/LostItemsPage";
import { FoundItemsPage } from "@/pages/landing/FoundItemsPage";
import { initialItems, type Item } from "@/data/mockItems";

// Scroll to top automatically when navigating to a new route
function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
  }, [pathname]);
  return null;
}

export function App() {
  const [items, setItems] = useState<Item[]>(initialItems);
  const navigate = useNavigate();

  const handleAddItem = (newItem: Item) => {
    setItems((prev) => [newItem, ...prev]);
  };

  const handleBrowseLost = () => {
    navigate("/lost-items");
  };

  const handleBrowseFound = () => {
    navigate("/found-items");
  };

  return (
    <div className="min-h-screen bg-white font-sans text-neutral-900 selection:bg-[#E5192D] selection:text-white flex flex-col justify-between">
      <ScrollToTop />

      {/* Toast notifications */}
      <Toaster
        position="top-right"
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

      {/* Navigation */}
      <Navbar
        onReportClick={(type) => {
          navigate(type === "lost" ? "/lost-items" : "/found-items");
        }}
      />

      {/* Page Routing */}
      <div className="flex-1">
        <Routes>
          {/* Landing Page without Items Feed */}
          <Route
            path="/"
            element={
              <HomePage
                onBrowseLost={handleBrowseLost}
                onBrowseFound={handleBrowseFound}
              />
            }
          />

          {/* Dedicated Lost Items Page (Shows only lost items) */}
          <Route
            path="/lost-items"
            element={<LostItemsPage items={items} onAddItem={handleAddItem} />}
          />

          {/* Dedicated Found Items Page (Shows only found items) */}
          <Route
            path="/found-items"
            element={<FoundItemsPage items={items} onAddItem={handleAddItem} />}
          />

          {/* Catch-all redirect to Home */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>

      {/* Footer */}
      <Footer />
    </div>
  );
}

export default App;
