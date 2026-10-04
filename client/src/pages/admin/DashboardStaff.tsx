import React, { useState, useRef } from "react";
import { Sidebar } from "@/components/admin/Sidebar";
import { Header } from "@/components/admin/Header";
import { useNavigate } from "react-router-dom";
import {
  ClipboardList,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  Package,
  Filter,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

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

  const recentClaims = [
    {
      id: "CLM-1042",
      itemTitle: "Apple AirPods Pro (2nd Gen)",
      claimant: "Alyssa Marie Cruz",
      studentId: "2022-10842",
      date: "10 mins ago",
      status: "pending",
      location: "Library 3F Reading Area",
    },
    {
      id: "CLM-1041",
      itemTitle: "Hydro Flask 32oz Cobalt Blue",
      claimant: "Joshua Tan",
      studentId: "2023-04912",
      date: "45 mins ago",
      status: "pending",
      location: "Gymnasium Bleachers",
    },
    {
      id: "CLM-1040",
      itemTitle: "Leather Wallet (Black, Secrid)",
      claimant: "Mark Vincent Rivera",
      studentId: "2021-00213",
      date: "2 hours ago",
      status: "approved",
      location: "OSA Front Desk",
    },
    {
      id: "CLM-1039",
      itemTitle: "Scientific Calculator Casio fx-991EX",
      claimant: "Bea Katherine Gomez",
      studentId: "2024-11002",
      date: "3 hours ago",
      status: "pending",
      location: "Engineering Bldg Rm 402",
    },
  ];

  return (
    <div className="min-h-screen bg-[#FBFBFC] flex selection:bg-[#E5192D] selection:text-white font-sans text-neutral-900">
      {/* Staff OSA Sidebar */}
      <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Main Content Area */}
      <div className="flex-1 min-w-0 ml-16 md:ml-20 flex flex-col min-h-screen">
        {/* Top Header */}
        <Header
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onOpenReportModal={() => navigate("/dashboard")}
          searchInputRef={searchInputRef}
        />

        {/* Dashboard Main View */}
        <main className="flex-1 min-w-0 w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
          {/* Welcome Banner */}
          <div className="bg-white border border-neutral-100 rounded-2xl p-5 sm:p-6 shadow-xs">
            <h1 className="text-xl sm:text-2xl font-bold text-neutral-900 tracking-tight">
              Welcome to FoundIt Staff Management
            </h1>
          </div>

          {/* Stats Cards Grid */}
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

          {/* Recent Claims Section */}
          <div className="bg-white border border-neutral-100 rounded-2xl p-5 shadow-xs">
            <div className="flex items-center justify-between pb-4 border-b border-neutral-100 mb-4">
              <div>
                <h2 className="text-sm font-bold text-neutral-900">
                  Recent Claim Requests
                </h2>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  className="text-xs font-semibold text-neutral-500 h-8 px-2.5 rounded-lg"
                >
                  <Filter className="w-3.5 h-3.5 mr-1" />
                  Filter
                </Button>
                <Button
                  variant="ghost"
                  className="text-xs font-bold text-[#E5192D] h-8 px-2.5 rounded-lg"
                  onClick={() => setActiveTab("claims")}
                >
                  View All
                </Button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="text-neutral-400 font-medium border-b border-neutral-100">
                    <th className="pb-3 font-medium">Claim ID</th>
                    <th className="pb-3 font-medium">Item Details</th>
                    <th className="pb-3 font-medium">Claimant</th>
                    <th className="pb-3 font-medium">Found Location</th>
                    <th className="pb-3 font-medium">Status</th>
                    <th className="pb-3 font-medium text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {recentClaims.map((claim) => (
                    <tr
                      key={claim.id}
                      className="hover:bg-neutral-50/70 transition-colors"
                    >
                      <td className="py-3 font-mono font-semibold text-neutral-700">
                        {claim.id}
                      </td>
                      <td className="py-3">
                        <div className="font-semibold text-neutral-900">
                          {claim.itemTitle}
                        </div>
                        <div className="text-[11px] text-neutral-400">
                          {claim.date}
                        </div>
                      </td>
                      <td className="py-3">
                        <div className="font-medium text-neutral-800">
                          {claim.claimant}
                        </div>
                        <div className="text-[11px] text-neutral-400">
                          ID: {claim.studentId}
                        </div>
                      </td>
                      <td className="py-3 text-neutral-600">
                        {claim.location}
                      </td>
                      <td className="py-3">
                        <Badge
                          variant={
                            claim.status === "pending"
                              ? "default"
                              : claim.status === "approved"
                              ? "secondary"
                              : "destructive"
                          }
                          className="capitalize text-[11px] font-semibold"
                        >
                          {claim.status === "pending" && (
                            <Clock className="w-3 h-3 mr-1" />
                          )}
                          {claim.status === "approved" && (
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                          )}
                          {claim.status === "rejected" && (
                            <XCircle className="w-3 h-3 mr-1" />
                          )}
                          {claim.status}
                        </Badge>
                      </td>
                      <td className="py-3 text-right">
                        <Button
                          variant="outline"
                          className="h-7 text-[11px] font-semibold px-2.5 rounded-lg border-neutral-200 hover:bg-neutral-100"
                        >
                          Review
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default DashboardStaff;
