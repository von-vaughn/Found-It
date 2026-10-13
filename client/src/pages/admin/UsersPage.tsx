import { useMemo, useState } from "react";
import { Check, ChevronLeft, ChevronRight, Power } from "lucide-react";
import toast from "react-hot-toast";
import { Panel } from "@/components/admin/Panel";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { adminUsers } from "@/components/admin/adminData";
import type { AdminUser } from "@/components/admin/types";
import { AdminLayout } from "./AdminLayout";

const PAGE_SIZE = 10;

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function UsersPage() {
  const [users, setUsers] = useState<AdminUser[]>(adminUsers);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All statuses");
  const [currentPage, setCurrentPage] = useState(1);
  const [pendingUser, setPendingUser] = useState<AdminUser | null>(null);

  const filteredUsers = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    // Only school users are managed here — staff roles stay hidden.
    return users.filter((user) => {
      if (user.role !== "school_user") return false;
      if (
        statusFilter !== "All statuses" &&
        (user.isActive ? "Active" : "Inactive") !== statusFilter
      ) {
        return false;
      }
      if (!normalizedQuery) return true;
      return [user.name, user.email]
        .join(" ")
        .toLowerCase()
        .includes(normalizedQuery);
    });
  }, [query, statusFilter, users]);

  const pageCount = Math.max(1, Math.ceil(filteredUsers.length / PAGE_SIZE));
  const page = Math.min(currentPage, pageCount);
  const pageUsers = filteredUsers.slice(
    (page - 1) * PAGE_SIZE,
    page * PAGE_SIZE,
  );
  const rangeStart =
    filteredUsers.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(page * PAGE_SIZE, filteredUsers.length);

  const updateQuery = (value: string) => {
    setQuery(value);
    setCurrentPage(1);
  };

  const confirmStatusChange = () => {
    if (!pendingUser || pendingUser.role !== "school_user") return;
    const activating = !pendingUser.isActive;
    setUsers((current) =>
      current.map((user) =>
        user.id === pendingUser.id
          ? { ...user, isActive: activating }
          : user,
      ),
    );
    toast.success(
      activating
        ? `${pendingUser.name} has been activated.`
        : `${pendingUser.name} has been deactivated.`,
    );
    setPendingUser(null);
  };

  return (
    <AdminLayout
      activeSection="users"
      showSearch
      query={query}
      onQueryChange={updateQuery}
      searchPlaceholder="Search users by name or email…"
    >
      <Panel
        title="Campus users"
        action={
          <span className="text-xs text-neutral-500 dark:text-neutral-400">
            {filteredUsers.length} users
          </span>
        }
      >
        <div className="flex flex-col gap-3 border-b border-neutral-100 dark:border-neutral-800 px-4 py-3 sm:flex-row sm:flex-wrap sm:items-center sm:px-5">
          <div className="flex flex-wrap gap-2">
            <label className="sr-only" htmlFor="user-status-filter">
              Filter by status
            </label>
            <select
              id="user-status-filter"
              name="user-status"
              value={statusFilter}
              onChange={(event) => {
                setStatusFilter(event.target.value);
                setCurrentPage(1);
              }}
              className="h-9 rounded-md border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 px-2.5 text-xs text-neutral-700 dark:text-neutral-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5192D]"
            >
              <option>All statuses</option>
              <option>Active</option>
              <option>Inactive</option>
            </select>
          </div>
        </div>

        {pageUsers.length === 0 ? (
          <div className="flex min-h-[680px] items-center justify-center px-5 py-10">
            <p className="text-center text-sm text-neutral-500 dark:text-neutral-400">
              No users match these filters.
            </p>
          </div>
        ) : (
          <div className="min-h-[680px] overflow-x-auto">
            <table className="w-full min-w-[960px] text-left text-xs">
              <thead className="bg-neutral-50 dark:bg-neutral-800 text-[10px] font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                <tr>
                  <th scope="col" className="px-5 py-3">
                    User
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Email
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Status
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Joined
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Reports
                  </th>
                  <th scope="col" className="px-5 py-3">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                {pageUsers.map((user) => (
                  <tr key={user.id} className="text-neutral-700 dark:text-neutral-300">
                    <td className="px-5 py-3.5">
                      <div className="flex min-w-0 items-center gap-3">
                        <span
                          aria-hidden="true"
                          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-neutral-900 text-[11px] font-bold text-white"
                        >
                          {initials(user.name)}
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate font-semibold text-neutral-900 dark:text-neutral-100">
                            {user.name}
                          </span>
                        </span>
                      </div>
                    </td>
                    <td className="max-w-56 px-4 py-3.5">
                      <span className="block truncate">{user.email}</span>
                    </td>
                    <td className="px-4 py-3.5">
                      <StatusBadge
                        status={user.isActive ? "Active" : "Inactive"}
                      />
                    </td>
                    <td className="whitespace-nowrap px-4 py-3.5">
                      {user.joined}
                    </td>
                    <td className="px-4 py-3.5 tabular-nums">
                      {user.reportCount}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex justify-end">
                        {user.isActive ? (
                          <button
                            type="button"
                            onClick={() => setPendingUser(user)}
                            aria-label={`Deactivate ${user.name}`}
                            className="inline-flex h-8 items-center gap-1.5 rounded-md border border-red-200 px-3 text-[11px] font-semibold text-red-700 transition-colors hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5192D]"
                          >
                            <Power
                              className="h-3 w-3"
                              aria-hidden="true"
                            />
                            Deactivate
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setPendingUser(user)}
                            aria-label={`Activate ${user.name}`}
                            className="inline-flex h-8 items-center gap-1.5 rounded-md border border-neutral-200 dark:border-neutral-800 px-3 text-[11px] font-semibold text-neutral-700 dark:text-neutral-300 transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-800 hover:text-neutral-900 dark:hover:text-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5192D]"
                          >
                            <Check
                              className="h-3 w-3"
                              aria-hidden="true"
                            />
                            Activate
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex flex-col gap-3 border-t border-neutral-100 dark:border-neutral-800 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <p className="text-xs text-neutral-500 dark:text-neutral-400" aria-live="polite">
            Showing {rangeStart}–{rangeEnd} of {filteredUsers.length}
          </p>
          {pageCount > 1 && (
            <div className="flex items-center gap-1">
              <button
                type="button"
                aria-label="Previous page"
                disabled={page <= 1}
                onClick={() => setCurrentPage((value) => Math.max(1, value - 1))}
 className="flex h-7 w-7 items-center justify-center rounded-md text-neutral-500 dark:text-neutral-400 transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-neutral-900 dark:hover:text-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5192D] disabled:cursor-default disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-neutral-500"
              >
                <ChevronLeft className="h-4 w-4" aria-hidden="true" />
              </button>
              {Array.from({ length: pageCount }, (_, index) => (
                <button
                  key={index + 1}
                  type="button"
                  onClick={() => setCurrentPage(index + 1)}
                  aria-label={`Page ${index + 1}`}
                  aria-current={page === index + 1 ? "page" : undefined}
                  className={`h-7 min-w-7 rounded-md px-1.5 text-[11px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5192D] ${
                    page === index + 1
                      ? "bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900"
                      : "text-neutral-500 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-neutral-900 dark:hover:text-neutral-100"
                  }`}
                >
                  {index + 1}
                </button>
              ))}
              <button
                type="button"
                aria-label="Next page"
                disabled={page >= pageCount}
                onClick={() =>
                  setCurrentPage((value) => Math.min(pageCount, value + 1))
                }
 className="flex h-7 w-7 items-center justify-center rounded-md text-neutral-500 dark:text-neutral-400 transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-neutral-900 dark:hover:text-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5192D] disabled:cursor-default disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-neutral-500"
              >
                <ChevronRight className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          )}
        </div>
      </Panel>

      {pendingUser && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-neutral-950/50 p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setPendingUser(null);
          }}
        >
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="user-status-title"
            aria-describedby="user-status-description"
            className="w-full max-w-sm rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-5 shadow-xl"
          >
            <h2
              id="user-status-title"
              className="text-base font-bold text-neutral-900 dark:text-neutral-100"
            >
              {pendingUser.isActive ? "Deactivate user?" : "Activate user?"}
            </h2>
            <p
              id="user-status-description"
              className="mt-2 text-sm leading-relaxed text-neutral-600 dark:text-neutral-400"
            >
              {pendingUser.isActive ? (
                <>
                  <span className="font-semibold text-neutral-900 dark:text-neutral-100">
                    {pendingUser.name}
                  </span>{" "}
                  will lose access to FoundIt immediately and be signed out of
                  all sessions.
                </>
              ) : (
                <>
                  <span className="font-semibold text-neutral-900 dark:text-neutral-100">
                    {pendingUser.name}
                  </span>{" "}
                  will regain access to FoundIt.
                </>
              )}
            </p>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setPendingUser(null)}
                className="h-9 rounded-lg border border-neutral-200 dark:border-neutral-800 px-3.5 text-xs font-semibold text-neutral-700 dark:text-neutral-300 transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5192D] focus-visible:ring-offset-2"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmStatusChange}
                className={`h-9 rounded-lg px-3.5 text-xs font-semibold text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${
                  pendingUser.isActive
                    ? "bg-[#E5192D] hover:bg-[#c81424] focus-visible:ring-[#E5192D]"
                    : "bg-neutral-900 hover:bg-neutral-700 focus-visible:ring-neutral-900"
                }`}
              >
                {pendingUser.isActive ? "Deactivate" : "Activate"}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}

export default UsersPage;
