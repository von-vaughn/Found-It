import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  ChevronLeft,
  ChevronRight,
  MoreVertical,
} from "lucide-react";
import toast from "react-hot-toast";
import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { FadeIn } from "@/components/FadeIn";
import { LoadMoreButton } from "@/components/LoadMoreButton";
import { Panel } from "@/components/admin/Panel";
import { StatusBadge } from "@/components/admin/StatusBadge";
import type { AdminUser, AdminUserRole } from "@/components/admin/types";
import { useAuth } from "@/context/useAuth";
import {
  deleteAdminUser,
  listAdminUsersPage,
  updateAdminUserRole,
  updateAdminUserStatus,
} from "@/services/adminUserService";
import { itemKeys } from "@/hooks/useItems";
import { claimKeys } from "@/hooks/useClaims";
import { returnKeys } from "@/hooks/useReturns";
import { AdminLayout } from "./AdminLayout";
import { roleLabel } from "./AdminAccountsManager";

const PAGE_SIZE = 10;
const ADMIN_USERS_QUERY_KEY = ["admin-users"] as const;

type RoleFilter = "school_user" | "staff" | "admin";

function initialRoleFromParam(rawTab: string | null, isAdmin: boolean): RoleFilter {
  if (!isAdmin) return "school_user";
  if (rawTab === "staff") return "staff";
  if (rawTab === "admin" || rawTab === "admins") return "admin";
  return "school_user";
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
  const isAdmin = currentUser?.role === "admin";
  const [searchParams] = useSearchParams();

  const usersQuery = useInfiniteQuery({
    queryKey: ADMIN_USERS_QUERY_KEY,
    initialPageParam: 0,
    queryFn: ({ pageParam }) =>
      listAdminUsersPage({ limit: 50, offset: pageParam }),
    getNextPageParam: (lastPage, allPages) => {
      if (!lastPage.hasMore) return undefined;
      return allPages.reduce((sum, page) => sum + page.users.length, 0);
    },
    staleTime: 30_000,
    retry: 1,
  });

  const invalidateUserDependents = () => {
    void queryClient.invalidateQueries({ queryKey: ADMIN_USERS_QUERY_KEY });
    void queryClient.invalidateQueries({ queryKey: ["audit-logs"] });
  };
  const invalidateDeletedOrDeactivatedDependents = () => {
    invalidateUserDependents();
    void queryClient.invalidateQueries({ queryKey: itemKeys.all });
    void queryClient.invalidateQueries({ queryKey: claimKeys.all });
    void queryClient.invalidateQueries({ queryKey: returnKeys.all });
  };

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      updateAdminUserStatus(id, isActive),
    onSuccess: invalidateDeletedOrDeactivatedDependents,
  });
  const updateRoleMutation = useMutation({
    mutationFn: ({ id, role }: { id: string; role: AdminUserRole }) =>
      updateAdminUserRole(id, role),
    onSuccess: invalidateUserDependents,
  });
  const deleteUserMutation = useMutation({
    mutationFn: deleteAdminUser,
    onSuccess: invalidateDeletedOrDeactivatedDependents,
  });

  const [roleFilter, setRoleFilter] = useState<RoleFilter>(() =>
    initialRoleFromParam(searchParams.get("tab"), isAdmin),
  );
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All statuses");
  const [currentPage, setCurrentPage] = useState(1);
  const [pendingUser, setPendingUser] = useState<AdminUser | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AdminUser | null>(null);
  const [openMenuUserId, setOpenMenuUserId] = useState<string | null>(null);
  const openMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!openMenuUserId) return;
    const handlePointerDown = (event: MouseEvent) => {
      if (
        openMenuRef.current &&
        !openMenuRef.current.contains(event.target as Node)
      ) {
        setOpenMenuUserId(null);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpenMenuUserId(null);
    };
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [openMenuUserId]);

  const activeRole: RoleFilter = isAdmin ? roleFilter : "school_user";
  const allUsers = useMemo(() => {
    const flattened: AdminUser[] = [];
    const seen = new Set<string>();
    for (const page of usersQuery.data?.pages ?? []) {
      for (const user of page.users) {
        if (!seen.has(user.id)) {
          seen.add(user.id);
          flattened.push(user);
        }
      }
    }
    return flattened;
  }, [usersQuery.data]);

  const schoolUsers = useMemo(
    () => allUsers.filter((u) => u.role === "school_user"),
    [allUsers],
  );
  const staffUsers = useMemo(
    () => allUsers.filter((u) => u.role === "staff"),
    [allUsers],
  );
  const adminUsers = useMemo(
    () => allUsers.filter((u) => u.role === "admin"),
    [allUsers],
  );

  const roleUsers =
    activeRole === "school_user"
      ? schoolUsers
      : activeRole === "staff"
        ? staffUsers
        : adminUsers;

  const filteredUsers = useMemo(() => {
    const q = query.trim().toLowerCase();
    return roleUsers.filter((user) => {
      if (
        statusFilter !== "All statuses" &&
        (user.isActive ? "Active" : "Inactive") !== statusFilter
      ) {
        return false;
      }
      if (!q) return true;
      return [user.name, user.email].join(" ").toLowerCase().includes(q);
    });
  }, [query, statusFilter, roleUsers]);

  const pageCount = Math.max(1, Math.ceil(filteredUsers.length / PAGE_SIZE));
  const page = Math.min(currentPage, pageCount);
  const pageUsers = filteredUsers.slice(
    (page - 1) * PAGE_SIZE,
    page * PAGE_SIZE,
  );
  const rangeStart =
    filteredUsers.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(page * PAGE_SIZE, filteredUsers.length);

  const handleRoleFilterChange = (nextRole: RoleFilter) => {
    setRoleFilter(nextRole);
    setCurrentPage(1);
    setPendingUser(null);
    setDeleteTarget(null);
  };

  const updateQuery = (value: string) => {
    setQuery(value);
    setCurrentPage(1);
  };

  const confirmStatusChange = async () => {
    if (!pendingUser) return;
    if (
      pendingUser.role === "admin" &&
      pendingUser.isActive &&
      allUsers.filter((u) => u.role === "admin" && u.isActive).length <= 1
    ) {
      toast.error("Cannot deactivate the last admin.");
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
    if (
      deleteTarget.role === "admin" &&
      allUsers.filter((u) => u.role === "admin").length <= 1
    ) {
      toast.error("Cannot delete the last admin.");
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

  const handleChangeRole = async (
    target: AdminUser,
    nextRole: AdminUserRole,
  ) => {
    if (
      target.role === "admin" &&
      nextRole !== "admin" &&
      allUsers.filter((u) => u.role === "admin").length <= 1
    ) {
      toast.error("Cannot demote the last admin.");
      return;
    }
    try {
      await updateRoleMutation.mutateAsync({ id: target.id, role: nextRole });
      toast.success(
        `${target.name} is now ${roleLabel(nextRole).toLowerCase()}.`,
      );
    } catch (error) {
      toast.error(
        errorMessage(error, "We couldn't change this account's role."),
      );
    }
  };

  const countLabel =
    activeRole === "school_user"
      ? `${filteredUsers.length} users`
      : activeRole === "staff"
        ? `${filteredUsers.length} staff`
        : `${filteredUsers.length} admins`;

  return (
    <AdminLayout
      activeSection="users"
      showSearch
      query={query}
      onQueryChange={updateQuery}
      searchPlaceholder="Search accounts by name or email…"
    >
      {usersQuery.isPending ? (
        <Panel title="User Management">
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
        <FadeIn delay={0.05}>
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
        </FadeIn>
      ) : (
        <FadeIn delay={0.05}>
          <Panel
            title="User Management"
            action={
              <span className="text-xs text-neutral-500 dark:text-neutral-400">
                {countLabel}
              </span>
            }
          >
            <div className="flex flex-col gap-3 border-b border-neutral-100 dark:border-neutral-800 px-4 py-3 sm:flex-row sm:flex-wrap sm:items-center sm:px-5">
              <div className="flex flex-wrap gap-2">
                {isAdmin && (
                  <>
                    <label className="sr-only" htmlFor="user-group-select">
                      Filter by role
                    </label>
                    <select
                      id="user-group-select"
                      name="user-group"
                      value={activeRole}
                      onChange={(event) =>
                        handleRoleFilterChange(event.target.value as RoleFilter)
                      }
                      className="h-9 rounded-md border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 px-2.5 text-xs font-medium text-neutral-700 dark:text-neutral-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5192D]"
                    >
                      <option value="school_user">
                        School Users ({schoolUsers.length})
                      </option>
                      <option value="staff">
                        Staff ({staffUsers.length})
                      </option>
                      <option value="admin">
                        Admins ({adminUsers.length})
                      </option>
                    </select>
                  </>
                )}
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
              <div className="flex min-h-[520px] items-center justify-center px-5 py-10">
                <p className="text-center text-sm text-neutral-500 dark:text-neutral-400">
                  No accounts match these filters.
                </p>
              </div>
            ) : (
              <div className="min-h-[520px] overflow-x-auto">
                <table className="w-full min-w-[920px] text-left text-xs">
                  <thead className="bg-neutral-50 dark:bg-neutral-800 text-[10px] font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                    <tr>
                      <th scope="col" className="px-5 py-3">
                        User
                      </th>
                      <th scope="col" className="px-4 py-3">
                        Email
                      </th>
                      <th scope="col" className="px-4 py-3">
                        Role
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
                    {pageUsers.map((user, index) => {
                      const menuOpen = openMenuUserId === user.id;
                      const openUpward =
                        pageUsers.length > 2 && index >= pageUsers.length - 2;
                      return (
                      <tr
                        key={user.id}
                        className="text-neutral-700 dark:text-neutral-300"
                      >
                        <td className="px-5 py-3.5">
                          <span className="block truncate font-semibold text-neutral-900 dark:text-neutral-100">
                            {user.name}
                          </span>
                        </td>
                        <td className="max-w-56 px-4 py-3.5">
                          <span className="block truncate">{user.email}</span>
                        </td>
                        <td className="px-4 py-3.5">
                          <span className="whitespace-nowrap">
                            {roleLabel(user.role)}
                          </span>
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
                          <div
                            className="relative flex justify-end"
                            ref={menuOpen ? openMenuRef : undefined}
                          >
                            <button
                              type="button"
                              aria-label={`Actions for ${user.name}`}
                              aria-haspopup="menu"
                              aria-expanded={menuOpen}
                              onClick={() =>
                                setOpenMenuUserId((current) =>
                                  current === user.id ? null : user.id,
                                )
                              }
                              className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5192D] dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-100"
                            >
                              <MoreVertical
                                className="h-4 w-4"
                                aria-hidden="true"
                              />
                            </button>

                            {menuOpen && (
                              <div
                                role="menu"
                                aria-label={`Actions for ${user.name}`}
                                className={`absolute right-0 z-30 w-48 rounded-xl border border-neutral-200 bg-white p-1.5 shadow-lg dark:border-neutral-800 dark:bg-neutral-900 ${
                                  openUpward
                                    ? "bottom-full mb-1"
                                    : "top-full mt-1"
                                }`}
                              >
                                {user.id !== currentUser?.id &&
                                  user.role === "school_user" && (
                                    <button
                                      type="button"
                                      role="menuitem"
                                      disabled={updateRoleMutation.isPending}
                                      onClick={() => {
                                        setOpenMenuUserId(null);
                                        void handleChangeRole(user, "staff");
                                      }}
                                      className="flex w-full items-center rounded-lg px-2.5 py-2 text-left text-xs font-medium text-neutral-700 transition-colors hover:bg-neutral-100 hover:text-neutral-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5192D] disabled:opacity-50 dark:text-neutral-300 dark:hover:bg-neutral-800 dark:hover:text-neutral-100"
                                    >
                                      Promote to Staff
                                    </button>
                                  )}
                                {user.id !== currentUser?.id &&
                                  user.role === "staff" && (
                                    <>
                                      <button
                                        type="button"
                                        role="menuitem"
                                        disabled={updateRoleMutation.isPending}
                                        onClick={() => {
                                          setOpenMenuUserId(null);
                                          void handleChangeRole(user, "admin");
                                        }}
                                        className="flex w-full items-center rounded-lg px-2.5 py-2 text-left text-xs font-medium text-neutral-700 transition-colors hover:bg-neutral-100 hover:text-neutral-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5192D] disabled:opacity-50 dark:text-neutral-300 dark:hover:bg-neutral-800 dark:hover:text-neutral-100"
                                      >
                                        Promote to Admin
                                      </button>
                                      <button
                                        type="button"
                                        role="menuitem"
                                        disabled={updateRoleMutation.isPending}
                                        onClick={() => {
                                          setOpenMenuUserId(null);
                                          void handleChangeRole(
                                            user,
                                            "school_user",
                                          );
                                        }}
                                        className="flex w-full items-center rounded-lg px-2.5 py-2 text-left text-xs font-medium text-neutral-700 transition-colors hover:bg-neutral-100 hover:text-neutral-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5192D] disabled:opacity-50 dark:text-neutral-300 dark:hover:bg-neutral-800 dark:hover:text-neutral-100"
                                      >
                                        Demote to School User
                                      </button>
                                    </>
                                  )}
                                {user.id !== currentUser?.id &&
                                  user.role === "admin" && (
                                    <button
                                      type="button"
                                      role="menuitem"
                                      disabled={updateRoleMutation.isPending}
                                      onClick={() => {
                                        setOpenMenuUserId(null);
                                        void handleChangeRole(user, "staff");
                                      }}
                                      className="flex w-full items-center rounded-lg px-2.5 py-2 text-left text-xs font-medium text-neutral-700 transition-colors hover:bg-neutral-100 hover:text-neutral-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5192D] disabled:opacity-50 dark:text-neutral-300 dark:hover:bg-neutral-800 dark:hover:text-neutral-100"
                                    >
                                      Demote to Staff
                                    </button>
                                  )}
                                <button
                                  type="button"
                                  role="menuitem"
                                  disabled={updateStatusMutation.isPending}
                                  onClick={() => {
                                    setOpenMenuUserId(null);
                                    setPendingUser(user);
                                  }}
                                  className="flex w-full items-center rounded-lg px-2.5 py-2 text-left text-xs font-medium text-neutral-700 transition-colors hover:bg-neutral-100 hover:text-neutral-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5192D] disabled:opacity-50 dark:text-neutral-300 dark:hover:bg-neutral-800 dark:hover:text-neutral-100"
                                >
                                  {user.isActive ? "Deactivate" : "Activate"}
                                </button>
                                <button
                                  type="button"
                                  role="menuitem"
                                  disabled={deleteUserMutation.isPending}
                                  onClick={() => {
                                    setOpenMenuUserId(null);
                                    setDeleteTarget(user);
                                  }}
                                  className="flex w-full items-center rounded-lg px-2.5 py-2 text-left text-xs font-semibold text-red-600 transition-colors hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5192D] disabled:opacity-50 dark:text-red-400 dark:hover:bg-red-500/10"
                                >
                                  Remove
                                </button>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            <div className="flex flex-col gap-3 border-t border-neutral-100 dark:border-neutral-800 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
              <p
                className="text-xs text-neutral-500 dark:text-neutral-400"
                aria-live="polite"
              >
                Showing {rangeStart}–{rangeEnd} of {filteredUsers.length}
                {usersQuery.hasNextPage ? "+" : ""}
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <LoadMoreButton
                  hasMore={Boolean(usersQuery.hasNextPage)}
                  isLoading={usersQuery.isFetchingNextPage}
                  onLoadMore={() => void usersQuery.fetchNextPage()}
                  label="Load more users"
                  compact
                  className="py-0"
                />
              {pageCount > 1 && (
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    aria-label="Previous page"
                    disabled={page <= 1}
                    onClick={() =>
                      setCurrentPage((value) => Math.max(1, value - 1))
                    }
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
            </div>
          </Panel>
        </FadeIn>
      )}

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
              {pendingUser.isActive
                ? "Deactivate account?"
                : "Activate account?"}
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
                disabled={updateStatusMutation.isPending}
                className="h-9 rounded-lg border border-neutral-200 dark:border-neutral-800 px-3.5 text-xs font-semibold text-neutral-700 dark:text-neutral-300 transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5192D] focus-visible:ring-offset-2"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void confirmStatusChange()}
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

      {deleteTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-neutral-950/50 p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setDeleteTarget(null);
          }}
        >
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="user-delete-title"
            aria-describedby="user-delete-description"
            className="w-full max-w-sm rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-5 shadow-xl"
          >
            <h2
              id="user-delete-title"
              className="text-base font-bold text-neutral-900 dark:text-neutral-100"
            >
              Remove this account?
            </h2>
            <p
              id="user-delete-description"
              className="mt-2 text-sm leading-relaxed text-neutral-600 dark:text-neutral-400"
            >
              This permanently removes{" "}
              <span className="font-semibold text-neutral-900 dark:text-neutral-100">
                {deleteTarget.email}
              </span>{" "}
              from FoundIt. This action cannot be undone.
            </p>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                disabled={deleteUserMutation.isPending}
                className="h-9 rounded-lg border border-neutral-200 dark:border-neutral-800 px-3.5 text-xs font-semibold text-neutral-700 dark:text-neutral-300 transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5192D] focus-visible:ring-offset-2 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void confirmDelete()}
                disabled={deleteUserMutation.isPending}
                className="h-9 rounded-lg bg-[#E5192D] px-3.5 text-xs font-semibold text-white transition-colors hover:bg-[#c81424] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5192D] focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-50"
              >
                {deleteUserMutation.isPending ? "Removing…" : "Remove account"}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}

export default UsersPage;
