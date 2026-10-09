import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowUpRight,
  BadgeCheck,
  Check,
  CheckCheck,
  FileSearch,
  Flag,
  GitCompare,
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
import type { ClaimRequest } from "@/types/claim";
import {
  AdminSidebar,
  type AdminNotification,
  type AdminSidebarItem,
} from "@/pages/admin/AdminSidebar";

type AdminSection =
  | "overview"
  | "lost"
  | "found"
  | "claims";

type RecordStatus = "Lost" | "Found" | "Returned" | "Claimed";

interface AdminReport {
  id: string;
  title: string;
  type: "Lost" | "Found";
  image: string;
  category: string;
  description: string;
  building: string;
  color: string;
  reportedBy: string;
  status: RecordStatus;
  date: string;
}

type AdminClaim = ClaimRequest;

const adminReports: AdminReport[] = initialItems.map((item) => ({
  id: item.id,
  title: item.title,
  type: item.type === "lost" ? "Lost" : "Found",
  image: item.image,
  category:
    ITEM_CATEGORIES.find((category) => category.id === item.category)?.label ??
    "Other",
  description: item.description,
  building: item.building || item.location,
  color: item.color ?? "",
  reportedBy: item.contactName,
  status:
    item.status === "reunited"
      ? item.type === "lost"
        ? "Returned"
        : "Claimed"
      : item.type === "lost"
        ? "Lost"
        : "Found",
  date: item.date,
}));

const claims: AdminClaim[] = [
  {
    id: "CL-2408",
    status: "Pending" as const,
    item: "Black Backpack",
    itemId: "item-1",
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
    itemId: "item-4",
    claimant: "Janelle Cruz",
    dateLost: "October 1, 2026",
    timeLost: "Around 11:00 AM",
    location: "Main Gate",
    details:
      "Brown leather wallet with a folded library receipt behind the student ID.",
    submitted: "Today, 8:15 AM",
  },
  {
    id: "CL-2406",
    status: "Under review" as const,
    item: "iPhone 13",
    itemId: "item-2",
    claimant: "Alyssa Moore",
    dateLost: "October 3, 2026",
    timeLost: "Around 10:15 AM",
    location: "Library Building",
    details:
      "White iPhone 13 with a clear case. The lock screen has a photo of my dog.",
    submitted: "Today, 7:54 AM",
  },
  {
    id: "CL-2405",
    status: "Pending" as const,
    item: "Notebook",
    itemId: "item-8",
    claimant: "Rohan Patel",
    dateLost: "September 29, 2026",
    timeLost: "Around 1:00 PM",
    location: "Admin Building",
    details:
      "Blue spiral notebook with my initials written inside the front cover.",
    submitted: "October 8, 2026, 2:40 PM",
  },
  {
    id: "CL-2404",
    status: "Under review" as const,
    item: "Jacket",
    itemId: "item-10",
    claimant: "Sofia Reyes",
    dateLost: "September 28, 2026",
    timeLost: "After the afternoon program",
    location: "Auditorium",
    details:
      "Gray jacket with a small department logo on the left sleeve.",
    submitted: "October 8, 2026, 11:05 AM",
  },
  {
    id: "CL-2403",
    status: "Pending" as const,
    item: "Keys",
    itemId: "item-12",
    claimant: "Gabriel Santos",
    dateLost: "September 27, 2026",
    timeLost: "Around 4:30 PM",
    location: "Parking Lot",
    details:
      "Toyota car keys with a black fob and a small red tag on the key ring.",
    submitted: "October 7, 2026, 4:22 PM",
  },
  {
    id: "CL-2402",
    status: "Pending" as const,
    item: "Water Bottle",
    itemId: "item-6",
    claimant: "Noah Ibrahim",
    dateLost: "September 30, 2026",
    timeLost: "After lunch",
    location: "Cafeteria B",
    details:
      "Blue bottle with two stickers near the base and a name written underneath.",
    submitted: "October 7, 2026, 3:18 PM",
  },
];

const initialNotifications: AdminNotification[] = claims.map((claim) => ({
  id: claim.id,
  title: "Ownership claim submitted",
  description: `${claim.claimant} submitted a claim for the ${claim.item}.`,
  time: claim.submitted,
  claimId: claim.id,
  read: false,
}));

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

const navigation: AdminSidebarItem<AdminSection>[] = [
  { id: "overview", label: "Dashboard", compactLabel: "Home", icon: LayoutDashboard },
  { id: "lost", label: "Lost items", compactLabel: "Lost", icon: PackageSearch },
  { id: "found", label: "Found items", compactLabel: "Found", icon: PackageCheck },
  { id: "claims", label: "Claims", compactLabel: "Claims", icon: BadgeCheck },
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
};

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    Open: "bg-neutral-100 text-neutral-700",
    Lost: "bg-red-50 text-red-700",
    Found: "bg-sky-50 text-sky-800",
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
  borderless = false,
  onMouseEnter,
  onMouseLeave,
  onFocusCapture,
  onBlurCapture,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  borderless?: boolean;
  onMouseEnter?: React.MouseEventHandler<HTMLElement>;
  onMouseLeave?: React.MouseEventHandler<HTMLElement>;
  onFocusCapture?: React.FocusEventHandler<HTMLElement>;
  onBlurCapture?: React.FocusEventHandler<HTMLElement>;
}) {
  return (
    <section
      aria-label={title}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onFocusCapture={onFocusCapture}
      onBlurCapture={onBlurCapture}
      className={`min-w-0 bg-white ${borderless ? "" : "rounded-xl border border-neutral-200"} ${className}`}
    >
      <div className={`flex min-h-14 items-center justify-between gap-3 px-4 sm:px-5 ${borderless ? "" : "border-b border-neutral-100"}`}>
        <h2 className="text-sm font-bold text-neutral-900">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function ItemTable({
  rows,
  onViewDetails,
  wholeRowClickable = false,
  showColumnHeadings = true,
}: {
  rows: AdminReport[];
  onViewDetails: (report: AdminReport) => void;
  wholeRowClickable?: boolean;
  showColumnHeadings?: boolean;
}) {
  if (rows.length === 0) {
    return (
      <p className="px-5 py-10 text-center text-sm text-neutral-500">
        No reports match these filters.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[1120px] text-left text-xs">
        <thead
          className={
            showColumnHeadings
              ? "bg-neutral-50 text-[10px] font-bold uppercase tracking-wider text-neutral-500"
              : "sr-only"
          }
        >
          <tr>
            <th scope="col" className="px-5 py-3">Item name</th>
            <th scope="col" className="max-w-72 px-4 py-3">Description</th>
            <th scope="col" className="px-4 py-3">Category</th>
            <th scope="col" className="px-4 py-3">Building</th>
            <th scope="col" className="px-4 py-3">Color</th>
            <th scope="col" className="px-4 py-3">Reported by</th>
            <th scope="col" className="px-4 py-3">Date</th>
            <th scope="col" className="px-4 py-3">Status</th>
            {!wholeRowClickable && (
              <th scope="col" className="px-5 py-3">Details</th>
            )}
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-100">
          {rows.map((row) => (
            <tr
              key={row.id}
              tabIndex={wholeRowClickable ? 0 : undefined}
              aria-label={
                wholeRowClickable
                  ? `Open full details for ${row.title}`
                  : undefined
              }
              aria-keyshortcuts={wholeRowClickable ? "Enter Space" : undefined}
              onClick={
                wholeRowClickable ? () => onViewDetails(row) : undefined
              }
              onKeyDown={
                wholeRowClickable
                  ? (event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        onViewDetails(row);
                      }
                    }
                  : undefined
              }
              className={`text-neutral-700 ${
                wholeRowClickable
                  ? "cursor-pointer hover:bg-neutral-50 focus-visible:outline-2 focus-visible:outline-[#E5192D] focus-visible:outline-offset-[-2px]"
                  : ""
              }`}
            >
              <td className="px-5 py-3.5">
                <div className="flex min-w-0 items-center gap-3">
                  {row.image ? (
                    <img
                      src={row.image}
                      alt={`${row.title} item`}
                      loading="lazy"
                      className="h-12 w-12 shrink-0 rounded-lg object-cover"
                    />
                  ) : (
                    <span
                      aria-hidden="true"
                      className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-neutral-100 text-neutral-400"
                    >
                      <Package className="h-5 w-5" />
                    </span>
                  )}
                  <span className="min-w-0">
                    <span className="block truncate font-semibold text-neutral-900">
                      {row.title}
                    </span>
                    <span className="mt-0.5 block text-[10px] text-neutral-400">
                      {row.id}
                    </span>
                  </span>
                </div>
              </td>
              <td className="max-w-72 px-4 py-3.5">
                <span className="line-clamp-2 leading-relaxed">
                  {row.description}
                </span>
              </td>
              <td className="px-4 py-3.5 capitalize">{row.category}</td>
              <td className="max-w-40 px-4 py-3.5">
                <span className="block truncate">{row.building}</span>
              </td>
              <td className="px-4 py-3.5">
                {row.color || "—"}
              </td>
              <td className="px-4 py-3.5">{row.reportedBy}</td>
              <td className="whitespace-nowrap px-4 py-3.5">
                {new Intl.DateTimeFormat("en", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                }).format(new Date(`${row.date}T12:00:00`))}
              </td>
              <td className="px-4 py-3.5">
                <StatusBadge status={row.status} />
              </td>
              {!wholeRowClickable && (
                <td className="px-5 py-3.5">
                  <button
                    type="button"
                    onClick={() => onViewDetails(row)}
                    aria-label={`View details for ${row.title}`}
                    className="inline-flex h-8 items-center rounded-md border border-neutral-200 px-3 text-[11px] font-semibold text-neutral-700 transition-colors hover:bg-neutral-50 hover:text-neutral-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5192D]"
                  >
                    View details
                  </button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function AdminDashboardPage({
  additionalClaims = [],
}: {
  additionalClaims?: ClaimRequest[];
}) {
  const [section, setSection] = useState<AdminSection>("overview");
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All statuses");
  const [selectedClaimId, setSelectedClaimId] = useState(claims[0].id);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState(initialNotifications);
  const [selectedReport, setSelectedReport] = useState<AdminReport | null>(null);
  const itemDetailsDialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = itemDetailsDialogRef.current;
    if (selectedReport && dialog && !dialog.open) {
      dialog.showModal();
    }

    return () => {
      if (dialog?.open) dialog.close();
    };
  }, [selectedReport]);

  const handleNotificationSelect = (notification: AdminNotification) => {
    setNotifications((current) =>
      current.map((entry) =>
        entry.id === notification.id ? { ...entry, read: true } : entry,
      ),
    );
    setSelectedClaimId(notification.claimId);
    setSection("claims");
    setQuery("");
    setStatusFilter("All statuses");
    setNotificationsOpen(false);
  };

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
            report.description,
            report.category,
            report.building,
            report.color,
            report.reportedBy,
            report.id,
          ].some((value) => value.toLowerCase().includes(normalizedQuery));
        return typeMatches && queryMatches;
      }),
    [normalizedQuery, section],
  );

  const allClaims = [...additionalClaims, ...claims];
  const selectedClaim =
    allClaims.find((claim) => claim.id === selectedClaimId) ?? allClaims[0];
  const pageNeedsSearch = ["lost", "found", "claims"].includes(section);

  return (
    <div className="min-h-screen bg-white font-open-sans text-neutral-900 selection:bg-[#E5192D] selection:text-white">
      <AdminSidebar
        activeSection={section}
        navigation={navigation}
        expanded={sidebarExpanded}
        onExpandedChange={setSidebarExpanded}
        notifications={notifications}
        notificationsOpen={notificationsOpen}
        onNotificationsOpenChange={setNotificationsOpen}
        onSectionChange={(newSection) => {
          setSection(newSection);
          setQuery("");
          setStatusFilter("All statuses");
        }}
        onNotificationSelect={handleNotificationSelect}
        onMarkAllRead={() =>
          setNotifications((current) =>
            current.map((notification) => ({ ...notification, read: true })),
          )
        }
      />

      <div
        className={`min-h-screen min-w-0 pl-16 transition-[margin] duration-300 ease-in-out ${
          sidebarExpanded ? "md:ml-60" : "md:ml-20"
        }`}
      >
        <header className={`sticky top-0 z-20 flex h-16 items-center justify-between gap-3 bg-white/95 px-4 backdrop-blur-sm transition-[margin,width] duration-300 sm:px-6 lg:px-8 ${
          notificationsOpen
            ? "md:ml-80 md:w-[calc(100%-20rem)]"
            : "w-full"
        }`}>
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
        </header>

        <main id="admin-main" className={`min-w-0 px-4 py-6 transition-[margin,width] duration-300 sm:px-6 lg:px-8 lg:py-8 ${
          notificationsOpen
            ? "md:ml-80 md:w-[calc(100%-20rem)]"
            : "w-full"
        }`}>
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
              onViewReport={setSelectedReport}
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
              </div>
              <Panel
                title={section === "lost" ? "Lost reports" : "Found reports"}
              >
                <ItemTable
                  rows={reportRows}
                  onViewDetails={setSelectedReport}
                  wholeRowClickable
                />
              </Panel>
            </>
          )}

          {section === "claims" && (
            <ClaimsView
              claims={allClaims}
              query={normalizedQuery}
              selectedClaim={selectedClaim}
              selectedClaimId={selectedClaimId}
              onSelectClaim={setSelectedClaimId}
              statusFilter={statusFilter}
              onStatusFilterChange={setStatusFilter}
            />
          )}

        </main>
      </div>
      {selectedReport && (
        <dialog
          ref={itemDetailsDialogRef}
          aria-labelledby="item-details-title"
          onClose={() => setSelectedReport(null)}
          className="m-auto max-h-[min(90dvh,800px)] w-[min(640px,calc(100vw-2rem))] overflow-y-auto rounded-xl border border-neutral-200 bg-white p-0 text-neutral-900 shadow-xl backdrop:bg-neutral-950/50"
        >
          <div className="flex items-start justify-between gap-4 border-b border-neutral-100 px-5 py-4">
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500">
                {selectedReport.type} item · {selectedReport.id}
              </p>
              <h2
                id="item-details-title"
                className="mt-1 text-lg font-bold text-neutral-900"
              >
                {selectedReport.title}
              </h2>
            </div>
            <form method="dialog">
              <button
                type="submit"
                aria-label="Close item details"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5192D]"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </form>
          </div>
          <div className="space-y-5 p-5">
            {selectedReport.image ? (
              <img
                src={selectedReport.image}
                alt={selectedReport.title}
                className="max-h-72 w-full rounded-lg bg-neutral-50 object-contain"
              />
            ) : (
              <div
                aria-hidden="true"
                className="flex h-48 items-center justify-center rounded-lg bg-neutral-100 text-neutral-400"
              >
                <Package className="h-8 w-8" />
              </div>
            )}
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-neutral-700">
              {selectedReport.description}
            </p>
            <dl className="grid grid-cols-2 gap-x-5 gap-y-4 border-t border-neutral-100 pt-4 text-xs sm:grid-cols-3">
              <div>
                <dt className="text-[10px] text-neutral-500">Category</dt>
                <dd className="mt-1 font-semibold text-neutral-800">
                  {selectedReport.category}
                </dd>
              </div>
              <div>
                <dt className="text-[10px] text-neutral-500">Building</dt>
                <dd className="mt-1 font-semibold text-neutral-800">
                  {selectedReport.building}
                </dd>
              </div>
              <div>
                <dt className="text-[10px] text-neutral-500">Color</dt>
                <dd className="mt-1 font-semibold text-neutral-800">
                  {selectedReport.color || "Not specified"}
                </dd>
              </div>
              <div>
                <dt className="text-[10px] text-neutral-500">Reported by</dt>
                <dd className="mt-1 font-semibold text-neutral-800">
                  {selectedReport.reportedBy}
                </dd>
              </div>
              <div>
                <dt className="text-[10px] text-neutral-500">Date reported</dt>
                <dd className="mt-1 font-semibold text-neutral-800">
                  {new Intl.DateTimeFormat("en", {
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  }).format(new Date(`${selectedReport.date}T12:00:00`))}
                </dd>
              </div>
            </dl>
          </div>
        </dialog>
      )}
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
  onViewReport,
  onSelectClaim,
}: {
  onNavigate: (section: AdminSection) => void;
  onViewReport: (report: AdminReport) => void;
  onSelectClaim: (id: string) => void;
}) {
  const lostCount = adminReports.filter((item) => item.type === "Lost").length;
  const foundCount = adminReports.filter((item) => item.type === "Found").length;
  const pendingCount = claims.length;
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
  ];
  const recentRows = [...adminReports]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 5);

  return (
    <>
      <section
        aria-label="Report totals"
        className="grid grid-cols-2 overflow-hidden rounded-xl border border-neutral-200 bg-white xl:grid-cols-3"
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
          <ItemTable rows={recentRows} onViewDetails={onViewReport} />
        </Panel>

        <div className="flex min-w-0 flex-col gap-5">
          <Panel
            title="Pending actions"
            action={
              <span className="rounded-md bg-red-50 px-2 py-1 text-[10px] font-bold text-red-700">
                {claims.length}
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
  claims: claimRequests,
  query,
  selectedClaim,
  selectedClaimId,
  onSelectClaim,
  statusFilter,
  onStatusFilterChange,
}: {
  claims: ClaimRequest[];
  query: string;
  selectedClaim: ClaimRequest;
  selectedClaimId: string;
  onSelectClaim: (id: string) => void;
  statusFilter: string;
  onStatusFilterChange: (value: string) => void;
}) {
  const [submittedClaimsActive, setSubmittedClaimsActive] = useState(false);
  const filteredClaims = claimRequests.filter((claim) =>
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
  const selectedItemPost = visibleSelectedClaim
    ? adminReports.find((report) => report.id === visibleSelectedClaim.itemId)
    : undefined;
  const selectedItemImage = selectedItemPost?.image ?? "";

  return (
    <div className="overflow-x-clip">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-neutral-500">{filteredClaims.length} claims</p>
      </div>
      <div
        className={`grid min-w-0 gap-5 transition-[grid-template-columns] duration-300 ease-in-out ${
          submittedClaimsActive
            ? "xl:grid-cols-[minmax(0,0.7fr)_minmax(360px,1.3fr)]"
            : "xl:grid-cols-[minmax(240px,0.35fr)_minmax(360px,1.65fr)]"
        }`}
      >
          <Panel
            title="Submitted claims"
            className="group xl:sticky xl:top-20 xl:max-h-[calc(100dvh-6rem)] xl:self-start xl:overflow-y-auto"
            onMouseEnter={() => setSubmittedClaimsActive(true)}
            onMouseLeave={(event) =>
              setSubmittedClaimsActive(
                event.currentTarget.contains(document.activeElement),
              )
            }
            onFocusCapture={() => setSubmittedClaimsActive(true)}
            onBlurCapture={(event) => {
              const nextTarget = event.relatedTarget;
              if (
                (!(nextTarget instanceof Node) ||
                  !event.currentTarget.contains(nextTarget)) &&
                !event.currentTarget.matches(":hover")
              ) {
                setSubmittedClaimsActive(false);
              }
            }}
            action={
              <div className="flex xl:hidden xl:group-hover:flex xl:group-focus-within:flex">
                <StatusFilter
                  value={statusFilter}
                  onChange={onStatusFilterChange}
                />
              </div>
            }
          >
            {filteredClaims.length === 0 ? (
              <p className="px-5 py-10 text-center text-sm text-neutral-500">
                No claims match this search.
              </p>
            ) : (
              <div className="divide-y divide-neutral-100">
                {filteredClaims.map((claim) => {
                  const itemImage =
                    adminReports.find((report) => report.id === claim.itemId)
                      ?.image ?? "";

                  return (
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
                      {itemImage ? (
                        <img
                          src={itemImage}
                          alt={`${claim.item} item`}
                          loading="lazy"
                          className="h-12 w-12 shrink-0 rounded-lg object-cover"
                        />
                      ) : (
                        <span
                          aria-hidden="true"
                          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-neutral-100 text-neutral-400"
                        >
                          <Package className="h-5 w-5" />
                        </span>
                      )}
                      <span className="min-w-0 flex-1">
                        <span className="block break-normal text-sm font-bold leading-snug text-neutral-900">
                          {claim.item}
                        </span>
                        <span className="mt-1 block max-h-8 truncate text-[11px] text-neutral-500 transition-[max-height,opacity] duration-200 xl:max-h-0 xl:overflow-hidden xl:opacity-0 xl:group-hover:max-h-8 xl:group-hover:opacity-100 xl:group-focus-within:max-h-8 xl:group-focus-within:opacity-100">
                          {claim.claimant} · {claim.id}
                        </span>
                      </span>
                      <span className="hidden text-right transition-[max-height,opacity] duration-200 sm:block xl:max-h-0 xl:overflow-hidden xl:opacity-0 xl:group-hover:max-h-10 xl:group-hover:opacity-100 xl:group-focus-within:max-h-10 xl:group-focus-within:opacity-100">
                        <span className="block text-[10px] text-neutral-500">
                          Submitted
                        </span>
                        <span className="mt-1 block text-[10px] font-medium text-neutral-700">
                          {claim.submitted}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </Panel>

          <Panel title="Claim details" borderless>
            {visibleSelectedClaim ? (
              <div className="space-y-4 p-4 sm:p-5">
                <section aria-labelledby="claim-item-post-heading">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <h2
                      id="claim-item-post-heading"
                      className="text-sm font-bold text-neutral-900"
                    >
                      {selectedItemPost?.type === "Found"
                        ? "Found item post"
                        : "Original item post"}
                    </h2>
                    {selectedItemPost && (
                      <span className="rounded-full bg-neutral-100 px-2.5 py-1 text-[10px] font-semibold text-neutral-600">
                        {selectedItemPost.type}
                      </span>
                    )}
                  </div>
                  {selectedItemImage ? (
                    <div className="flex h-48 w-full items-center justify-center overflow-hidden rounded-lg bg-neutral-50 sm:h-56">
                      <img
                        src={selectedItemImage}
                        alt={`${visibleSelectedClaim.item} item`}
                        className="max-h-full max-w-full object-contain"
                      />
                    </div>
                  ) : (
                    <div
                      aria-hidden="true"
                      className="flex h-40 w-full items-center justify-center rounded-lg bg-neutral-100 text-neutral-400"
                    >
                      <Package className="h-8 w-8" />
                    </div>
                  )}
                  {selectedItemPost ? (
                    <>
                      <h3 className="mt-3 text-base font-bold text-neutral-900">
                        {selectedItemPost.title}
                      </h3>
                      <p className="mt-1 text-xs leading-relaxed text-neutral-700">
                        {selectedItemPost.description}
                      </p>
                      <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3 border-y border-neutral-100 py-3 text-xs">
                        <div>
                          <dt className="text-[10px] text-neutral-500">Category</dt>
                          <dd className="mt-1 font-semibold text-neutral-800">
                            {selectedItemPost.category}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-[10px] text-neutral-500">Post status</dt>
                          <dd className="mt-1 font-semibold text-neutral-800">
                            {selectedItemPost.status}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-[10px] text-neutral-500">Posted by</dt>
                          <dd className="mt-1 font-semibold text-neutral-800">
                            {selectedItemPost.reportedBy}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-[10px] text-neutral-500">Post date</dt>
                          <dd className="mt-1 font-semibold text-neutral-800">
                            {selectedItemPost.date}
                          </dd>
                        </div>
                        <div className="col-span-2">
                          <dt className="text-[10px] text-neutral-500">Post location</dt>
                          <dd className="mt-1 inline-flex items-center gap-1.5 font-semibold text-neutral-800">
                            <MapPin
                              className="h-3.5 w-3.5 text-neutral-400"
                              aria-hidden="true"
                            />
                            {selectedItemPost.building}
                          </dd>
                        </div>
                        {selectedItemPost.color && (
                          <div className="col-span-2">
                            <dt className="text-[10px] text-neutral-500">Color</dt>
                            <dd className="mt-1 font-semibold text-neutral-800">
                              {selectedItemPost.color}
                            </dd>
                          </div>
                        )}
                      </dl>
                    </>
                  ) : (
                    <p className="mt-3 text-xs text-neutral-500">
                      The original item post could not be found.
                    </p>
                  )}
                </section>
                <section
                  aria-labelledby="claim-request-heading"
                  className="border-t border-neutral-100 pt-4"
                >
                  <h2
                    id="claim-request-heading"
                    className="text-sm font-bold text-neutral-900"
                  >
                    Claim request
                  </h2>
                  <p className="mt-2 text-sm font-semibold text-neutral-800">
                    {visibleSelectedClaim.claimant}
                  </p>
                  <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3 text-xs">
                    <div>
                      <dt className="text-[10px] text-neutral-500">Request ID</dt>
                      <dd className="mt-1 font-semibold text-neutral-800">
                        {visibleSelectedClaim.id}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-[10px] text-neutral-500">Claim status</dt>
                      <dd className="mt-1 font-semibold text-neutral-800">
                        {visibleSelectedClaim.status}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-[10px] text-neutral-500">Submitted</dt>
                      <dd className="mt-1 font-semibold text-neutral-800">
                        {visibleSelectedClaim.submitted}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-[10px] text-neutral-500">Date lost</dt>
                      <dd className="mt-1 font-semibold text-neutral-800">
                        {visibleSelectedClaim.dateLost}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-[10px] text-neutral-500">Approx. time lost</dt>
                      <dd className="mt-1 font-semibold text-neutral-800">
                        {visibleSelectedClaim.timeLost}
                      </dd>
                    </div>
                    <div className="col-span-2">
                      <dt className="text-[10px] text-neutral-500">Location lost</dt>
                      <dd className="mt-1 inline-flex items-center gap-1.5 font-semibold text-neutral-800">
                        <MapPin
                          className="h-3.5 w-3.5 text-neutral-400"
                          aria-hidden="true"
                        />
                        {visibleSelectedClaim.location}
                      </dd>
                    </div>
                    <div className="col-span-2">
                      <dt className="text-[10px] text-neutral-500">
                        Identifying details provided
                      </dt>
                      <dd className="mt-1.5 leading-relaxed text-neutral-700">
                        {visibleSelectedClaim.details}
                      </dd>
                    </div>
                    {visibleSelectedClaim.evidence &&
                      visibleSelectedClaim.evidence.length > 0 && (
                        <div className="col-span-2">
                          <dt className="text-[10px] font-semibold text-neutral-500">
                            Claimant photo evidence
                          </dt>
                          <dd className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
                            {visibleSelectedClaim.evidence.map((image, index) => (
                              <img
                                key={`${visibleSelectedClaim.id}-evidence-${index}`}
                                src={image}
                                alt={`Photo evidence ${index + 1} submitted by ${visibleSelectedClaim.claimant}`}
                                loading="lazy"
                                className="aspect-square w-full rounded-lg bg-neutral-50 object-contain"
                              />
                            ))}
                          </dd>
                        </div>
                      )}
                  </dl>
                </section>
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


export default AdminDashboardPage;
