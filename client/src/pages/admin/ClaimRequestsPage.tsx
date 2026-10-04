import React, { useState, useRef, useMemo, useEffect } from "react";
import { Sidebar } from "@/components/admin/Sidebar";
import { Header } from "@/components/admin/Header";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  ClipboardList,
  CheckCircle2,
  XCircle,
  Clock,
  X,
  FileText,
  MapPin,
  Calendar,
  Search,
  ChevronDown,
} from "lucide-react";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";

export interface ClaimRequest {
  id: string;
  itemTitle: string;
  category: string;
  foundLocation: string;
  claimant: {
    name: string;
    studentId: string;
    email: string;
    avatarUrl?: string;
  };
  dateSubmitted: string;
  status: "pending" | "approved" | "rejected";
  proofDescription: string;
  securityQuestionsAnswer?: string;
}

const initialClaims: ClaimRequest[] = [
  {
    id: "CLM-1042",
    itemTitle: "Apple AirPods Pro (2nd Gen)",
    category: "Electronics",
    foundLocation: "Library 3F Reading Area",
    claimant: {
      name: "Alyssa Marie Cruz",
      studentId: "2022-10842",
      email: "alyssa.cruz@wmsu.edu.ph",
      avatarUrl: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80",
    },
    dateSubmitted: "Oct 4, 2026 • 10:15 AM",
    status: "pending",
    proofDescription: "Engraving on back reads 'AMC 2024'. Has a small scratch near the right hinge.",
    securityQuestionsAnswer: "Left earbud has medium silicone tip, right has small tip.",
  },
  {
    id: "CLM-1041",
    itemTitle: "Hydro Flask 32oz Cobalt Blue",
    category: "Tumblers & Bottles",
    foundLocation: "Gymnasium Bleachers",
    claimant: {
      name: "Joshua Tan",
      studentId: "2023-04912",
      email: "joshua.tan@wmsu.edu.ph",
      avatarUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80",
    },
    dateSubmitted: "Oct 4, 2026 • 09:30 AM",
    status: "pending",
    proofDescription: "Has sticker of Philippine Eagle on front and dent on bottom rim.",
    securityQuestionsAnswer: "Straw lid with black rubber boot.",
  },
  {
    id: "CLM-1040",
    itemTitle: "Scientific Calculator Casio fx-991EX",
    category: "School Supplies",
    foundLocation: "Engineering Bldg Rm 402",
    claimant: {
      name: "Bea Katherine Gomez",
      studentId: "2024-11002",
      email: "bea.gomez@wmsu.edu.ph",
    },
    dateSubmitted: "Oct 4, 2026 • 08:45 AM",
    status: "pending",
    proofDescription: "Name 'BEA G.' written on inside sliding cover in silver marker.",
    securityQuestionsAnswer: "Contrast setting set to maximum; custom matrix in memory slot A.",
  },
  {
    id: "CLM-1039",
    itemTitle: "Herschel Little America Backpack (Black)",
    category: "Bags & Wallets",
    foundLocation: "Student Center Atrium",
    claimant: {
      name: "Rafael Santos",
      studentId: "2021-08734",
      email: "rafael.santos@wmsu.edu.ph",
      avatarUrl: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80",
    },
    dateSubmitted: "Oct 3, 2026 • 04:20 PM",
    status: "pending",
    proofDescription: "Inside laptop sleeve contains a blue notebook and mechanical pencil case.",
    securityQuestionsAnswer: "Keychain with anime character attached to top handle.",
  },
  {
    id: "CLM-1038",
    itemTitle: "Sony WH-1000XM4 Wireless Headphones",
    category: "Electronics",
    foundLocation: "CS Computer Lab 2",
    claimant: {
      name: "Camille Reyes",
      studentId: "2022-03145",
      email: "camille.reyes@wmsu.edu.ph",
    },
    dateSubmitted: "Oct 3, 2026 • 02:10 PM",
    status: "approved",
    proofDescription: "Serial number matches registered warranty receipt with WMSU email.",
    securityQuestionsAnswer: "Bluetooth name configured as 'Camille's XM4'.",
  },
  {
    id: "CLM-1037",
    itemTitle: "Leather Wallet (Black, Secrid)",
    category: "Bags & Wallets",
    foundLocation: "OSA Front Desk",
    claimant: {
      name: "Mark Vincent Rivera",
      studentId: "2021-00213",
      email: "mark.rivera@wmsu.edu.ph",
      avatarUrl: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80",
    },
    dateSubmitted: "Oct 3, 2026 • 11:00 AM",
    status: "approved",
    proofDescription: "WMSU ID and driver's license inside match claimant name.",
    securityQuestionsAnswer: "Cardholder contains 4 bank cards and emergency folded note.",
  },
  {
    id: "CLM-1036",
    itemTitle: "Logitech MX Master 3S Mouse",
    category: "Electronics",
    foundLocation: "Library 2F Computer Nook",
    claimant: {
      name: "Gabriel Diaz",
      studentId: "2023-01994",
      email: "gabriel.diaz@wmsu.edu.ph",
    },
    dateSubmitted: "Oct 2, 2026 • 03:40 PM",
    status: "approved",
    proofDescription: "Pale grey colorway, USB Bolt receiver tucked inside battery compartment.",
    securityQuestionsAnswer: "Thumb scroll wheel calibrated to high sensitivity.",
  },
  {
    id: "CLM-1035",
    itemTitle: "Ray-Ban Aviator Sunglasses (Gold)",
    category: "Accessories",
    foundLocation: "University Cafeteria",
    claimant: {
      name: "Ethan Miguel Ramos",
      studentId: "2020-04311",
      email: "ethan.ramos@wmsu.edu.ph",
    },
    dateSubmitted: "Oct 2, 2026 • 01:15 PM",
    status: "rejected",
    proofDescription: "Claims it has polarized green lenses with brown leather case.",
    securityQuestionsAnswer: "Failed verification — item found is silver frame with black pouch.",
  },
  {
    id: "CLM-1034",
    itemTitle: "Apple Pencil (2nd Gen)",
    category: "Electronics",
    foundLocation: "Architecture Drafting Hall",
    claimant: {
      name: "Hannah Patricia Lee",
      studentId: "2024-09881",
      email: "hannah.lee@wmsu.edu.ph",
    },
    dateSubmitted: "Oct 1, 2026 • 05:00 PM",
    status: "rejected",
    proofDescription: "Believes it was left during afternoon studio session.",
    securityQuestionsAnswer: "Serial number did not match claimant's iPad pairing logs.",
  },
];

export const ClaimRequestsPage: React.FC = () => {
  const navigate = useNavigate();
  const [claims, setClaims] = useState<ClaimRequest[]>(initialClaims);
  const [activeTab, setActiveTab] = useState<string>("pending");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedClaim, setSelectedClaim] = useState<ClaimRequest | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<string>("all");
  const [categoryDropdownOpen, setCategoryDropdownOpen] = useState(false);
  const [dateDropdownOpen, setDateDropdownOpen] = useState(false);
  const categoryDropdownRef = useRef<HTMLDivElement>(null);
  const dateDropdownRef = useRef<HTMLDivElement>(null);

  const CATEGORIES = [
    "All Categories",
    "Identification & Cards",
    "Electronics",
    "Valuables & Keys",
    "Bags & Containers",
    "Stationery & School Supplies",
    "Clothing & Accessories",
    "Others",
  ];

  const DATE_FILTERS = [
    { label: "All Time", value: "all" },
    { label: "Today", value: "today" },
    { label: "Yesterday", value: "yesterday" },
    { label: "Last 7 days", value: "7days" },
    { label: "Last 30 days", value: "30days" },
  ];

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const handleUpdateStatus = (
    claimId: string,
    newStatus: "approved" | "rejected"
  ) => {
    setClaims((prev) =>
      prev.map((c) => (c.id === claimId ? { ...c, status: newStatus } : c))
    );
    if (newStatus === "approved") {
      toast.success(`Claim ${claimId} approved successfully`);
    } else {
      toast.error(`Claim ${claimId} marked as rejected`);
    }
    setSelectedClaim(null);
  };

  const isWithinDateFilter = (dateStr: string, filter: string): boolean => {
    if (filter === "all") return true;
    const now = new Date();
    const claimDate = new Date(dateStr);
    const diffMs = now.getTime() - claimDate.getTime();
    const diffDays = diffMs / (1000 * 60 * 60 * 24);
    if (filter === "today") return claimDate.toDateString() === now.toDateString();
    if (filter === "yesterday") {
      const yesterday = new Date(now);
      yesterday.setDate(now.getDate() - 1);
      return claimDate.toDateString() === yesterday.toDateString();
    }
    if (filter === "7days") return diffDays <= 7;
    if (filter === "30days") return diffDays <= 30;
    return true;
  };

  const filteredClaims = useMemo(() => {
    return claims.filter((claim) => {
      const matchesTab = claim.status === activeTab;
      if (!matchesTab) return false;

      if (categoryFilter !== "all") {
        const matchesCategory =
          claim.category.toLowerCase() === categoryFilter.toLowerCase();
        if (!matchesCategory) return false;
      }

      if (!isWithinDateFilter(claim.dateSubmitted, dateFilter)) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        return (
          claim.itemTitle.toLowerCase().includes(q) ||
          claim.claimant.name.toLowerCase().includes(q) ||
          claim.claimant.studentId.toLowerCase().includes(q) ||
          claim.id.toLowerCase().includes(q) ||
          claim.foundLocation.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [claims, activeTab, searchQuery, categoryFilter, dateFilter]);

  const pendingCount = claims.filter((c) => c.status === "pending").length;
  const approvedCount = claims.filter((c) => c.status === "approved").length;
  const rejectedCount = claims.filter((c) => c.status === "rejected").length;

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        categoryDropdownRef.current &&
        !categoryDropdownRef.current.contains(e.target as Node)
      ) {
        setCategoryDropdownOpen(false);
      }
      if (
        dateDropdownRef.current &&
        !dateDropdownRef.current.contains(e.target as Node)
      ) {
        setDateDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const renderTable = (items: ClaimRequest[]) => {
    if (items.length === 0) {
      return (
        <div className="py-16 text-center">
          <div className="w-12 h-12 rounded-2xl bg-neutral-100 text-neutral-400 flex items-center justify-center mx-auto mb-3">
            <ClipboardList className="w-6 h-6 stroke-[1.5]" />
          </div>
          <h3 className="text-sm font-semibold text-neutral-800">
            No {activeTab} claim requests found
          </h3>
          <p className="text-xs text-neutral-400 mt-1 max-w-sm mx-auto">
            {searchQuery
              ? "Try adjusting your search query or clear the filter."
              : `There are currently no claim requests in the ${activeTab} queue.`}
          </p>
        </div>
      );
    }

    return (
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="text-xs font-bold text-neutral-500 uppercase tracking-wide border-b border-neutral-100 bg-neutral-50/50">
              <th className="py-3.5 px-4 sm:px-6">Item</th>
              <th className="py-3.5 px-4 sm:px-6">Claimant</th>
              <th className="py-3.5 px-4 sm:px-6">Date Submitted</th>
              <th className="py-3.5 px-4 sm:px-6">Status</th>
              <th className="py-3.5 px-4 sm:px-6 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="text-xs">
            {items.map((claim) => (
              <tr
                key={claim.id}
                className="border-b border-neutral-100 hover:bg-neutral-50/70 transition-colors"
              >
                {/* Item Column */}
                <td className="py-4 px-4 sm:px-6 align-middle">
                  <div className="font-semibold text-neutral-900 text-sm">
                    {claim.itemTitle}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5 text-[11px] text-neutral-400 font-medium">
                    <span className="font-mono text-neutral-500 font-semibold">
                      {claim.id}
                    </span>
                    <span>•</span>
                    <span>{claim.category}</span>
                    <span>•</span>
                    <span className="truncate max-w-[160px] sm:max-w-xs">
                      {claim.foundLocation}
                    </span>
                  </div>
                </td>

                {/* Claimant Column: Avatar + name inline */}
                <td className="py-4 px-4 sm:px-6 align-middle">
                  <div className="flex items-center gap-2.5">
                    <Avatar size="sm" className="w-8 h-8 rounded-full border border-neutral-200">
                      {claim.claimant.avatarUrl && (
                        <AvatarImage
                          src={claim.claimant.avatarUrl}
                          alt={claim.claimant.name}
                        />
                      )}
                      <AvatarFallback className="bg-neutral-100 text-neutral-700 text-[10px] font-bold">
                        {getInitials(claim.claimant.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <div className="font-semibold text-neutral-900 truncate">
                        {claim.claimant.name}
                      </div>
                      <div className="text-[11px] text-neutral-400 font-medium">
                        ID: {claim.claimant.studentId}
                      </div>
                    </div>
                  </div>
                </td>

                {/* Date Submitted Column */}
                <td className="py-4 px-4 sm:px-6 align-middle text-neutral-600 font-medium">
                  {claim.dateSubmitted}
                </td>

                {/* Status Column (Badge: default=pending, destructive=rejected, secondary=approved) */}
                <td className="py-4 px-4 sm:px-6 align-middle">
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

                {/* Action Column: Button size="sm" variant="outline" label="Review" */}
                <td className="py-4 px-4 sm:px-6 align-middle text-right">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setSelectedClaim(claim)}
                    className="text-xs font-semibold h-8 px-3 rounded-lg border-neutral-200 hover:bg-neutral-100 hover:text-neutral-900"
                  >
                    Review
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#FBFBFC] flex selection:bg-[#E5192D] selection:text-white font-sans text-neutral-900">
      {/* Staff OSA Sidebar */}
      <Sidebar activeTab="claims" />

      {/* Main Content Area */}
      <div className="flex-1 min-w-0 ml-16 md:ml-20 flex flex-col min-h-screen">
        {/* Top Header */}
        <Header
          searchQuery=""
          onSearchChange={() => {}}
          onOpenReportModal={() => navigate("/dashboard")}
          searchInputRef={undefined}
        />

        {/* Claim Requests Main Content */}
        <main className="flex-1 min-w-0 w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
          {/* Page Title & Context Header */}
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-neutral-900">
              Claim Requests
            </h1>
            <p className="text-xs sm:text-sm text-neutral-500 mt-1">
              Review incoming claim requests
            </p>
          </div>

          {/* Line Variant Tabs Component */}
          <Tabs
            defaultValue="pending"
            value={activeTab}
            onValueChange={(val) => setActiveTab(val)}
            className="w-full space-y-4"
          >
            <div className="border-b border-neutral-200">
              <TabsList variant="line" className="h-10 p-0 gap-6">
                <TabsTrigger
                  value="pending"
                  className={`text-xs pb-3.5 pt-1 px-1 rounded-none border-b-2 transition-all cursor-pointer ${
                    activeTab === "pending"
                      ? "text-[#E5192D] font-bold border-[#E5192D]"
                      : "text-neutral-500 font-medium border-transparent hover:text-neutral-700"
                  }`}
                >
                  Pending
                  <span
                    className={`ml-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold transition-colors ${
                      activeTab === "pending"
                        ? "bg-rose-50 text-[#E5192D]"
                        : "bg-neutral-100 text-neutral-600"
                    }`}
                  >
                    {pendingCount}
                  </span>
                </TabsTrigger>

                <TabsTrigger
                  value="approved"
                  className={`text-xs pb-3.5 pt-1 px-1 rounded-none border-b-2 transition-all cursor-pointer ${
                    activeTab === "approved"
                      ? "text-[#E5192D] font-bold border-[#E5192D]"
                      : "text-neutral-500 font-medium border-transparent hover:text-neutral-700"
                  }`}
                >
                  Approved
                  <span
                    className={`ml-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold transition-colors ${
                      activeTab === "approved"
                        ? "bg-rose-50 text-[#E5192D]"
                        : "bg-neutral-100 text-neutral-600"
                    }`}
                  >
                    {approvedCount}
                  </span>
                </TabsTrigger>

                <TabsTrigger
                  value="rejected"
                  className={`text-xs pb-3.5 pt-1 px-1 rounded-none border-b-2 transition-all cursor-pointer ${
                    activeTab === "rejected"
                      ? "text-[#E5192D] font-bold border-[#E5192D]"
                      : "text-neutral-500 font-medium border-transparent hover:text-neutral-700"
                  }`}
                >
                  Rejected
                  <span
                    className={`ml-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold transition-colors ${
                      activeTab === "rejected"
                        ? "bg-rose-50 text-[#E5192D]"
                        : "bg-neutral-100 text-neutral-600"
                    }`}
                  >
                    {rejectedCount}
                  </span>
                </TabsTrigger>
              </TabsList>
            </div>

            {/* Pending Tab Content */}
            <TabsContent value="pending" className="mt-0 outline-none">
              <Card className="rounded-2xl border border-neutral-100 bg-white shadow-xs overflow-hidden p-0">
                {/* Search and Filter Controls */}
                <div className="px-4 sm:px-6 pt-4 pb-3 space-y-2.5">
                  {/* Search Bar */}
                  <div className="relative flex items-center">
                    <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 pointer-events-none stroke-[2]" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search Claim ID, item, or student..."
                      className="w-full h-9 pl-10 pr-4 bg-[#F8F9FA] hover:bg-[#F3F4F6] focus:bg-white rounded-xl border border-neutral-200/80 focus:border-neutral-300 focus:outline-none focus:ring-2 focus:ring-neutral-200/50 text-xs text-neutral-800 placeholder:text-neutral-400 font-normal transition-all"
                    />
                  </div>
                  {/* Filter Row */}
                  <div className="flex items-center gap-3">
                    {/* Category Filter */}
                    <div className="relative" ref={categoryDropdownRef}>
                      <button
                        onClick={() => {
                          setCategoryDropdownOpen(!categoryDropdownOpen);
                          setDateDropdownOpen(false);
                        }}
                        className="flex items-center gap-1.5 h-8 px-3 rounded-xl border border-neutral-200 bg-white hover:bg-neutral-50 text-xs font-medium text-neutral-700 transition-colors cursor-pointer"
                      >
                        <span className="text-neutral-400">Item Category:</span>
                        <span className="font-semibold text-neutral-900">
                          {categoryFilter === "all" ? "All" : categoryFilter}
                        </span>
                        <ChevronDown className="w-3.5 h-3.5 text-neutral-400 ml-0.5" />
                      </button>
                      {categoryDropdownOpen && (
                        <div className="absolute left-0 top-full mt-1.5 w-52 bg-white rounded-2xl shadow-xl border border-neutral-100 p-1.5 z-50 animate-in fade-in zoom-in-95 duration-150">
                          {CATEGORIES.map((cat) => (
                            <button
                              key={cat}
                              onClick={() => {
                                setCategoryFilter(cat === "All Categories" ? "all" : cat);
                                setCategoryDropdownOpen(false);
                              }}
                              className={`w-full text-left px-3 py-2 rounded-xl text-xs transition-colors cursor-pointer ${
                                (cat === "All Categories" ? categoryFilter === "all" : categoryFilter === cat)
                                  ? "bg-rose-50 text-[#E5192D] font-semibold"
                                  : "text-neutral-700 hover:bg-neutral-50 font-medium"
                              }`}
                            >
                              {cat}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    {/* Date Filter */}
                    <div className="relative" ref={dateDropdownRef}>
                      <button
                        onClick={() => {
                          setDateDropdownOpen(!dateDropdownOpen);
                          setCategoryDropdownOpen(false);
                        }}
                        className="flex items-center gap-1.5 h-8 px-3 rounded-xl border border-neutral-200 bg-white hover:bg-neutral-50 text-xs font-medium text-neutral-700 transition-colors cursor-pointer"
                      >
                        <span className="text-neutral-400">Date:</span>
                        <span className="font-semibold text-neutral-900">
                          {DATE_FILTERS.find((d) => d.value === dateFilter)?.label || "All Time"}
                        </span>
                        <ChevronDown className="w-3.5 h-3.5 text-neutral-400 ml-0.5" />
                      </button>
                      {dateDropdownOpen && (
                        <div className="absolute left-0 top-full mt-1.5 w-40 bg-white rounded-2xl shadow-xl border border-neutral-100 p-1.5 z-50 animate-in fade-in zoom-in-95 duration-150">
                          {DATE_FILTERS.map((d) => (
                            <button
                              key={d.value}
                              onClick={() => {
                                setDateFilter(d.value);
                                setDateDropdownOpen(false);
                              }}
                              className={`w-full text-left px-3 py-2 rounded-xl text-xs transition-colors cursor-pointer ${
                                dateFilter === d.value
                                  ? "bg-rose-50 text-[#E5192D] font-semibold"
                                  : "text-neutral-700 hover:bg-neutral-50 font-medium"
                              }`}
                            >
                              {d.label}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <div className="border-b border-neutral-100" />
                {renderTable(filteredClaims)}
              </Card>
            </TabsContent>

            {/* Approved Tab Content */}
            <TabsContent value="approved" className="mt-0 outline-none">
              <Card className="rounded-2xl border border-neutral-100 bg-white shadow-xs overflow-hidden p-0">
                {/* Search and Filter Controls */}
                <div className="px-4 sm:px-6 pt-4 pb-3 space-y-2.5">
                  <div className="relative flex items-center">
                    <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 pointer-events-none stroke-[2]" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search Claim ID, item, or student..."
                      className="w-full h-9 pl-10 pr-4 bg-[#F8F9FA] hover:bg-[#F3F4F6] focus:bg-white rounded-xl border border-neutral-200/80 focus:border-neutral-300 focus:outline-none focus:ring-2 focus:ring-neutral-200/50 text-xs text-neutral-800 placeholder:text-neutral-400 font-normal transition-all"
                    />
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="relative" ref={categoryDropdownRef}>
                      <button
                        onClick={() => {
                          setCategoryDropdownOpen(!categoryDropdownOpen);
                          setDateDropdownOpen(false);
                        }}
                        className="flex items-center gap-1.5 h-8 px-3 rounded-xl border border-neutral-200 bg-white hover:bg-neutral-50 text-xs font-medium text-neutral-700 transition-colors cursor-pointer"
                      >
                        <span className="text-neutral-400">Item Category:</span>
                        <span className="font-semibold text-neutral-900">
                          {categoryFilter === "all" ? "All" : categoryFilter}
                        </span>
                        <ChevronDown className="w-3.5 h-3.5 text-neutral-400 ml-0.5" />
                      </button>
                      {categoryDropdownOpen && (
                        <div className="absolute left-0 top-full mt-1.5 w-52 bg-white rounded-2xl shadow-xl border border-neutral-100 p-1.5 z-50 animate-in fade-in zoom-in-95 duration-150">
                          {CATEGORIES.map((cat) => (
                            <button
                              key={cat}
                              onClick={() => {
                                setCategoryFilter(cat === "All Categories" ? "all" : cat);
                                setCategoryDropdownOpen(false);
                              }}
                              className={`w-full text-left px-3 py-2 rounded-xl text-xs transition-colors cursor-pointer ${
                                (cat === "All Categories" ? categoryFilter === "all" : categoryFilter === cat)
                                  ? "bg-rose-50 text-[#E5192D] font-semibold"
                                  : "text-neutral-700 hover:bg-neutral-50 font-medium"
                              }`}
                            >
                              {cat}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="relative" ref={dateDropdownRef}>
                      <button
                        onClick={() => {
                          setDateDropdownOpen(!dateDropdownOpen);
                          setCategoryDropdownOpen(false);
                        }}
                        className="flex items-center gap-1.5 h-8 px-3 rounded-xl border border-neutral-200 bg-white hover:bg-neutral-50 text-xs font-medium text-neutral-700 transition-colors cursor-pointer"
                      >
                        <span className="text-neutral-400">Date:</span>
                        <span className="font-semibold text-neutral-900">
                          {DATE_FILTERS.find((d) => d.value === dateFilter)?.label || "All Time"}
                        </span>
                        <ChevronDown className="w-3.5 h-3.5 text-neutral-400 ml-0.5" />
                      </button>
                      {dateDropdownOpen && (
                        <div className="absolute left-0 top-full mt-1.5 w-40 bg-white rounded-2xl shadow-xl border border-neutral-100 p-1.5 z-50 animate-in fade-in zoom-in-95 duration-150">
                          {DATE_FILTERS.map((d) => (
                            <button
                              key={d.value}
                              onClick={() => {
                                setDateFilter(d.value);
                                setDateDropdownOpen(false);
                              }}
                              className={`w-full text-left px-3 py-2 rounded-xl text-xs transition-colors cursor-pointer ${
                                dateFilter === d.value
                                  ? "bg-rose-50 text-[#E5192D] font-semibold"
                                  : "text-neutral-700 hover:bg-neutral-50 font-medium"
                              }`}
                            >
                              {d.label}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <div className="border-b border-neutral-100" />
                {renderTable(filteredClaims)}
              </Card>
            </TabsContent>

            {/* Rejected Tab Content */}
            <TabsContent value="rejected" className="mt-0 outline-none">
              <Card className="rounded-2xl border border-neutral-100 bg-white shadow-xs overflow-hidden p-0">
                {/* Search and Filter Controls */}
                <div className="px-4 sm:px-6 pt-4 pb-3 space-y-2.5">
                  <div className="relative flex items-center">
                    <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 pointer-events-none stroke-[2]" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search Claim ID, item, or student..."
                      className="w-full h-9 pl-10 pr-4 bg-[#F8F9FA] hover:bg-[#F3F4F6] focus:bg-white rounded-xl border border-neutral-200/80 focus:border-neutral-300 focus:outline-none focus:ring-2 focus:ring-neutral-200/50 text-xs text-neutral-800 placeholder:text-neutral-400 font-normal transition-all"
                    />
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="relative" ref={categoryDropdownRef}>
                      <button
                        onClick={() => {
                          setCategoryDropdownOpen(!categoryDropdownOpen);
                          setDateDropdownOpen(false);
                        }}
                        className="flex items-center gap-1.5 h-8 px-3 rounded-xl border border-neutral-200 bg-white hover:bg-neutral-50 text-xs font-medium text-neutral-700 transition-colors cursor-pointer"
                      >
                        <span className="text-neutral-400">Item Category:</span>
                        <span className="font-semibold text-neutral-900">
                          {categoryFilter === "all" ? "All" : categoryFilter}
                        </span>
                        <ChevronDown className="w-3.5 h-3.5 text-neutral-400 ml-0.5" />
                      </button>
                      {categoryDropdownOpen && (
                        <div className="absolute left-0 top-full mt-1.5 w-52 bg-white rounded-2xl shadow-xl border border-neutral-100 p-1.5 z-50 animate-in fade-in zoom-in-95 duration-150">
                          {CATEGORIES.map((cat) => (
                            <button
                              key={cat}
                              onClick={() => {
                                setCategoryFilter(cat === "All Categories" ? "all" : cat);
                                setCategoryDropdownOpen(false);
                              }}
                              className={`w-full text-left px-3 py-2 rounded-xl text-xs transition-colors cursor-pointer ${
                                (cat === "All Categories" ? categoryFilter === "all" : categoryFilter === cat)
                                  ? "bg-rose-50 text-[#E5192D] font-semibold"
                                  : "text-neutral-700 hover:bg-neutral-50 font-medium"
                              }`}
                            >
                              {cat}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="relative" ref={dateDropdownRef}>
                      <button
                        onClick={() => {
                          setDateDropdownOpen(!dateDropdownOpen);
                          setCategoryDropdownOpen(false);
                        }}
                        className="flex items-center gap-1.5 h-8 px-3 rounded-xl border border-neutral-200 bg-white hover:bg-neutral-50 text-xs font-medium text-neutral-700 transition-colors cursor-pointer"
                      >
                        <span className="text-neutral-400">Date:</span>
                        <span className="font-semibold text-neutral-900">
                          {DATE_FILTERS.find((d) => d.value === dateFilter)?.label || "All Time"}
                        </span>
                        <ChevronDown className="w-3.5 h-3.5 text-neutral-400 ml-0.5" />
                      </button>
                      {dateDropdownOpen && (
                        <div className="absolute left-0 top-full mt-1.5 w-40 bg-white rounded-2xl shadow-xl border border-neutral-100 p-1.5 z-50 animate-in fade-in zoom-in-95 duration-150">
                          {DATE_FILTERS.map((d) => (
                            <button
                              key={d.value}
                              onClick={() => {
                                setDateFilter(d.value);
                                setDateDropdownOpen(false);
                              }}
                              className={`w-full text-left px-3 py-2 rounded-xl text-xs transition-colors cursor-pointer ${
                                dateFilter === d.value
                                  ? "bg-rose-50 text-[#E5192D] font-semibold"
                                  : "text-neutral-700 hover:bg-neutral-50 font-medium"
                              }`}
                            >
                              {d.label}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <div className="border-b border-neutral-100" />
                {renderTable(filteredClaims)}
              </Card>
            </TabsContent>
          </Tabs>
        </main>
      </div>

      {/* Review Modal Dialog */}
      {selectedClaim && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white border border-neutral-100 rounded-2xl w-full max-w-2xl shadow-xl overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-neutral-100 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-neutral-500">
                    {selectedClaim.id}
                  </span>
                  <Badge
                    variant={
                      selectedClaim.status === "pending"
                        ? "default"
                        : selectedClaim.status === "approved"
                        ? "secondary"
                        : "destructive"
                    }
                    className="capitalize text-[10px] font-semibold"
                  >
                    {selectedClaim.status}
                  </Badge>
                </div>
                <h3 className="text-base font-bold text-neutral-900 mt-0.5">
                  Claim Request Verification
                </h3>
              </div>

              <button
                onClick={() => setSelectedClaim(null)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5 text-xs">
              {/* Item Info Card */}
              <div className="bg-neutral-50/70 border border-neutral-100 rounded-xl p-3.5 space-y-1.5">
                <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wide">
                  Item Details
                </span>
                <div className="text-sm font-bold text-neutral-900">
                  {selectedClaim.itemTitle}
                </div>
                <div className="flex items-center gap-4 text-neutral-500 text-[11px] pt-1">
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-neutral-400" />
                    {selectedClaim.foundLocation}
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-neutral-400" />
                    {selectedClaim.dateSubmitted}
                  </span>
                </div>
              </div>

              {/* Claimant Information */}
              <div className="space-y-2">
                <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wide">
                  Claimant Information
                </span>
                <div className="flex items-center gap-3 p-3 border border-neutral-100 rounded-xl">
                  <Avatar size="default" className="w-10 h-10 border border-neutral-200">
                    {selectedClaim.claimant.avatarUrl && (
                      <AvatarImage
                        src={selectedClaim.claimant.avatarUrl}
                        alt={selectedClaim.claimant.name}
                      />
                    )}
                    <AvatarFallback className="bg-neutral-100 text-neutral-700 text-xs font-bold">
                      {getInitials(selectedClaim.claimant.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="font-bold text-neutral-900 text-sm">
                      {selectedClaim.claimant.name}
                    </div>
                    <div className="text-neutral-500 text-[11px]">
                      Student ID: {selectedClaim.claimant.studentId} • {selectedClaim.claimant.email}
                    </div>
                  </div>
                </div>
              </div>

              {/* Submitted Proof / Note */}
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5 text-[11px] font-bold text-neutral-500 uppercase tracking-wide">
                  <FileText className="w-3.5 h-3.5 text-neutral-400" />
                  Submitted Proof of Ownership
                </div>
                <div className="p-3 bg-neutral-50/80 rounded-xl border border-neutral-100 text-neutral-700 leading-relaxed">
                  "{selectedClaim.proofDescription}"
                </div>
              </div>

              {/* Security Questions / Extra detail */}
              {selectedClaim.securityQuestionsAnswer && (
                <div className="space-y-1.5">
                  <div className="text-[11px] font-bold text-neutral-500 uppercase tracking-wide">
                    Additional Matching Information
                  </div>
                  <div className="p-3 bg-neutral-50/80 rounded-xl border border-neutral-100 text-neutral-700 leading-relaxed">
                    {selectedClaim.securityQuestionsAnswer}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="px-6 py-4 border-t border-neutral-100 bg-neutral-50/50 flex items-center justify-between">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedClaim(null)}
                className="text-xs font-semibold text-neutral-500 hover:text-neutral-800"
              >
                Close
              </Button>

              <div className="flex items-center gap-2">
                {selectedClaim.status !== "rejected" && (
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleUpdateStatus(selectedClaim.id, "rejected")}
                    className="text-xs font-semibold"
                  >
                    Reject Claim
                  </Button>
                )}
                {selectedClaim.status !== "approved" && (
                  <Button
                    size="sm"
                    onClick={() => handleUpdateStatus(selectedClaim.id, "approved")}
                    className="bg-[#E5192D] hover:bg-[#c81425] text-white text-xs font-semibold shadow-xs"
                  >
                    Approve Claim
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClaimRequestsPage;
