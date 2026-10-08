import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowDownToLine,
  ArrowUpRight,
  BadgeCheck,
  Bell,
  Check,
  CheckCheck,
  ChevronDown,
  CircleAlert,
  Clock3,
  FileSearch,
  Flag,
  GitCompare,
  History,
  LayoutDashboard,
  MapPin,
  Package,
  PackageCheck,
  PackageSearch,
  Search,
  X,
} from "lucide-react";
import { ITEM_CATEGORIES } from "@/data/itemCategories";
import { initialItems } from "@/data/mockItems";

type AdminSection =
  | "overview"
  | "lost"
  | "found"
  | "claims"
  | "reports"
  | "matches"
  | "history";

type RecordStatus = "Open" | "Under review" | "Returned" | "Pending";

interface AdminReport {
  id: string;
  title: string;
  type: "Lost" | "Found";
  category: string;
  location: string;
  reportedBy: string;
  status: RecordStatus;
  date: string;
}

const adminReports: AdminReport[] = initialItems.map((item) => ({
  id: item.id,
  title: item.title,
  type: item.type === "lost" ? "Lost" : "Found",
  category:
    ITEM_CATEGORIES.find((category) => category.id === item.category)?.label ??
    "Other",
  location: item.building || item.location,
  reportedBy: item.contactName,
  status:
    item.status === "reunited"
      ? "Returned"
      : item.status === "pending"
        ? "Under review"
        : "Open",
  date: item.date,
}));

const claims = [
  {
    id: "CL-2408",
    status: "Pending" as const,
    item: "Black Backpack",
    claimant: "Mika Ross",
    dateLost: "October 3, 2026",
    timeLost: "Around 2:30 PM",
    location: "Library Building",
    details:
      "The front pocket has a small keychain shaped like a blue star. A physics notebook is inside.",
    submitted: "Today, 9:42 AM",
  },
  {
    id: "CL-2407",
    status: "Pending" as const,
    item: "Wallet",
    claimant: "Janelle Cruz",
    dateLost: "October 1, 2026",
    timeLost: "Around 11:00 AM",
    location: "Main Gate",
    details:
      "Brown leather wallet with a folded library receipt behind the student ID.",
    submitted: "Today, 8:15 AM",
  },
  {
    id: "CL-2402",
    status: "Pending" as const,
    item: "Water Bottle",
    claimant: "Noah Ibrahim",
    dateLost: "September 30, 2026",
    timeLost: "After lunch",
    location: "Cafeteria B",
    details:
      "Blue bottle with two stickers near the base and a name written underneath.",
    submitted: "Yesterday, 3:18 PM",
  },
];

const userReports = [
  {
    id: "RP-108",
    subject: "Black Backpack report",
    reason: "Incorrect contact information",
    submittedBy: "Mika Ross",
    submitted: "Today, 10:06 AM",
    status: "Pending" as const,
  },
  {
    id: "RP-105",
    subject: "Wallet claim conversation",
    reason: "Possible duplicate claim",
    submittedBy: "Janelle Cruz",
    submitted: "Yesterday, 1:32 PM",
    status: "Under review" as const,
  },
  {
    id: "RP-099",
    subject: "iPhone 13 report",
    reason: "Needs location clarification",
    submittedBy: "OSA desk",
    submitted: "October 5, 2026",
    status: "Open" as const,
  },
];

const possibleMatches = [
  {
    lost: "Black Backpack",
    found: "Backpack near the Library",
    location: "Library Building",
    submitted: "Today",
    reason: "Similar color, category, and reported location",
  },
  {
    lost: "iPhone 13",
    found: "Phone with a clear case",
    location: "Library Building",
    submitted: "Yesterday",
    reason: "Matching model and nearby report location",
  },
];

const activityHistory = [
  {
    id: "h1",
    title: "Claim request submitted",
    detail: "Mika Ross submitted a claim for the Black Backpack.",
    time: "Today, 9:42 AM",
    status: "Pending",
    icon: FileSearch,
  },
  {
    id: "h2",
    title: "Found item report added",
    detail: "A Water Bottle was reported at Cafeteria B.",
    time: "Today, 8:27 AM",
    status: "Open",
    icon: PackageCheck,
  },
  {
    id: "h3",
    title: "Possible match identified",
    detail: "A backpack report was paired with a nearby found report.",
    time: "Yesterday, 4:16 PM",
    status: "Under review",
    icon: GitCompare,
  },
  {
    id: "h4",
    title: "Report moved to review",
    detail: "The iPhone 13 report was flagged for a location check.",
    time: "October 5, 2026",
    status: "Under review",
    icon: Flag,
  },
  {
    id: "h5",
    title: "Item returned to owner",
    detail: "A verified claim was completed and the item was marked returned.",
    time: "October 4, 2026",
    status: "Returned",
    icon: CheckCheck,
  },
];

const navigation: {
  id: AdminSection;
  label: string;
  compactLabel: string;
  icon: React.ElementType;
}[] = [
  { id: "overview", label: "Dashboard", compactLabel: "Home", icon: LayoutDashboard },
  { id: "lost", label: "Lost items", compactLabel: "Lost", icon: PackageSearch },
  { id: "found", label: "Found items", compactLabel: "Found", icon: PackageCheck },
  { id: "claims", label: "Claims", compactLabel: "Claims", icon: BadgeCheck },
  { id: "reports", label: "Reports", compactLabel: "Reports", icon: Flag },
  { id: "matches", label: "Possible matches", compactLabel: "Matches", icon: GitCompare },
  { id: "history", label: "History", compactLabel: "History", icon: History },
];

const pageCopy: Record<AdminSection, { title: string; description: string }> = {
  overview: {
    title: "Operations overview",
    description: "A current view of campus lost and found activity.",
  },
  lost: {
    title: "Lost item reports",
    description: "Search and review reports for items reported lost.",
  },
  found: {
    title: "Found item reports",
    description: "Track found items and reports awaiting collection.",
  },
  claims: {
    title: "Ownership claims",
    description: "Review the details submitted to verify an item claim.",
  },
  reports: {
    title: "Community reports",
    description: "Review users and posts flagged for OSA attention.",
  },
  matches: {
    title: "Possible matches",
    description: "Compare lost and found reports before connecting them.",
  },
  history: {
    title: "Activity history",
    description: "Review recent report, claim, and matching activity.",
  },
};

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    Open: "bg-neutral-100 text-neutral-700",
    Claimed: "bg-blue-50 text-blue-800",
    "Under review": "bg-amber-50 text-amber-800",
    Returned: "bg-emerald-50 text-emerald-800",
    Pending: "bg-red-50 text-red-700",
  };

  return (
    <span
      className={`inline-flex whitespace-nowrap rounded-md px-2 py-1 text-[11px] font-semibold ${styles[status] ?? styles.Open}`}
    >
      {status}
    </span>
  );
}

function Panel({
  title,
  action,
  children,
  className = "",
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      aria-label={title}
      className={`min-w-0 rounded-xl border border-neutral-200 bg-white ${className}`}
    >
      <div className="flex min-h-14 items-center justify-between gap-3 border-b border-neutral-100 px-4 sm:px-5">
        <h2 className="text-sm font-bold text-neutral-900">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function ItemTable({ rows }: { rows: AdminReport[] }) {
  if (rows.length === 0) {
    return (
      <p className="px-5 py-10 text-center text-sm text-neutral-500">
        No reports match these filters.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[680px] text-left text-xs">
        <thead className="bg-neutral-50 text-[10px] font-bold uppercase tracking-wider text-neutral-500">
          <tr>
            <th scope="col" className="px-5 py-3">Item</th>
            <th scope="col" className="px-4 py-3">Category</th>
            <th scope="col" className="px-4 py-3">Location</th>
            <th scope="col" className="px-4 py-3">Reported by</th>
            <th scope="col" className="px-4 py-3">Date</th>
            <th scope="col" className="px-5 py-3">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-100">
          {rows.map((row) => (
            <tr key={row.id} className="text-neutral-700">
              <td className="px-5 py-3.5">
                <span className="block font-semibold text-neutral-900">
                  {row.title}
                </span>
                <span className="mt-0.5 block text-[10px] text-neutral-400">
                  {row.id}
                </span>
              </td>
              <td className="px-4 py-3.5 capitalize">{row.category}</td>
              <td className="max-w-40 px-4 py-3.5">
                <span className="block truncate">{row.location}</span>
              </td>
              <td className="px-4 py-3.5">{row.reportedBy}</td>
              <td className="whitespace-nowrap px-4 py-3.5">
                {new Intl.DateTimeFormat("en", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                }).format(new Date(`${row.date}T12:00:00`))}
              </td>
              <td className="px-5 py-3.5">
                <StatusBadge status={row.status} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PreviewActions({ className = "" }: { className?: string }) {
  return (
    <div className={`rounded-lg bg-neutral-50 px-3 py-2.5 ${className}`}>
      <p className="text-xs font-semibold text-neutral-700">
        Actions are preview-only
      </p>
      <p className="mt-1 text-[11px] leading-relaxed text-neutral-500">
        This interface does not update or save records.
      </p>
    </div>
  );
}

export function AdminDashboardPage() {
  const [section, setSection] = useState<AdminSection>("overview");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All statuses");
  const [selectedClaimId, setSelectedClaimId] = useState(claims[0].id);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  const copy = pageCopy[section];
  const normalizedQuery = query.trim().toLowerCase();
  const reportRows = useMemo(
    () =>
      adminReports.filter((report) => {
        const typeMatches =
          section === "lost"
            ? report.type === "Lost"
            : section === "found"
              ? report.type === "Found"
              : true;
        const queryMatches =
          !normalizedQuery ||
          [
            report.title,
            report.category,
            report.location,
            report.reportedBy,
            report.id,
          ].some((value) => value.toLowerCase().includes(normalizedQuery));
        const statusMatches =
          statusFilter === "All statuses" || report.status === statusFilter;
        return typeMatches && queryMatches && statusMatches;
      }),
    [normalizedQuery, section, statusFilter],
  );

  const selectedClaim =
    claims.find((claim) => claim.id === selectedClaimId) ?? claims[0];
  const pageNeedsSearch = ["lost", "found", "claims", "reports"].includes(
    section,
  );

  return (
    <div className="min-h-screen bg-[#F7F8FA] font-sans text-neutral-900 selection:bg-[#E5192D] selection:text-white">
      <aside className="fixed inset-y-0 left-0 z-30 flex w-[68px] flex-col border-r border-neutral-200 bg-white px-2 py-4 md:w-[232px] md:px-4">
        <Link
          to="/"
          aria-label="FoundIt home"
          className="mb-7 flex h-11 items-center justify-center gap-3 rounded-lg md:justify-start md:px-2"
        >
          <img
            src="/logo.jpeg"
            alt=""
            width={36}
            height={36}
            className="h-9 w-9 rounded-lg object-cover"
          />
          <span className="hidden text-base font-extrabold tracking-tight md:inline">
            Found<span className="text-[#E5192D]">It</span>
            <span className="ml-2 text-[10px] font-semibold uppercase tracking-wider text-neutral-400">
              OSA
            </span>
          </span>
        </Link>

        <div className="hidden px-3 pb-2 text-[10px] font-bold uppercase tracking-[0.14em] text-neutral-400 md:block">
          Workspace
        </div>
        <nav aria-label="OSA workspace" className="flex flex-col gap-1">
          {navigation.map(({ id, label, compactLabel, icon: Icon }) => {
            const active = section === id;
            return (
              <button
                key={id}
                type="button"
                title={label}
                aria-label={label}
                aria-current={active ? "page" : undefined}
                onClick={() => {
                  setSection(id);
                  setQuery("");
                  setStatusFilter("All statuses");
                }}
                className={`flex min-h-11 items-center justify-center gap-3 rounded-lg px-2 text-left text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5192D] focus-visible:ring-offset-2 md:justify-start md:px-3 ${
                  active
                    ? "bg-red-50 text-[#C81424]"
                    : "text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900"
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span className="hidden md:inline">{label}</span>
                <span className="sr-only md:hidden">{compactLabel}</span>
              </button>
            );
          })}
        </nav>

        <div className="mt-auto border-t border-neutral-100 pt-4">
          <div className="flex items-center justify-center gap-3 rounded-lg px-2 py-2 md:justify-start">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-neutral-900 text-[11px] font-bold text-white">
              OSA
            </div>
            <div className="hidden min-w-0 md:block">
              <p className="truncate text-xs font-bold text-neutral-900">
                OSA staff
              </p>
              <p className="text-[10px] text-neutral-500">Demo workspace</p>
            </div>
            <ChevronDown
              className="ml-auto hidden h-3.5 w-3.5 text-neutral-400 md:block"
              aria-hidden="true"
            />
          </div>
        </div>
      </aside>

      <div className="min-h-screen min-w-0 pl-[68px] md:pl-[232px]">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between gap-3 border-b border-neutral-200 bg-white/95 px-4 backdrop-blur-sm sm:px-6 lg:px-8">
          {pageNeedsSearch && (
          <div className="relative hidden min-w-0 max-w-xl flex-1 sm:block">
            <Search
              className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400"
              aria-hidden="true"
            />
            <input
              aria-label="Search OSA records"
              name="admin-search"
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search reports and claims…"
              autoComplete="off"
              className="h-10 w-full rounded-lg border border-neutral-200 bg-neutral-50 pl-9 pr-3 text-xs text-neutral-800 placeholder:text-neutral-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5192D]"
            />
          </div>
          )}
          <div className="flex min-w-0 items-center gap-3 sm:ml-auto">
            <span className="hidden rounded-md border border-neutral-200 bg-neutral-50 px-2.5 py-1.5 text-[10px] font-semibold text-neutral-600 sm:inline-flex">
              UI preview
            </span>
            <button
              type="button"
              aria-label="Notifications, 6 pending actions"
              aria-expanded={notificationsOpen}
              aria-controls="admin-notification-panel"
              onClick={() => setNotificationsOpen((open) => !open)}
              className="relative flex h-10 w-10 items-center justify-center rounded-lg text-neutral-600 transition-colors hover:bg-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5192D]"
            >
              <Bell className="h-4 w-4" aria-hidden="true" />
              <span
                aria-hidden="true"
                className="absolute right-2 top-2 h-2 w-2 rounded-full bg-[#E5192D]"
              />
            </button>
            <div className="hidden h-8 w-px bg-neutral-200 sm:block" />
            <div className="hidden text-right sm:block">
              <p className="text-[11px] font-bold text-neutral-800">
                Office of Student Affairs
              </p>
              <p className="text-[10px] text-neutral-500">WMSU</p>
            </div>
          </div>
          {notificationsOpen && (
            <div
              id="admin-notification-panel"
              className="absolute right-4 top-14 w-[min(340px,calc(100vw-5rem))] rounded-xl border border-neutral-200 bg-white p-4 shadow-lg sm:right-6 lg:right-8"
            >
              <h2 className="text-sm font-bold text-neutral-900">
                Pending actions
              </h2>
              <p className="mt-1 text-xs text-neutral-500">
                3 claims and 3 community reports are in this demo queue.
              </p>
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setSection("claims");
                    setQuery("");
                    setStatusFilter("All statuses");
                    setNotificationsOpen(false);
                  }}
                  className="inline-flex h-8 items-center rounded-md bg-neutral-900 px-3 text-[11px] font-semibold text-white hover:bg-neutral-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5192D]"
                >
                  Review claims
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSection("reports");
                    setQuery("");
                    setStatusFilter("All statuses");
                    setNotificationsOpen(false);
                  }}
                  className="inline-flex h-8 items-center rounded-md border border-neutral-200 px-3 text-[11px] font-semibold text-neutral-700 hover:bg-neutral-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5192D]"
                >
                  View reports
                </button>
              </div>
            </div>
          )}
        </header>

        <main id="admin-main" className="mx-auto max-w-[1440px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <a
            href="#admin-main"
            className="sr-only focus:not-sr-only focus:mb-4 focus:inline-flex focus:rounded-md focus:bg-neutral-900 focus:px-3 focus:py-2 focus:text-xs focus:font-semibold focus:text-white"
          >
            Skip to main content
          </a>
          <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div className="min-w-0">
              <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold text-neutral-500">
                <span>OSA workspace</span>
                <span aria-hidden="true">/</span>
                <span>{copy.title}</span>
              </div>
              <h1 className="text-xl font-extrabold tracking-tight text-neutral-900 sm:text-2xl">
                {copy.title}
              </h1>
              <p className="mt-1.5 max-w-2xl text-xs leading-relaxed text-neutral-600 sm:text-sm">
                {copy.description}
              </p>
            </div>
            <span className="inline-flex w-fit items-center gap-1.5 rounded-md border border-neutral-200 bg-white px-2.5 py-1.5 text-[10px] font-medium text-neutral-500">
              <CircleAlert className="h-3.5 w-3.5" aria-hidden="true" />
              Sample data. Changes are not saved.
            </span>
          </div>

          {pageNeedsSearch && (
            <div className="mb-4 flex flex-col gap-2 sm:hidden">
              <label htmlFor="mobile-admin-search" className="sr-only">
                Search {copy.title.toLowerCase()}
              </label>
              <input
                id="mobile-admin-search"
                name="admin-search"
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={`Search ${copy.title.toLowerCase()}…`}
                autoComplete="off"
                className="h-10 rounded-lg border border-neutral-200 bg-white px-3 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5192D]"
              />
            </div>
          )}

          {section === "overview" && (
            <Overview
              onNavigate={setSection}
              onSelectClaim={(id) => {
                setSelectedClaimId(id);
                setSection("claims");
              }}
            />
          )}

          {(section === "lost" || section === "found") && (
            <>
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <p className="text-xs text-neutral-500">
                  {reportRows.length} reports
                </p>
                <StatusFilter
                  value={statusFilter}
                  onChange={setStatusFilter}
                />
              </div>
              <Panel
                title={section === "lost" ? "Lost reports" : "Found reports"}
                action={
                  <button
                    type="button"
                    disabled
                    title="Export is a visual preview only"
                    className="inline-flex h-8 items-center gap-1.5 rounded-md border border-neutral-200 px-2.5 text-[11px] font-semibold text-neutral-400"
                  >
                    <ArrowDownToLine className="h-3.5 w-3.5" aria-hidden="true" />
                    Export
                  </button>
                }
              >
                <ItemTable rows={reportRows} />
              </Panel>
              <PreviewActions className="mt-4" />
            </>
          )}

          {section === "claims" && (
            <ClaimsView
              query={normalizedQuery}
              selectedClaim={selectedClaim}
              selectedClaimId={selectedClaimId}
              onSelectClaim={setSelectedClaimId}
              statusFilter={statusFilter}
              onStatusFilterChange={setStatusFilter}
            />
          )}

          {section === "reports" && (
            <CommunityReports
              query={normalizedQuery}
              statusFilter={statusFilter}
              onStatusFilterChange={setStatusFilter}
            />
          )}

          {section === "matches" && <MatchesView />}

          {section === "history" && <HistoryView />}
        </main>
      </div>
    </div>
  );
}

function StatusFilter({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="flex items-center gap-2 text-[11px] font-semibold text-neutral-600">
      Status
      <select
        name="status"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-9 rounded-md border border-neutral-200 bg-white px-2.5 text-xs text-neutral-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5192D]"
      >
        <option>All statuses</option>
        <option>Open</option>
        <option>Claimed</option>
        <option>Pending</option>
        <option>Under review</option>
        <option>Returned</option>
      </select>
    </label>
  );
}

function Overview({
  onNavigate,
  onSelectClaim,
}: {
  onNavigate: (section: AdminSection) => void;
  onSelectClaim: (id: string) => void;
}) {
  const lostCount = adminReports.filter((item) => item.type === "Lost").length;
  const foundCount = adminReports.filter((item) => item.type === "Found").length;
  const pendingCount = claims.length;
  const reviewCount = userReports.length;
  const metrics = [
    {
      label: "Lost reports",
      value: lostCount,
      note: "Across all statuses",
      icon: PackageSearch,
      section: "lost" as const,
    },
    {
      label: "Found reports",
      value: foundCount,
      note: "Reports on file",
      icon: PackageCheck,
      section: "found" as const,
    },
    {
      label: "Claims to review",
      value: pendingCount,
      note: "Ownership requests",
      icon: BadgeCheck,
      section: "claims" as const,
    },
    {
      label: "Community reports",
      value: reviewCount,
      note: "Posts or users flagged",
      icon: Flag,
      section: "reports" as const,
    },
  ];
  const recentRows = [...adminReports]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 5);

  return (
    <>
      <section
        aria-label="Report totals"
        className="grid grid-cols-2 overflow-hidden rounded-xl border border-neutral-200 bg-white xl:grid-cols-4"
      >
        {metrics.map(({ label, value, note, icon: Icon, section }) => (
          <button
            key={label}
            type="button"
            onClick={() => onNavigate(section)}
            className="group flex min-w-0 items-center gap-3 border-b border-neutral-100 p-3 text-left transition-colors hover:bg-neutral-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#E5192D] last:border-b-0 [&:nth-child(odd)]:border-r xl:border-b-0 xl:border-r xl:p-4 xl:last:border-r-0"
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-neutral-50 text-neutral-600 group-hover:bg-white">
              <Icon
                className="h-4 w-4"
                aria-hidden="true"
              />
            </span>
            <span className="min-w-0">
              <span className="flex items-baseline gap-2">
                <span className="text-lg font-extrabold tabular-nums tracking-tight text-neutral-900">
                  {value}
                </span>
                <span className="truncate text-[10px] font-semibold text-neutral-600 sm:text-[11px]">
                  {label}
                </span>
              </span>
              <span className="mt-0.5 block truncate text-[10px] text-neutral-500">
                {note}
              </span>
            </span>
          </button>
        ))}
      </section>

      <div className="mt-5 grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1.7fr)_minmax(280px,0.9fr)]">
        <Panel
          title="Recent reports"
          action={
            <button
              type="button"
              onClick={() => onNavigate("lost")}
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-neutral-600 hover:text-neutral-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5192D]"
            >
              View reports
              <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          }
        >
          <ItemTable rows={recentRows} />
        </Panel>

        <div className="flex min-w-0 flex-col gap-5">
          <Panel
            title="Pending actions"
            action={
              <span className="rounded-md bg-red-50 px-2 py-1 text-[10px] font-bold text-red-700">
                {claims.length + userReports.length}
              </span>
            }
          >
            <div className="divide-y divide-neutral-100">
              {claims.slice(0, 2).map((claim) => (
                <button
                  key={claim.id}
                  type="button"
                  onClick={() => onSelectClaim(claim.id)}
                  className="flex w-full items-start gap-3 px-4 py-3.5 text-left transition-colors hover:bg-neutral-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#E5192D]"
                >
                  <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-700">
                    <BadgeCheck className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-xs font-semibold text-neutral-800">
                      Verify {claim.item} claim
                    </span>
                    <span className="mt-1 block text-[10px] text-neutral-500">
                      {claim.claimant} · {claim.submitted}
                    </span>
                  </span>
                  <ArrowUpRight
                    className="mt-1 h-3.5 w-3.5 shrink-0 text-neutral-400"
                    aria-hidden="true"
                  />
                </button>
              ))}
              <button
                type="button"
                onClick={() => onNavigate("reports")}
                className="flex w-full items-start gap-3 px-4 py-3.5 text-left transition-colors hover:bg-neutral-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#E5192D]"
              >
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-red-50 text-red-700">
                  <Flag className="h-4 w-4" aria-hidden="true" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-xs font-semibold text-neutral-800">
                    Review community reports
                  </span>
                  <span className="mt-1 block text-[10px] text-neutral-500">
                    {userReports.length} reports need attention
                  </span>
                </span>
                <ArrowUpRight
                  className="mt-1 h-3.5 w-3.5 shrink-0 text-neutral-400"
                  aria-hidden="true"
                />
              </button>
            </div>
          </Panel>

          <Panel title="Recent activity">
            <ol className="space-y-4 px-4 py-4">
              {activityHistory.slice(0, 3).map(({ id, title, detail, time, icon: Icon }) => (
                <li key={id} className="flex gap-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-neutral-100 text-neutral-600">
                    <Icon className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-neutral-800">
                      {title}
                    </p>
                    <p className="mt-0.5 text-[10px] leading-relaxed text-neutral-500">
                      {detail}
                    </p>
                    <time className="mt-1 block text-[10px] text-neutral-400">
                      {time}
                    </time>
                  </div>
                </li>
              ))}
            </ol>
          </Panel>
        </div>
      </div>
    </>
  );
}

function ClaimsView({
  query,
  selectedClaim,
  selectedClaimId,
  onSelectClaim,
  statusFilter,
  onStatusFilterChange,
}: {
  query: string;
  selectedClaim: (typeof claims)[number];
  selectedClaimId: string;
  onSelectClaim: (id: string) => void;
  statusFilter: string;
  onStatusFilterChange: (value: string) => void;
}) {
  const filteredClaims = claims.filter((claim) =>
    (statusFilter === "All statuses" || claim.status === statusFilter) &&
    [claim.id, claim.item, claim.claimant, claim.location]
      .join(" ")
      .toLowerCase()
      .includes(query),
  );
  const visibleSelectedClaim = filteredClaims.some(
    (claim) => claim.id === selectedClaimId,
  )
    ? selectedClaim
    : null;

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-neutral-500">{filteredClaims.length} claims</p>
        <StatusFilter value={statusFilter} onChange={onStatusFilterChange} />
      </div>
      <div className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1.2fr)_minmax(300px,0.8fr)]">
      <Panel title="Submitted claims">
        {filteredClaims.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-neutral-500">
            No claims match this search.
          </p>
        ) : (
          <div className="divide-y divide-neutral-100">
            {filteredClaims.map((claim) => (
              <button
                key={claim.id}
                type="button"
                aria-pressed={selectedClaimId === claim.id}
                onClick={() => onSelectClaim(claim.id)}
                className={`flex w-full items-center gap-3 px-4 py-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#E5192D] sm:px-5 ${
                  selectedClaimId === claim.id
                    ? "bg-neutral-50"
                    : "hover:bg-neutral-50/70"
                }`}
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-red-50 text-[#C81424]">
                  <Package className="h-4 w-4" aria-hidden="true" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-xs font-bold text-neutral-900">
                    {claim.item}
                  </span>
                  <span className="mt-1 block truncate text-[11px] text-neutral-500">
                    {claim.claimant} · {claim.id}
                  </span>
                </span>
                <span className="hidden text-right sm:block">
                  <span className="block text-[10px] text-neutral-500">
                    Submitted
                  </span>
                  <span className="mt-1 block text-[10px] font-medium text-neutral-700">
                    {claim.submitted}
                  </span>
                </span>
              </button>
            ))}
          </div>
        )}
      </Panel>

      <Panel title="Claim details">
        {visibleSelectedClaim ? (
        <div className="space-y-4 p-4 sm:p-5">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500">
              Claimant
            </p>
            <h2 className="mt-1 text-base font-bold text-neutral-900">
              {visibleSelectedClaim.claimant}
            </h2>
            <p className="mt-1 text-xs text-neutral-500">
              Claim for {visibleSelectedClaim.item}
            </p>
          </div>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-3 border-y border-neutral-100 py-4 text-xs">
            <div>
              <dt className="text-[10px] text-neutral-500">Date lost</dt>
              <dd className="mt-1 font-semibold text-neutral-800">
                {visibleSelectedClaim.dateLost}
              </dd>
            </div>
            <div>
              <dt className="text-[10px] text-neutral-500">Approx. time</dt>
              <dd className="mt-1 font-semibold text-neutral-800">
                {visibleSelectedClaim.timeLost}
              </dd>
            </div>
            <div className="col-span-2">
              <dt className="text-[10px] text-neutral-500">Location lost</dt>
              <dd className="mt-1 inline-flex items-center gap-1.5 font-semibold text-neutral-800">
                <MapPin className="h-3.5 w-3.5 text-neutral-400" aria-hidden="true" />
                {visibleSelectedClaim.location}
              </dd>
            </div>
          </dl>
          <div>
            <p className="text-[10px] font-semibold text-neutral-500">
              Additional identifying details
            </p>
            <p className="mt-1.5 text-xs leading-relaxed text-neutral-700">
              {visibleSelectedClaim.details}
            </p>
          </div>
          <label className="block text-[10px] font-semibold text-neutral-500">
            Update item status
            <select
              disabled
              name="item-status"
              defaultValue="Open"
              aria-label="Update item status, preview only"
              className="mt-1.5 h-9 w-full rounded-md border border-neutral-200 bg-neutral-50 px-2.5 text-xs font-medium text-neutral-500"
            >
              <option>Open</option>
              <option>Claimed</option>
              <option>Returned</option>
            </select>
          </label>
          <div className="grid grid-cols-2 gap-2 pt-1">
            <button
              type="button"
              disabled
              title="Approval is a visual preview only"
              className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-[#E5192D] px-3 text-xs font-semibold text-white opacity-50"
            >
              <Check className="h-3.5 w-3.5" aria-hidden="true" />
              Approve claim
            </button>
            <button
              type="button"
              disabled
              title="Rejection is a visual preview only"
              className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-neutral-200 px-3 text-xs font-semibold text-neutral-400"
            >
              <X className="h-3.5 w-3.5" aria-hidden="true" />
              Reject
            </button>
          </div>
          <PreviewActions />
        </div>
        ) : (
          <p className="px-5 py-10 text-center text-sm text-neutral-500">
            No selected claim matches this search.
          </p>
        )}
      </Panel>
      </div>
    </div>
  );
}

function CommunityReports({
  query,
  statusFilter,
  onStatusFilterChange,
}: {
  query: string;
  statusFilter: string;
  onStatusFilterChange: (value: string) => void;
}) {
  const filteredReports = userReports.filter((report) =>
    (statusFilter === "All statuses" || report.status === statusFilter) &&
    [
      report.id,
      report.subject,
      report.reason,
      report.submittedBy,
      report.status,
    ]
      .join(" ")
      .toLowerCase()
      .includes(query),
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-neutral-500">
          {filteredReports.length} community reports
        </p>
        <StatusFilter value={statusFilter} onChange={onStatusFilterChange} />
      </div>
      <Panel title="Reported users and posts">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[660px] text-left text-xs">
            <thead className="bg-neutral-50 text-[10px] font-bold uppercase tracking-wider text-neutral-500">
              <tr>
                <th scope="col" className="px-5 py-3">Report</th>
                <th scope="col" className="px-4 py-3">Reason</th>
                <th scope="col" className="px-4 py-3">Submitted by</th>
                <th scope="col" className="px-4 py-3">Received</th>
                <th scope="col" className="px-5 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {filteredReports.map((report) => (
                <tr key={report.id}>
                  <td className="px-5 py-4">
                    <span className="block font-semibold text-neutral-900">
                      {report.subject}
                    </span>
                    <span className="mt-1 block text-[10px] text-neutral-400">
                      {report.id}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-neutral-700">
                    {report.reason}
                  </td>
                  <td className="px-4 py-4 text-neutral-700">
                    {report.submittedBy}
                  </td>
                  <td className="whitespace-nowrap px-4 py-4 text-neutral-600">
                    {report.submitted}
                  </td>
                  <td className="px-5 py-4">
                    <StatusBadge status={report.status} />
                  </td>
                </tr>
              ))}
              {filteredReports.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-5 py-10 text-center text-sm text-neutral-500"
                  >
                    No community reports match this search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Panel>
      <Panel
        title="Found It submissions"
        action={
          <span className="text-[10px] font-medium text-neutral-500">
            Reported by students
          </span>
        }
      >
        <ItemTable
          rows={adminReports.filter(
            (report) =>
              report.type === "Found" &&
              (statusFilter === "All statuses" ||
                report.status === statusFilter) &&
              [report.title, report.reportedBy, report.location, report.id]
                .join(" ")
                .toLowerCase()
                .includes(query),
          )}
        />
      </Panel>
      <PreviewActions />
    </div>
  );
}

function MatchesView() {
  return (
    <>
      <div className="mb-4 flex items-start gap-3 rounded-xl border border-neutral-200 bg-white p-4">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-neutral-100 text-neutral-700">
          <GitCompare className="h-4 w-4" aria-hidden="true" />
        </span>
        <div>
          <p className="text-xs font-bold text-neutral-900">
            Suggested matches need staff review
          </p>
          <p className="mt-1 text-xs leading-relaxed text-neutral-600">
            Compare item details and locations before connecting the reports.
            Similarity suggestions are examples only.
          </p>
        </div>
      </div>
      <div className="space-y-3">
        {possibleMatches.map((match) => (
          <article
            key={match.lost}
            className="rounded-xl border border-neutral-200 bg-white p-4 sm:p-5"
          >
            <div className="grid gap-4 md:grid-cols-[1fr_auto_1fr] md:items-center">
              <MatchRecord label="Lost report" title={match.lost} />
              <span className="mx-auto flex h-8 w-8 items-center justify-center rounded-full bg-neutral-100 text-neutral-600">
                <GitCompare className="h-4 w-4" aria-hidden="true" />
              </span>
              <MatchRecord label="Found report" title={match.found} />
            </div>
            <div className="mt-4 flex flex-col justify-between gap-3 border-t border-neutral-100 pt-4 sm:flex-row sm:items-center">
              <div>
                <p className="text-xs font-semibold text-neutral-800">
                  {match.reason}
                </p>
                <p className="mt-1 text-[10px] text-neutral-500">
                  <MapPin className="mr-1 inline h-3 w-3" aria-hidden="true" />
                  {match.location} · {match.submitted}
                </p>
              </div>
              <button
                type="button"
                disabled
                title="Match confirmation is a visual preview only"
                className="inline-flex h-9 items-center justify-center gap-1.5 self-start rounded-lg border border-neutral-200 px-3 text-xs font-semibold text-neutral-400 sm:self-auto"
              >
                <CheckCheck className="h-3.5 w-3.5" aria-hidden="true" />
                Confirm match
              </button>
            </div>
          </article>
        ))}
      </div>
      <div className="mt-4">
        <PreviewActions />
      </div>
    </>
  );
}

function MatchRecord({ label, title }: { label: string; title: string }) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500">
        {label}
      </p>
      <p className="mt-1 text-sm font-bold text-neutral-900">{title}</p>
    </div>
  );
}

function HistoryView() {
  return (
    <>
      <Panel
        title="Recent activity"
        action={
          <span className="inline-flex items-center gap-1.5 text-[10px] text-neutral-500">
            <Clock3 className="h-3.5 w-3.5" aria-hidden="true" />
            Latest entries
          </span>
        }
      >
        <ol className="divide-y divide-neutral-100">
          {activityHistory.map(({ id, title, detail, time, status, icon: Icon }) => (
            <li
              key={id}
              className="flex items-start gap-3 px-4 py-4 sm:px-5"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-neutral-100 text-neutral-700">
                <Icon className="h-4 w-4" aria-hidden="true" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-neutral-900">{title}</p>
                <p className="mt-1 text-xs leading-relaxed text-neutral-600">
                  {detail}
                </p>
                <time className="mt-1.5 block text-[10px] text-neutral-400">
                  {time}
                </time>
              </div>
              <StatusBadge status={status} />
            </li>
          ))}
        </ol>
      </Panel>
      <div className="mt-4">
        <PreviewActions />
      </div>
    </>
  );
}

export default AdminDashboardPage;
