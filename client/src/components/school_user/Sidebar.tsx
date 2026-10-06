import React, { useEffect, useRef, useState } from "react";
import {
  Home,
  PlusCircle,
  MessageSquare,
  Bell,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useNavigate } from "react-router-dom";

interface SidebarProps {
  activeTab?: string;
  expanded?: boolean;
  onTabChange?: (tab: string) => void;
  onOpenCreateModal?: () => void;
  onExpandedChange?: (expanded: boolean) => void;
  onNotificationsOpenChange?: (open: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab = "home",
  expanded = false,
  onTabChange,
  onOpenCreateModal,
  onExpandedChange,
  onNotificationsOpenChange,
}) => {
  const navigate = useNavigate();
  const asideRef = useRef<HTMLElement>(null);
  const notificationsPanelRef = useRef<HTMLElement>(null);
  const notificationsButtonRef = useRef<HTMLButtonElement>(null);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [collapsedWidth, setCollapsedWidth] = useState(() =>
    window.matchMedia("(min-width: 768px)").matches ? 80 : 64,
  );

  const notifications = [
    {
      id: 1,
      title: "New match found!",
      desc: "Someone reported finding keys near the Parking Lot.",
      time: "10m ago",
    },
    {
      id: 2,
      title: "Item claimed",
      desc: "Black Herschel backpack inquiry was answered.",
      time: "1h ago",
    },
    {
      id: 3,
      title: "Community update",
      desc: "WMSU Student Affairs posted campus verification guidelines.",
      time: "2h ago",
    },
  ];

  useEffect(() => {
    if (!notificationsOpen) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (
        notificationsPanelRef.current?.contains(event.target as Node) ||
        notificationsButtonRef.current?.contains(event.target as Node)
      ) {
        return;
      }
      setNotificationsOpen(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setNotificationsOpen(false);
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [notificationsOpen]);

  useEffect(() => {
    onNotificationsOpenChange?.(notificationsOpen);
  }, [notificationsOpen, onNotificationsOpenChange]);

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
      label: "Post Item",
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
    {
      id: "notifications",
      label: "Notifications",
      icon: Bell,
      onClick: () => {
        onExpandedChange?.(false);
        setNotificationsOpen((open) => !open);
      },
    },
  ];

  const labelsVisible = expanded && !notificationsOpen;

  return (
    <>
    <motion.aside
      ref={asideRef}
      onMouseEnter={() => {
        if (!notificationsOpen) onExpandedChange?.(true);
      }}
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
      onFocus={() => {
        if (!notificationsOpen) onExpandedChange?.(true);
      }}
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
      animate={{ width: expanded && !notificationsOpen ? 240 : collapsedWidth }}
      transition={{ type: "spring", stiffness: 360, damping: 34, mass: 0.8 }}
      className={`shrink-0 bg-white border-r border-neutral-100 flex flex-col items-center py-5 fixed inset-y-0 left-0 z-50 selection:bg-[#E5192D] selection:text-white`}
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
        <span className={`absolute left-full ml-3 top-1/2 -translate-y-1/2 whitespace-nowrap text-2xl font-extrabold tracking-tight text-neutral-900 transition-opacity duration-200 pointer-events-none ${labelsVisible ? "opacity-100" : "opacity-0"}`}>
          Found<span className="text-[#E5192D]">It</span>
        </span>
      </button>

      {/* Nav Items Stack */}
      <nav className="absolute left-2.5 md:left-4.5 top-[5.5rem] flex flex-col items-center space-y-3">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <div
              key={item.id}
              className="relative"
            >
              <button
                ref={
                  item.id === "notifications"
                    ? notificationsButtonRef
                    : undefined
                }
                onClick={item.onClick}
                title={item.label}
                aria-label={item.label}
                aria-expanded={
                  item.id === "notifications" ? notificationsOpen : undefined
                }
                className={`relative w-11 h-11 flex items-center justify-center rounded-xl cursor-pointer group ${
                  isActive || (item.id === "notifications" && notificationsOpen)
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

                {item.id === "notifications" && (
                  <span className="absolute top-1 right-1 w-3.5 h-3.5 bg-[#E5192D] text-white text-[9px] font-bold rounded-full flex items-center justify-center border-2 border-white">
                    3
                  </span>
                )}

                <span className={`absolute left-full ml-3 whitespace-nowrap text-left text-sm font-semibold transition-opacity duration-200 ${labelsVisible ? "opacity-100" : "opacity-0"}`}>
                  {item.label}
                </span>
              </button>

            </div>
          );
        })}
      </nav>
    </motion.aside>
    <AnimatePresence>
      {notificationsOpen && (
        <motion.aside
          ref={notificationsPanelRef}
          aria-label="Notifications"
          initial={{ opacity: 0, x: -16 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -16 }}
          transition={{ type: "spring", stiffness: 360, damping: 34 }}
          style={{ left: collapsedWidth }}
          className="fixed top-20 bottom-0 z-40 w-80 bg-white border-r border-neutral-100 shadow-xl"
        >
          <div className="flex items-center justify-between px-5 py-5 border-b border-neutral-100">
            <div>
              <h2 className="font-bold text-base text-neutral-900">
                Notifications
              </h2>
              <p className="mt-0.5 text-xs text-neutral-500">
                Updates about your items
              </p>
            </div>
            <button
              type="button"
              onClick={() => setNotificationsOpen(false)}
              aria-label="Close notifications"
              className="w-8 h-8 flex items-center justify-center rounded-lg text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="p-3 space-y-1">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                className="p-3 rounded-xl hover:bg-neutral-50 cursor-pointer transition-colors"
              >
                <p className="text-xs font-bold text-neutral-900">
                  {notification.title}
                </p>
                <p className="text-xs text-neutral-500 mt-1 line-clamp-2">
                  {notification.desc}
                </p>
                <span className="text-[10px] text-neutral-400 mt-1.5 block">
                  {notification.time}
                </span>
              </div>
            ))}
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
    </>
  );
};
