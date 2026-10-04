import React from "react";
import {
  LayoutDashboard,
  ClipboardList,
  FolderOpen,
  BarChart2,
  Bell,
  Settings,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

export interface SidebarProps {
  activeTab?: string;
  onTabChange?: (tab: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab = "dashboard",
  onTabChange,
}) => {
  const navigate = useNavigate();

  const navItems = [
    {
      id: "dashboard",
      label: "Dashboard",
      icon: LayoutDashboard,
      onClick: () => {
        if (onTabChange) onTabChange("dashboard");
        navigate("/admin/dashboard");
      },
    },
    {
      id: "claims",
      label: "Claim Requests",
      icon: ClipboardList,
      onClick: () => {
        if (onTabChange) onTabChange("claims");
        navigate("/admin/claims");
      },
    },
    {
      id: "posts",
      label: "Manage Posts",
      icon: FolderOpen,
      onClick: () => {
        if (onTabChange) onTabChange("posts");
        navigate("/admin/posts");
      },
    },
    {
      id: "reports",
      label: "Reports",
      icon: BarChart2,
      onClick: () => {
        if (onTabChange) onTabChange("reports");
        navigate("/admin/reports");
      },
    },
    {
      id: "notifications",
      label: "Notifications",
      icon: Bell,
      onClick: () => {
        if (onTabChange) onTabChange("notifications");
      },
    },
    {
      id: "settings",
      label: "Settings",
      icon: Settings,
      onClick: () => {
        if (onTabChange) onTabChange("settings");
        navigate("/admin/settings");
      },
    },
  ];

  return (
    <aside className="w-16 md:w-20 shrink-0 bg-white border-r border-neutral-100 flex flex-col items-center py-5 fixed inset-y-0 left-0 z-40 selection:bg-[#E5192D] selection:text-white">
      {/* Top Logo */}
      <button
        onClick={() => navigate("/")}
        title="FoundIt Home"
        className="w-11 h-11 flex items-center justify-center rounded-2xl hover:bg-neutral-50 transition-colors mb-6 cursor-pointer group overflow-hidden"
      >
        <img
          src="/logo.jpeg"
          alt="FoundIt Logo"
          className="w-10 h-10 object-contain rounded-xl group-hover:scale-105 transition-transform"
        />
      </button>

      {/* Nav Items Stack */}
      <nav className="flex-1 flex flex-col items-center space-y-3 w-full px-2.5">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              onClick={item.onClick}
              title={item.label}
              className={`w-11 h-11 flex items-center justify-center rounded-xl transition-all cursor-pointer relative group ${
                isActive
                  ? "bg-rose-50 text-[#E5192D] shadow-xs"
                  : "text-neutral-700 hover:text-neutral-900 hover:bg-neutral-100/80"
              }`}
            >
              <Icon
                className={`w-5 h-5 transition-transform duration-200 group-hover:scale-110 ${
                  isActive ? "stroke-[2.3]" : "stroke-[1.8]"
                }`}
              />

              {/* Tooltip on hover */}
              <span className="hidden group-hover:block absolute left-full ml-3 px-2.5 py-1 bg-neutral-900 text-white text-xs font-semibold rounded-lg whitespace-nowrap z-50 pointer-events-none shadow-md">
                {item.label}
              </span>
            </button>
          );
        })}
      </nav>
    </aside>
  );
};

export default Sidebar;
