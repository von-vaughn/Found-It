import React, { useState, useRef } from "react";
import { Sidebar } from "@/components/admin/Sidebar";
import { Header } from "@/components/admin/Header";
import { useNavigate } from "react-router-dom";
import {
  ClipboardList,
  CheckCircle2,
  AlertCircle,
  Package,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface ActivityEntry {
  id: string;
  action: string;
  itemName: string;
  targetId: string;
  timestamp: string;
  staffName: string;
}

const activityFeed: ActivityEntry[] = [
  {
    id: "ACT-001",
    action: "Approved Claim",
    itemName: "Apple AirPods Pro (2nd Gen)",
    targetId: "CLM-1042",
    timestamp: "10 mins ago",
    staffName: "OSA Officer",
  },
  {
    id: "ACT-002",
    action: "Rejected Claim",
    itemName: "Ray-Ban Aviator Sunglasses",
    targetId: "CLM-1035",
    timestamp: "45 mins ago",
    staffName: "OSA Officer",
  },
  {
    id: "ACT-003",
    action: "Posted Item",
    itemName: "Black Leather Wallet near Cafeteria",
    targetId: "POST-0091",
    timestamp: "1 hour ago",
    staffName: "OSA Officer",
  },
  {
    id: "ACT-004",
    action: "Marked as Returned",
    itemName: "Herschel Little America Backpack",
    targetId: "CLM-1039",
    timestamp: "2 hours ago",
    staffName: "OSA Officer",
  },
  {
    id: "ACT-005",
    action: "Approved Claim",
    itemName: "Logitech MX Master 3S Mouse",
    targetId: "CLM-1036",
    timestamp: "3 hours ago",
    staffName: "OSA Officer",
  },
  {
    id: "ACT-006",
    action: "Deleted Post",
    itemName: "Expired umbrella lost post",
    targetId: "POST-0088",
    timestamp: "Yesterday",
    staffName: "OSA Officer",
  },
  {
    id: "ACT-007",
    action: "Marked as Claimed",
    itemName: "Secrid Leather Wallet (Black)",
    targetId: "CLM-1037",
    timestamp: "Yesterday",
    staffName: "OSA Officer",
  },
  {
    id: "ACT-008",
    action: "Posted Item",
    itemName: "Found Casio Calculator — Engineering Bldg",
    targetId: "POST-0087",
    timestamp: "Yesterday",
    staffName: "OSA Officer",
  },
  {
    id: "ACT-009",
    action: "Rejected Claim",
    itemName: "Apple Pencil (2nd Gen)",
    targetId: "CLM-1034",
    timestamp: "Oct 1",
    staffName: "OSA Officer",
  },
  {
    id: "ACT-010",
    action: "Approved Claim",
    itemName: "Sony WH-1000XM4 Headphones",
    targetId: "CLM-1038",
    timestamp: "Oct 1",
    staffName: "OSA Officer",
  },
  {
    id: "ACT-011",
    action: "Updated Status",
    itemName: "Hydro Flask 32oz Cobalt Blue",
    targetId: "CLM-1041",
    timestamp: "Sep 30",
    staffName: "OSA Officer",
  },
  {
    id: "ACT-012",
    action: "Posted Item",
    itemName: "Found Student ID near CCS Lobby",
    targetId: "POST-0086",
    timestamp: "Sep 30",
    staffName: "OSA Officer",
  },
];

export const DashboardStaff: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<string>("dashboard");
  const [searchQuery, setSearchQuery] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);

  const stats = [
    {
      title: "Pending Claim Requests",
      value: "14",
      change: "+3 today",
      icon: ClipboardList,
    },
    {
      title: "Active Listed Items",
      value: "128",
      change: "84 found / 44 lost",
      icon: Package,
    },
    {
      title: "Unresolved Reports",
      value: "5",
      change: "-2 from yesterday",
      icon: AlertCircle,
    },
    {
      title: "Items Reunited (OSA)",
      value: "342",
      change: "98.2% verified",
      icon: CheckCircle2,
    },
  ];

  const ITEMS_PER_PAGE = 10;
  const [currentPage, setCurrentPage] = useState(1);
  const totalPages = Math.ceil(activityFeed.length / ITEMS_PER_PAGE);
  const paginatedFeed = activityFeed.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const getActionColor = (action: string): string => {
    if (
      action.includes("Approved") ||
      action.includes("Marked as Returned") ||
      action.includes("Marked as Claimed")
    )
      return "text-emerald-700 bg-emerald-50";
    if (action.includes("Rejected") || action.includes("Deleted"))
      return "text-red-600 bg-rose-50";
    if (action.includes("Posted")) return "text-blue-700 bg-blue-50";
    return "text-neutral-600 bg-neutral-100";
  };

  const getViewRoute = (targetId: string): string => {
    if (targetId.startsWith("CLM-")) return "/admin/claims/review";
    if (targetId.startsWith("POST-")) return "/admin/posts/manage";
    return "/admin/dashboard";
  };

  return (
    <div className="min-h-screen bg-[#FBFBFC] flex selection:bg-[#E5192D] selection:text-white font-sans text-neutral-900">
      
      <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />

      
      <div className="flex-1 min-w-0 ml-16 md:ml-20 flex flex-col min-h-screen">
        
        <Header
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onOpenReportModal={() => navigate("/dashboard")}
          searchInputRef={searchInputRef}
        />

        
        <main className="flex-1 min-w-0 w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
          
          <h1 className="text-xl font-bold text-neutral-900 tracking-tight">
            Dashboard
          </h1>

          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {stats.map((stat) => {
              const Icon = stat.icon;
              const isPending = stat.title === "Pending Claim Requests";

              return (
                <div
                  key={stat.title}
                  className="bg-white border border-neutral-100 rounded-2xl p-4 sm:p-5 shadow-xs hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-neutral-500">
                      {stat.title}
                    </span>
                    <Icon
                      className={`w-5 h-5 stroke-[2] ${
                        isPending ? "text-[#E5192D]" : "text-neutral-900"
                      }`}
                    />
                  </div>
                  <div className="mt-3 flex items-baseline justify-between">
                    <span
                      className={`text-2xl font-bold tracking-tight ${
                        isPending ? "text-[#E5192D]" : "text-neutral-900"
                      }`}
                    >
                      {stat.value}
                    </span>
                    <span className="text-[11px] text-neutral-400 font-medium">
                      {stat.change}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          
          <div className="bg-white border border-neutral-100 rounded-2xl shadow-xs overflow-hidden">
            
            <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-100">
              <h2 className="text-sm font-bold text-neutral-900">
                Recent Activity
              </h2>
              <span className="text-[11px] text-neutral-400 font-medium">
                Page {currentPage} of {totalPages}
              </span>
            </div>

            
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="text-neutral-400 font-medium border-b border-neutral-100 bg-neutral-50/50">
                    <th className="py-3 px-5 font-medium">Time</th>
                    <th className="py-3 px-5 font-medium">Staff</th>
                    <th className="py-3 px-5 font-medium">Action</th>
                    <th className="py-3 px-5 font-medium">Item</th>
                    <th className="py-3 px-5 font-medium">Reference</th>
                    <th className="py-3 px-5 font-medium text-right">View</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {paginatedFeed.map((entry) => (
                    <tr
                      key={entry.id}
                      className="hover:bg-neutral-50/70 transition-colors"
                    >
                      <td className="py-3.5 px-5 text-neutral-400 font-medium whitespace-nowrap">
                        {entry.timestamp}
                      </td>
                      <td className="py-3.5 px-5 text-neutral-700 font-medium whitespace-nowrap">
                        {entry.staffName}
                      </td>
                      <td className="py-3.5 px-5">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold whitespace-nowrap ${getActionColor(
                            entry.action
                          )}`}
                        >
                          {entry.action}
                        </span>
                      </td>
                      <td className="py-3.5 px-5 text-neutral-700 font-medium max-w-[200px] truncate">
                        {entry.itemName}
                      </td>
                      <td className="py-3.5 px-5 font-mono text-[11px] text-neutral-500 font-semibold whitespace-nowrap">
                        {entry.targetId}
                      </td>
                      <td className="py-3.5 px-5 text-right">
                        <button
                          onClick={() =>
                            navigate(getViewRoute(entry.targetId))
                          }
                          className="text-xs font-semibold text-[#E5192D] hover:underline cursor-pointer"
                        >
                          View →
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            
            <div className="flex items-center justify-between px-5 py-3.5 border-t border-neutral-100 bg-neutral-50/50">
              <span className="text-[11px] text-neutral-400 font-medium">
                Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1}–
                {Math.min(
                  currentPage * ITEMS_PER_PAGE,
                  activityFeed.length
                )}{" "}
                of {activityFeed.length} entries
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => p - 1)}
                  disabled={currentPage === 1}
                  className={`h-8 px-3 text-xs font-semibold rounded-xl border-neutral-200 ${
                    currentPage === 1
                      ? "opacity-40 cursor-not-allowed"
                      : "hover:bg-neutral-100 cursor-pointer"
                  }`}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => p + 1)}
                  disabled={currentPage === totalPages}
                  className={`h-8 px-3 text-xs font-semibold rounded-xl border-neutral-200 ${
                    currentPage === totalPages
                      ? "opacity-40 cursor-not-allowed"
                      : "hover:bg-neutral-100 cursor-pointer"
                  }`}
                >
                  Next
                </Button>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default DashboardStaff;
