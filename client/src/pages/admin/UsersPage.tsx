import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Check, ChevronLeft, ChevronRight, Power } from "lucide-react";
import toast from "react-hot-toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Panel } from "@/components/admin/Panel";
import { StatusBadge } from "@/components/admin/StatusBadge";
import type { AdminUser, AdminUserRole } from "@/components/admin/types";
import { useAuth } from "@/context/useAuth";
import {
  createAdminUser,
  deleteAdminUser,
  listAdminUsers,
  updateAdminUserRole,
  updateAdminUserStatus,
} from "@/services/adminUserService";
import { AdminLayout } from "./AdminLayout";
import { AdminAccountsManager, roleLabel } from "./AdminAccountsManager";

const PAGE_SIZE = 10;
const ADMIN_USERS_QUERY_KEY = ["admin-users"] as const;

type UsersTab = "school" | "admins";

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function errorMessage(error: unknown, fallback: string): string {
  const responseMessage = (
    error as { response?: { data?: { message?: string } } }
  )?.response?.data?.message;
  return responseMessage ?? (error instanceof Error ? error.message : fallback);
}

export function UsersPage() {
  const queryClient = useQueryClient();
  const { user: currentUser } = useAuth();
  const isSuperAdmin = currentUser?.role === "super_admin";
  const usersQuery = useQuery({
    queryKey: ADMIN_USERS_QUERY_KEY,
    queryFn: listAdminUsers,
    staleTime: 30_000,
    retry: 1,
  });
  const createUserMutation = useMutation({
    mutationFn: createAdminUser,
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ADMIN_USERS_QUERY_KEY }),
  });
  const updateStatusMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      updateAdminUserStatus(id, isActive),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ADMIN_USERS_QUERY_KEY }),
  });
  const updateRoleMutation = useMutation({
    mutationFn: ({ id, role }: { id: string; role: AdminUserRole }) =>
      updateAdminUserRole(id, role),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ADMIN_USERS_QUERY_KEY }),
  });
  const deleteUserMutation = useMutation({
    mutationFn: deleteAdminUser,
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ADMIN_USERS_QUERY_KEY }),
  });
  const [searchParams, setSearchParams] = useSearchParams();
  // Tab is derived from the URL so deep links (e.g. /admin/admins redirect) work.
  // Only a super admin can open the staff tab; anyone else is pinned to campus users.
  const tab: UsersTab =
    isSuperAdmin && searchParams.get("tab") === "admins" ? "admins" : "school";
  const allUsers = useMemo(() => usersQuery.data ?? [], [usersQuery.data]);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All statuses");
  const [currentPage, setCurrentPage] = useState(1);
  const [pendingUser, setPendingUser] = useState<AdminUser | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AdminUser | null>(null);

  const switchTab = (next: UsersTab) => {
    setCurrentPage(1);
    setPendingUser(null);
    setDeleteTarget(null);
    setSearchParams(next === "admins" ? { tab: "admins" } : {}, { replace: true });
  };

  const schoolUsers = useMemo(() => allUsers.filter((u) => u.role === "school_user"), [allUsers]);
  const staffUsers = useMemo(() => allUsers.filter((u) => u.role !== "school_user"), [allUsers]);

  const filteredSchoolUsers = useMemo(() => {
    const q = query.trim().toLowerCase();
    return schoolUsers.filter((user) => {
      if (statusFilter !== "All statuses" && (user.isActive ? "Active" : "Inactive") !== statusFilter) {
        return false;
      }
      if (!q) return true;
      return [user.name, user.email].join(" ").toLowerCase().includes(q);
    });
  }, [query, statusFilter, schoolUsers]);

  const pageCount = Math.max(1, Math.ceil(filteredSchoolUsers.length / PAGE_SIZE));
  const page = Math.min(currentPage, pageCount);
  const pageUsers = filteredSchoolUsers.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const rangeStart = filteredSchoolUsers.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(page * PAGE_SIZE, filteredSchoolUsers.length);

  const updateQuery = (value: string) => {
    setQuery(value);
    setCurrentPage(1);
  };

  const isStaffTarget = (user: AdminUser | null) => user !== null && user.role !== "school_user";

  const handleStatusClick = (user: AdminUser) => setPendingUser(user);

  const confirmStatusChange = async () => {
    if (!pendingUser) return;
    if (
      pendingUser.role === "super_admin" &&
      !pendingUser.isActive === false &&
      allUsers.filter((u) => u.role === "super_admin" && u.isActive).length <= 1
    ) {
      toast.error("Cannot deactivate the last super admin.");
      setPendingUser(null);
      return;
    }
    const activating = !pendingUser.isActive;
    try {
      await updateStatusMutation.mutateAsync({
        id: pendingUser.id,
        isActive: activating,
      });
      toast.success(
        activating
          ? `${pendingUser.name} has been activated.`
          : `${pendingUser.name} has been deactivated.`,
      );
      setPendingUser(null);
    } catch (error) {
      toast.error(errorMessage(error, "We couldn't update this account."));
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    if (deleteTarget.role === "super_admin" && allUsers.filter((u) => u.role === "super_admin").length <= 1) {
      toast.error("Cannot delete the last super admin.");
      setDeleteTarget(null);
      return;
    }
    try {
      await deleteUserMutation.mutateAsync(deleteTarget.id);
      toast.success(`${deleteTarget.name} has been removed.`);
      setDeleteTarget(null);
    } catch (error) {
      toast.error(errorMessage(error, "We couldn't remove this account."));
    }
  };

  const handleToggleRole = async (target: AdminUser) => {
    if (target.role === "super_admin" && allUsers.filter((u) => u.role === "super_admin").length <= 1) {
      toast.error("Cannot demote the last super admin.");
      return;
    }
    const nextRole: AdminUserRole = target.role === "admin" ? "super_admin" : "admin";
    try {
      await updateRoleMutation.mutateAsync({ id: target.id, role: nextRole });
      toast.success(`${target.name} is now ${roleLabel(nextRole).toLowerCase()}.`);
    } catch (error) {
      toast.error(errorMessage(error, "We couldn't change this account's role."));
    }
  };

  const handleCreateStaff = async (values: Parameters<typeof createAdminUser>[0]) => {
    await createUserMutation.mutateAsync(values);
  };

  // Staff dialogs are rendered inside AdminAccountsManager; school-user dialog lives here.
  const showSchoolDialog = pendingUser !== null && !isStaffTarget(pendingUser) && tab === "school";

  return (
    <AdminLayout
      activeSection="users"
      showSearch
      query={query}
      onQueryChange={updateQuery}
      searchPlaceholder={
        tab === "admins" ? "Search admins by name or email…" : "Search users by name or email…"
      }
    >
      {isSuperAdmin && (
        <div className="mb-4 flex flex-wrap items-center gap-2" role="tablist" aria-label="User groups">
          <button
            type="button"
            role="tab"
            aria-selected={tab === "school"}
            onClick={() => switchTab("school")}
            className={`h-9 rounded-lg px-3.5 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5192D] ${
              tab === "school" ? "bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900" : "border border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800"
            }`}
          >
            Campus users ({schoolUsers.length})
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === "admins"}
            onClick={() => switchTab("admins")}
            className={`h-9 rounded-lg px-3.5 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5192D] ${
              tab === "admins" ? "bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900" : "border border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800"
            }`}
          >
            Admin accounts ({staffUsers.length})
          </button>
        </div>
      )}

      {usersQuery.isPending ? (
        <Panel title={tab === "school" ? "Campus users" : "Admin accounts"}>
          <div
            className="flex min-h-[400px] items-center justify-center px-5 py-10"
            role="status"
            aria-label="Loading accounts"
          >
            <div className="w-full max-w-2xl space-y-4" aria-hidden="true">
              <div className="h-4 w-40 animate-pulse rounded bg-neutral-200 dark:bg-neutral-800" />
              <div className="space-y-3">
                {Array.from({ length: 5 }, (_, index) => (
                  <div
                    key={index}
                    className="h-10 animate-pulse rounded-lg bg-neutral-100 dark:bg-neutral-900"
                  />
                ))}
              </div>
            </div>
          </div>
        </Panel>
      ) : usersQuery.isError ? (
        <Panel title="Unable to load accounts">
          <div className="flex min-h-[400px] flex-col items-center justify-center gap-3 px-5 py-10 text-center">
            <p className="text-sm text-red-700 dark:text-red-400" role="alert">
              {errorMessage(usersQuery.error, "We couldn't load accounts.")}
            </p>
            <button
              type="button"
              onClick={() => void usersQuery.refetch()}
              className="h-9 rounded-lg border border-neutral-200 dark:border-neutral-800 px-3.5 text-xs font-semibold text-neutral-700 dark:text-neutral-300 transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5192D]"
            >
              Try again
            </button>
          </div>
        </Panel>
      ) : tab === "school" ? (
        <Panel
          title="Campus users"
          action={<span className="text-xs text-neutral-500 dark:text-neutral-400">{filteredSchoolUsers.length} users</span>}
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
              <p className="text-center text-sm text-neutral-500 dark:text-neutral-400">No users match these filters.</p>
            </div>
          ) : (
            <div className="min-h-[680px] overflow-x-auto">
              <table className="w-full min-w-[960px] text-left text-xs">
                <thead className="bg-neutral-50 dark:bg-neutral-800 text-[10px] font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                  <tr>
                    <th scope="col" className="px-5 py-3">User</th>
                    <th scope="col" className="px-4 py-3">Email</th>
                    <th scope="col" className="px-4 py-3">Status</th>
                    <th scope="col" className="px-4 py-3">Joined</th>
                    <th scope="col" className="px-4 py-3">Reports</th>
                    <th scope="col" className="px-5 py-3"><span className="sr-only">Actions</span></th>
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
                            <span className="block truncate font-semibold text-neutral-900 dark:text-neutral-100">{user.name}</span>
                          </span>
                        </div>
                      </td>
                      <td className="max-w-56 px-4 py-3.5">
                        <span className="block truncate">{user.email}</span>
                      </td>
                      <td className="px-4 py-3.5">
                        <StatusBadge status={user.isActive ? "Active" : "Inactive"} />
                      </td>
                      <td className="whitespace-nowrap px-4 py-3.5">{user.joined}</td>
                      <td className="px-4 py-3.5 tabular-nums">{user.reportCount}</td>
                      <td className="px-5 py-3.5">
                        <div className="flex justify-end">
                          {user.isActive ? (
                            <button
                              type="button"
                              onClick={() => handleStatusClick(user)}
                              disabled={updateStatusMutation.isPending}
                              aria-label={`Deactivate ${user.name}`}
                              className="inline-flex h-8 items-center gap-1.5 rounded-md border border-red-200 dark:border-red-500/30 px-3 text-[11px] font-semibold text-red-700 dark:text-red-400 transition-colors hover:bg-red-50 dark:hover:bg-red-500/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5192D]"
                            >
                              <Power className="h-3 w-3" aria-hidden="true" />
                              Deactivate
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleStatusClick(user)}
                              disabled={updateStatusMutation.isPending}
                              aria-label={`Activate ${user.name}`}
                              className="inline-flex h-8 items-center gap-1.5 rounded-md border border-neutral-200 dark:border-neutral-800 px-3 text-[11px] font-semibold text-neutral-700 dark:text-neutral-300 transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-800 hover:text-neutral-900 dark:hover:text-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5192D]"
                            >
                              <Check className="h-3 w-3" aria-hidden="true" />
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
              Showing {rangeStart}–{rangeEnd} of {filteredSchoolUsers.length}
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
                  onClick={() => setCurrentPage((value) => Math.min(pageCount, value + 1))}
                  className="flex h-7 w-7 items-center justify-center rounded-md text-neutral-500 dark:text-neutral-400 transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-neutral-900 dark:hover:text-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5192D] disabled:cursor-default disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-neutral-500"
                >
                  <ChevronRight className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            )}
          </div>
        </Panel>
      ) : (
        <AdminAccountsManager
          staff={staffUsers}
          query={query}
          onCreateStaff={handleCreateStaff}
          onStatusChange={handleStatusClick}
          onDelete={(user) => setDeleteTarget(user)}
          onToggleRole={handleToggleRole}
          pendingUser={isStaffTarget(pendingUser) ? pendingUser : null}
          deleteTarget={deleteTarget}
          onPendingChange={setPendingUser}
          onDeleteTargetChange={setDeleteTarget}
          onConfirmStatusChange={confirmStatusChange}
          onConfirmDelete={confirmDelete}
          isSavingStatus={updateStatusMutation.isPending}
          isSavingRole={updateRoleMutation.isPending}
          isSavingDelete={deleteUserMutation.isPending}
        />
      )}

      {showSchoolDialog && pendingUser && (
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
            <h2 id="user-status-title" className="text-base font-bold text-neutral-900 dark:text-neutral-100">
              {pendingUser.isActive ? "Deactivate user?" : "Activate user?"}
            </h2>
            <p id="user-status-description" className="mt-2 text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">
              {pendingUser.isActive ? (
                <>
                  <span className="font-semibold text-neutral-900 dark:text-neutral-100">{pendingUser.name}</span> will lose
                  access to FoundIt immediately and be signed out of all sessions.
                </>
              ) : (
                <>
                  <span className="font-semibold text-neutral-900 dark:text-neutral-100">{pendingUser.name}</span> will regain
                  access to FoundIt.
                </>
              )}
            </p>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setPendingUser(null)}
                disabled={updateStatusMutation.isPending}
                className="h-9 rounded-lg border border-neutral-200 dark:border-neutral-800 px-3.5 text-xs font-semibold text-neutral-700 dark:text-neutral-300 transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5192D] focus-visible:ring-offset-2"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmStatusChange}
                disabled={updateStatusMutation.isPending}
                className={`h-9 rounded-lg px-3.5 text-xs font-semibold text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${
                  pendingUser.isActive
                    ? "bg-[#E5192D] hover:bg-[#c81424] focus-visible:ring-[#E5192D]"
                    : "bg-neutral-900 hover:bg-neutral-700 focus-visible:ring-neutral-900"
                }`}
              >
                {updateStatusMutation.isPending
                  ? "Saving…"
                  : pendingUser.isActive
                    ? "Deactivate"
                    : "Activate"}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}

export default UsersPage;
