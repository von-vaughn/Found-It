import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { CommunityReunions } from "@/components/landing/CommunityReunions";
import { AuthProvider } from "@/context/AuthContext";
import { AppRoutes } from "@/routes";
import { initialItems, type Item } from "@/data/mockItems";
import type { ClaimRequest, NewClaimRequest } from "@/types/claim";

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
  }, [pathname]);
  return null;
}

export function App() {
  const [items, setItems] = useState<Item[]>(initialItems);
  const [submittedClaims, setSubmittedClaims] = useState<ClaimRequest[]>([]);
  const navigate = useNavigate();
  const location = useLocation();

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

  const handleSubmitClaim = (claim: NewClaimRequest) => {
    const submittedAt = new Date();
    setSubmittedClaims((current) => [
      {
        ...claim,
        id: `CL-${String(Date.now()).slice(-4)}`,
        status: "Pending",
        submitted: new Intl.DateTimeFormat("en", {
          dateStyle: "medium",
          timeStyle: "short",
        }).format(submittedAt),
      },
      ...current,
    ]);
  };

  const handleUpdateClaimStatus = (
    claimId: string,
    status: ClaimRequest["status"],
  ) => {
    setSubmittedClaims((current) =>
      current.map((claim) => (claim.id === claimId ? { ...claim, status } : claim)),
    );
  };

  const handleBrowseLost = () => {
    navigate("/browse?type=lost");
  };

  const handleBrowseFound = () => {
    navigate("/browse?type=found");
  };

  const isDashboard =
    location.pathname.startsWith("/dashboard") ||
    location.pathname.startsWith("/admin");

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
            submittedClaims={submittedClaims}
            onAddItem={handleAddItem}
            onUpdateItem={handleUpdateItem}
            onDeleteItem={handleDeleteItem}
            onSubmitClaim={handleSubmitClaim}
            onUpdateClaimStatus={handleUpdateClaimStatus}
            onBrowseLost={handleBrowseLost}
            onBrowseFound={handleBrowseFound}
          />
        </div>

        {location.pathname === "/" && <CommunityReunions />}
        {!isDashboard &&
          location.pathname !== "/login" &&
          location.pathname !== "/signup" &&
          location.pathname !== "/verify-otp" &&
          location.pathname !== "/lost-items" &&
          location.pathname !== "/found-items" &&
          location.pathname !== "/browse" && <Footer />}
      </div>
    </AuthProvider>
  );
}

export default App;
