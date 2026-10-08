import React, { useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { PlusCircle } from "lucide-react";
import { CreatePostModal } from "@/components/school_user/CreatePostModal";
import { Header } from "@/components/school_user/Header";
import { ItemCard } from "@/components/school_user/ItemCard";
import { Sidebar } from "@/components/school_user/Sidebar";
import { useAuth } from "@/context/useAuth";
import { initialItems, type Item } from "@/data/mockItems";

interface ProfilePageProps {
  items?: Item[];
  onAddItem?: (newItem: Item) => void;
}

const DEFAULT_PROFILE = {
  name: "Vaughn Evangelista",
  email: "vaughn@wmsu.edu.ph",
  avatar: "/images/avatars/vaughn_evangelista.svg",
};

export const ProfilePage: React.FC<ProfilePageProps> = ({
  items: propItems,
  onAddItem,
}) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const items = propItems ?? initialItems;
  const [searchQuery, setSearchQuery] = useState("");
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const name = user?.name || DEFAULT_PROFILE.name;
  const email = user?.email || DEFAULT_PROFILE.email;
  const avatar = user?.avatar || DEFAULT_PROFILE.avatar;
  const profileUsername = name.toLowerCase().replace(/\s+/g, "_");

  const userItems = useMemo(
    () =>
      items.filter(
        (item) =>
          item.username?.toLowerCase() === profileUsername ||
          item.contactName.trim().toLowerCase() === name.trim().toLowerCase(),
      ),
    [items, name, profileUsername],
  );
  const lostItems = userItems.filter((item) => item.type === "lost").length;
  const foundItems = userItems.length - lostItems;

  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
    navigate(
      query.trim()
        ? `/dashboard?q=${encodeURIComponent(query.trim())}`
        : "/dashboard",
      { replace: true },
    );
  };

  const handleAddItem = (newItem: Item) => {
    onAddItem?.(newItem);
    setCreateModalOpen(false);
    navigate("/dashboard");
  };

  return (
    <div className="flex min-h-screen bg-white font-open-sans text-neutral-900 selection:bg-[#E5192D] selection:text-white">
      <Sidebar
        activeTab="profile"
        expanded={sidebarExpanded}
        onExpandedChange={setSidebarExpanded}
        onNotificationsOpenChange={setNotificationsOpen}
        onTabChange={(tab) => {
          if (tab === "home") navigate("/dashboard");
        }}
        onOpenCreateModal={() => setCreateModalOpen(true)}
      />

      <div
        className={`ml-16 flex min-h-screen min-w-0 flex-1 flex-col transition-[margin] duration-300 ${
          sidebarExpanded ? "md:ml-60" : "md:ml-20"
        }`}
      >
        <Header
          searchQuery={searchQuery}
          onSearchChange={handleSearchChange}
          searchInputRef={searchInputRef}
          notificationsOpen={notificationsOpen}
        />

        <div
          className={`min-w-0 flex-1 transition-[margin,width] duration-300 ease-in-out ${
            notificationsOpen
              ? "md:ml-80 md:w-[calc(100%-20rem)]"
              : "w-full"
          }`}
        >
          <main className="mx-auto w-full max-w-[1100px] bg-white px-4 py-8 sm:px-6 lg:px-8">
            <header className="mb-8">
              <h1 className="text-2xl font-extrabold tracking-tight text-neutral-900">
                Your profile
              </h1>
              <p className="mt-2 text-sm text-neutral-600">
                View your campus account details and item reports.
              </p>
            </header>

            <section
              aria-labelledby="profile-identity-heading"
              className="flex flex-col gap-5 pb-7 sm:flex-row sm:items-center"
            >
              <div className="h-20 w-20 shrink-0 overflow-hidden rounded-full border border-neutral-200 bg-white">
                <img
                  src={avatar}
                  alt={`${name}'s profile`}
                  className="h-full w-full object-cover"
                  onError={(event) => {
                    event.currentTarget.src = DEFAULT_PROFILE.avatar;
                  }}
                />
              </div>
              <div className="min-w-0">
                <h2
                  id="profile-identity-heading"
                  className="break-words text-xl font-bold text-neutral-900"
                >
                  {name}
                </h2>
                <p className="mt-1 break-all text-sm text-neutral-600">
                  {email}
                </p>
              </div>
            </section>

            <section aria-labelledby="profile-reports-heading" className="pb-10">
              <div className="flex flex-wrap items-end justify-between gap-3 border-b border-neutral-200 pb-4">
                <div>
                  <h2
                    id="profile-reports-heading"
                    className="text-base font-bold text-neutral-900"
                  >
                    Your item reports
                  </h2>
                  <p className="mt-1 text-xs text-neutral-500">
                    {userItems.length} total · {lostItems} lost · {foundItems}{" "}
                    found
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(true)}
                  className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#E5192D] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#c81424] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5192D] focus-visible:ring-offset-2"
                >
                  <PlusCircle className="h-4 w-4" aria-hidden="true" />
                  Post an item
                </button>
              </div>

              {userItems.length > 0 ? (
                <div className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  {userItems.map((item) => (
                    <ItemCard
                      key={item.id}
                      item={item}
                      onItemClick={(selected) =>
                        navigate(`/dashboard/items/${selected.id}`)
                      }
                    />
                  ))}
                </div>
              ) : (
                <div className="py-10 text-center">
                  <h3 className="text-sm font-semibold text-neutral-800">
                    No item reports yet
                  </h3>
                  <p className="mx-auto mt-1 max-w-sm text-sm text-neutral-500">
                    Items you report will appear here so you can quickly find
                    them again.
                  </p>
                </div>
              )}
            </section>
          </main>
        </div>
      </div>

      <CreatePostModal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onAddItem={handleAddItem}
      />
    </div>
  );
};

export default ProfilePage;
