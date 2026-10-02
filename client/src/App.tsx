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
import { LoginPage } from "@/pages/auth/LoginPage";
import { VerificationPage } from "@/pages/auth/VerificationPage";
import { AuthProvider } from "@/context/AuthContext";
import { initialItems, type Item } from "@/data/mockItems";

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
    <AuthProvider>
      <div className="min-h-screen bg-white font-sans text-neutral-900 selection:bg-[#E5192D] selection:text-white flex flex-col justify-between">
        <ScrollToTop />

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

        <Navbar
          onReportClick={(type) => {
            navigate(type === "lost" ? "/lost-items" : "/found-items");
          }}
        />

        <div className="flex-1">
          <Routes>
            <Route
              path="/"
              element={
                <HomePage
                  onBrowseLost={handleBrowseLost}
                  onBrowseFound={handleBrowseFound}
                />
              }
            />

            <Route
              path="/lost-items"
              element={<LostItemsPage items={items} onAddItem={handleAddItem} />}
            />

            <Route
              path="/found-items"
              element={<FoundItemsPage items={items} onAddItem={handleAddItem} />}
            />

            <Route
              path="/login"
              element={<LoginPage defaultMode="signin" />}
            />

            <Route
              path="/signin"
              element={<Navigate to="/login" replace />}
            />

            <Route
              path="/signup"
              element={<LoginPage defaultMode="signup" />}
            />

            <Route
              path="/verify-otp"
              element={<VerificationPage />}
            />

            <Route
              path="/verify"
              element={<Navigate to="/verify-otp" replace />}
            />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>

        <Footer />
      </div>
    </AuthProvider>
  );
}

export default App;
