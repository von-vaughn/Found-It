import React, { useEffect, useRef, useState } from "react";
import {
  Home,
  PlusCircle,
  MessageSquare,
} from "lucide-react";
import { motion } from "motion/react";
import { useNavigate } from "react-router-dom";

interface SidebarProps {
  activeTab?: string;
  expanded?: boolean;
  onTabChange?: (tab: string) => void;
  onOpenCreateModal?: () => void;
  onExpandedChange?: (expanded: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab = "home",
  expanded = false,
  onTabChange,
  onOpenCreateModal,
  onExpandedChange,
}) => {
  const navigate = useNavigate();
  const asideRef = useRef<HTMLElement>(null);
  const [collapsedWidth, setCollapsedWidth] = useState(() =>
    window.matchMedia("(min-width: 768px)").matches ? 80 : 64,
  );

  useEffect(() => {
    const breakpoint = window.matchMedia("(min-width: 768px)");
    const updateCollapsedWidth = () =>
      setCollapsedWidth(breakpoint.matches ? 80 : 64);

    breakpoint.addEventListener("change", updateCollapsedWidth);
    return () => breakpoint.removeEventListener("change", updateCollapsedWidth);
  }, []);

  const navItems = [
    {
      id: "home",
      label: "Home",
      icon: Home,
      onClick: () => {
        if (onTabChange) onTabChange("home");
      },
    },
    {
      id: "create",
      label: "Report Item",
      icon: PlusCircle,
      onClick: () => {
        if (onOpenCreateModal) onOpenCreateModal();
      },
    },
    {
      id: "messages",
      label: "Messages",
      icon: MessageSquare,
      onClick: () => {
        if (onTabChange) onTabChange("messages");
      },
    },
  ];

  return (
    <motion.aside
      ref={asideRef}
      onMouseEnter={() => onExpandedChange?.(true)}
      onMouseLeave={() => {
        const activeElement = document.activeElement;
        if (
          activeElement instanceof HTMLElement &&
          asideRef.current?.contains(activeElement) &&
          activeElement.matches(":focus-visible")
        ) {
          return;
        }
        if (
          activeElement instanceof HTMLElement &&
          asideRef.current?.contains(activeElement)
        ) {
          activeElement.blur();
        }
        onExpandedChange?.(false);
      }}
      onFocus={() => onExpandedChange?.(true)}
      onBlur={(event) => {
        const nextTarget = event.relatedTarget;
        if (
          (!(nextTarget instanceof Node) ||
            !event.currentTarget.contains(nextTarget)) &&
          !event.currentTarget.matches(":hover")
        ) {
          onExpandedChange?.(false);
        }
      }}
      initial={false}
      animate={{ width: expanded ? 240 : collapsedWidth }}
      transition={{ type: "spring", stiffness: 360, damping: 34, mass: 0.8 }}
      className="group/sidebar shrink-0 bg-white border-r border-neutral-100 flex flex-col items-center py-5 fixed inset-y-0 left-0 z-40 selection:bg-[#E5192D] selection:text-white"
    >
      {/* Top Logo */}
      <button
        onClick={() => navigate("/")}
        title="FoundIt Home"
        className="group absolute left-2.5 md:left-4.5 top-5 w-11 h-11 shrink-0 flex items-center justify-center rounded-2xl hover:bg-neutral-50 cursor-pointer"
      >
        <img
          src="/logo.jpeg"
          alt="FoundIt Logo"
          className="w-10 h-10 object-contain rounded-xl group-hover:scale-105 transition-transform"
        />
        <span className="absolute left-full ml-3 top-1/2 -translate-y-1/2 whitespace-nowrap text-2xl font-extrabold tracking-tight text-neutral-900 opacity-0 transition-opacity duration-200 group-hover/sidebar:opacity-100 group-focus-within/sidebar:opacity-100 pointer-events-none">
          Found<span className="text-[#E5192D]">It</span>
        </span>
      </button>

      {/* Nav Items Stack */}
      <nav className="absolute left-2.5 md:left-4.5 top-[5.5rem] flex flex-col items-center space-y-3">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              onClick={item.onClick}
              title={item.label}
              className={`relative w-11 h-11 flex items-center justify-center rounded-xl cursor-pointer group ${
                isActive
                  ? "bg-rose-50 text-[#E5192D] shadow-xs"
                  : "text-neutral-700 hover:text-neutral-900 hover:bg-neutral-100/80"
              }`}
            >
              <span className="w-11 h-11 shrink-0 flex items-center justify-center">
                <Icon
                  className={`w-5 h-5 transition-transform duration-200 group-hover:scale-110 ${
                    isActive ? "stroke-[2.3]" : "stroke-[1.8]"
                  }`}
                />
              </span>

              <span className="absolute left-full ml-3 whitespace-nowrap text-left text-sm font-semibold opacity-0 transition-opacity duration-200 group-hover/sidebar:opacity-100 group-focus-within/sidebar:opacity-100">
                {item.label}
              </span>
            </button>
          );
        })}
      </nav>
    </motion.aside>
  );
};
