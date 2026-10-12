/* eslint-disable react-refresh/only-export-components -- shared manager + helpers live together */
import { useMemo, useState } from "react";
import { Check, ChevronLeft, ChevronRight, Plus, Power, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Panel } from "@/components/admin/Panel";
import { StatusBadge } from "@/components/admin/StatusBadge";
import type { AdminUser, AdminUserRole } from "@/components/admin/types";

const PAGE_SIZE = 10;

const createAdminSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(100),
  email: z.string().trim().toLowerCase().email("Enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters").max(128),
  role: z.enum(["admin", "super_admin"]),
});

export type CreateAdminValues = z.infer<typeof createAdminSchema>;

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function roleLabel(role: AdminUserRole): string {
  if (role === "super_admin") return "Super admin";
  if (role === "admin") return "Admin";
  return "School user";
}

interface AdminAccountsManagerProps {
  staff: AdminUser[];
  query: string;
  onCreateStaff: (entry: AdminUser, values: CreateAdminValues) => void;
  onStatusChange: (user: AdminUser) => void;
  onDelete: (user: AdminUser) => void;
  onToggleRole: (user: AdminUser) => void;
  pendingUser: AdminUser | null;
  deleteTarget: AdminUser | null;
  onPendingChange: (user: AdminUser | null) => void;
  onDeleteTargetChange: (user: AdminUser | null) => void;
  onConfirmStatusChange: () => void;
  onConfirmDelete: () => void;
}

export function AdminAccountsManager({
  staff,
  query,
  onCreateStaff,
  pendingUser,
  deleteTarget,
  onPendingChange,
  onDeleteTargetChange,
  onConfirmStatusChange,
  onConfirmDelete,
  onStatusChange,
  onDelete,
  onToggleRole,
}: AdminAccountsManagerProps) {
  const [statusFilter, setStatusFilter] = useState("All statuses");
  const [roleFilter, setRoleFilter] = useState("All roles");
  const [currentPage, setCurrentPage] = useState(1);
  const [createOpen, setCreateOpen] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<CreateAdminValues>({
    defaultValues: { name: "", email: "", password: "", role: "admin" },
  });

  const filteredStaff = useMemo(() => {
    const q = query.trim().toLowerCase();
    return staff.filter((user) => {
      if (
        statusFilter !== "All statuses" &&
        (user.isActive ? "Active" : "Inactive") !== statusFilter
      ) {
        return false;
      }
      if (roleFilter !== "All roles" && roleLabel(user.role) !== roleFilter) {
        return false;
      }
      if (!q) return true;
      return [user.name, user.email, user.id].join(" ").toLowerCase().includes(q);
    });
  }, [query, roleFilter, statusFilter, staff]);

  const pageCount = Math.max(1, Math.ceil(filteredStaff.length / PAGE_SIZE));
  const page = Math.min(currentPage, pageCount);
  const pageStaff = filteredStaff.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const rangeStart = filteredStaff.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(page * PAGE_SIZE, filteredStaff.length);

  const onCreate = (rawValues: CreateAdminValues) => {
    const parsed = createAdminSchema.safeParse(rawValues);
    if (!parsed.success) {
      const first = parsed.error.issues[0];
      const field = String(first.path[0] ?? "name") as keyof CreateAdminValues;
      setError(field, { message: first.message });
      return;
    }
    const values = parsed.data;
    if (staff.some((u) => u.email.toLowerCase() === values.email.toLowerCase())) {
      setError("email", { message: "An account with this email already exists." });
      return;
    }
    const entry: AdminUser = {
      // eslint-disable-next-line react-hooks/purity -- event handler, not render
      id: `USR-${Math.floor(1000 + Math.random() * 9000)}-${Date.now().toString().slice(-4)}`,
      name: values.name.trim(),
      email: values.email.trim().toLowerCase(),
      role: values.role,
      isActive: true,
      joined: new Intl.DateTimeFormat("en", {
        month: "short",
        day: "numeric",
        year: "numeric",
      }).format(new Date()),
      reportCount: 0,
    };
    onCreateStaff(entry, values);
    void createStaffOnServer(values).catch(() => undefined);
    toast.success(`${entry.name} created as ${roleLabel(entry.role).toLowerCase()}.`);
    reset();
    setCreateOpen(false);
    setCurrentPage(1);
  };

  return (
    <>
      <Panel
        title="Admin accounts"
        action={
          <div className="flex items-center gap-2">
            <span className="text-xs text-neutral-500">{filteredStaff.length} staff</span>
            <button
              type="button"
              onClick={() => setCreateOpen(true)}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[#E5192D] px-3 text-xs font-semibold text-white transition-colors hover:bg-[#c81424] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5192D] focus-visible:ring-offset-2"
            >
              <Plus className="h-3.5 w-3.5" aria-hidden="true" />
              Create admin
            </button>
          </div>
        }
      >
        <div className="flex flex-col gap-3 border-b border-neutral-100 px-4 py-3 sm:flex-row sm:flex-wrap sm:items-center sm:px-5">
          <div className="flex flex-wrap gap-2">
            <label className="sr-only" htmlFor="staff-status-filter">
              Filter by status
            </label>
            <select
              id="staff-status-filter"
              value={statusFilter}
              onChange={(event) => {
                setStatusFilter(event.target.value);
                setCurrentPage(1);
              }}
              className="h-9 rounded-md border border-neutral-200 bg-white px-2.5 text-xs text-neutral-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5192D]"
            >
              <option>All statuses</option>
              <option>Active</option>
              <option>Inactive</option>
            </select>
            <label className="sr-only" htmlFor="staff-role-filter">
              Filter by role
            </label>
            <select
              id="staff-role-filter"
              value={roleFilter}
              onChange={(event) => {
                setRoleFilter(event.target.value);
                setCurrentPage(1);
              }}
              className="h-9 rounded-md border border-neutral-200 bg-white px-2.5 text-xs text-neutral-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5192D]"
            >
              <option>All roles</option>
              <option>Admin</option>
              <option>Super admin</option>
            </select>
          </div>
        </div>

        {pageStaff.length === 0 ? (
          <div className="flex min-h-[400px] items-center justify-center px-5 py-10">
            <p className="text-center text-sm text-neutral-500">
              No admin accounts match these filters.
            </p>
          </div>
        ) : (
          <div className="min-h-[400px] overflow-x-auto">
            <table className="w-full min-w-[980px] text-left text-xs">
              <thead className="bg-neutral-50 text-[10px] font-bold uppercase tracking-wider text-neutral-500">
                <tr>
                  <th scope="col" className="px-5 py-3">Admin</th>
                  <th scope="col" className="px-4 py-3">Role</th>
                  <th scope="col" className="px-4 py-3">Status</th>
                  <th scope="col" className="px-4 py-3">Joined</th>
                  <th scope="col" className="px-4 py-3">Reports</th>
                  <th scope="col" className="px-5 py-3"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {pageStaff.map((admin) => (
                  <tr key={admin.id} className="text-neutral-700">
                    <td className="px-5 py-3.5">
                      <div className="flex min-w-0 items-center gap-3">
                        <span
                          aria-hidden="true"
                          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-neutral-900 text-[11px] font-bold text-white"
                        >
                          {initials(admin.name)}
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate font-semibold text-neutral-900">
                            {admin.name}
                          </span>
                          <span className="block truncate text-[11px] text-neutral-500">
                            {admin.email}
                          </span>
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <button
                        type="button"
                        title="Toggle admin / super admin role"
                        onClick={() => onToggleRole(admin)}
                        className="rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5192D]"
                      >
                        <StatusBadge status={roleLabel(admin.role)} />
                      </button>
                    </td>
                    <td className="px-4 py-3.5">
                      <StatusBadge status={admin.isActive ? "Active" : "Inactive"} />
                    </td>
                    <td className="whitespace-nowrap px-4 py-3.5">{admin.joined}</td>
                    <td className="px-4 py-3.5 tabular-nums">{admin.reportCount}</td>
                    <td className="px-5 py-3.5">
                      <div className="flex justify-end gap-2">
                        {admin.isActive ? (
                          <button
                            type="button"
                            onClick={() => onStatusChange(admin)}
                            aria-label={`Deactivate ${admin.name}`}
                            className="inline-flex h-8 items-center gap-1.5 rounded-md border border-red-200 px-3 text-[11px] font-semibold text-red-700 transition-colors hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5192D]"
                          >
                            <Power className="h-3 w-3" aria-hidden="true" />
                            Deactivate
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => onStatusChange(admin)}
                            aria-label={`Activate ${admin.name}`}
                            className="inline-flex h-8 items-center gap-1.5 rounded-md border border-neutral-200 px-3 text-[11px] font-semibold text-neutral-700 transition-colors hover:bg-neutral-50 hover:text-neutral-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5192D]"
                          >
                            <Check className="h-3 w-3" aria-hidden="true" />
                            Activate
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => onDelete(admin)}
                          aria-label={`Remove ${admin.name}`}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-neutral-200 text-neutral-500 transition-colors hover:bg-red-50 hover:text-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5192D]"
                        >
                          <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex flex-col gap-3 border-t border-neutral-100 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <p className="text-xs text-neutral-500" aria-live="polite">
            Showing {rangeStart}–{rangeEnd} of {filteredStaff.length}
          </p>
          {pageCount > 1 && (
            <div className="flex items-center gap-1">
              <button
                type="button"
                aria-label="Previous page"
                disabled={page <= 1}
                onClick={() => setCurrentPage((value) => Math.max(1, value - 1))}
                className="flex h-7 w-7 items-center justify-center rounded-md text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5192D] disabled:cursor-default disabled:opacity-40"
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
                      ? "bg-neutral-900 text-white"
                      : "text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900"
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
                className="flex h-7 w-7 items-center justify-center rounded-md text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5192D] disabled:cursor-default disabled:opacity-40"
              >
                <ChevronRight className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          )}
        </div>
      </Panel>

      {createOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-neutral-950/50 p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setCreateOpen(false);
          }}
        >
          <form
            onSubmit={handleSubmit(onCreate)}
            className="w-full max-w-md rounded-xl border border-neutral-200 bg-white p-5 shadow-xl"
          >
            <h2 className="text-base font-bold text-neutral-900">Create admin account</h2>
            <p className="mt-1 text-xs leading-relaxed text-neutral-500">
              New admins are active immediately and can review claims and returns.
            </p>
            <div className="mt-4 space-y-3">
              <div>
                <label htmlFor="staff-name" className="mb-1 block text-xs font-semibold text-neutral-700">
                  Full name
                </label>
                <input
                  id="staff-name"
                  type="text"
                  autoComplete="name"
                  placeholder="e.g. OSA Officer"
                  {...register("name")}
                  className="h-10 w-full rounded-lg border border-neutral-200 px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5192D]"
                />
                {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name.message}</p>}
              </div>
              <div>
                <label htmlFor="staff-email" className="mb-1 block text-xs font-semibold text-neutral-700">
                  Email
                </label>
                <input
                  id="staff-email"
                  type="email"
                  autoComplete="email"
                  placeholder="admin@wmsu.edu.ph"
                  {...register("email")}
                  className="h-10 w-full rounded-lg border border-neutral-200 px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5192D]"
                />
                {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="staff-password" className="mb-1 block text-xs font-semibold text-neutral-700">
                    Password
                  </label>
                  <input
                    id="staff-password"
                    type="password"
                    autoComplete="new-password"
                    placeholder="Min. 8 characters"
                    {...register("password")}
                    className="h-10 w-full rounded-lg border border-neutral-200 px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5192D]"
                  />
                  {errors.password && <p className="mt-1 text-xs text-red-600">{errors.password.message}</p>}
                </div>
                <div>
                  <label htmlFor="staff-role" className="mb-1 block text-xs font-semibold text-neutral-700">
                    Role
                  </label>
                  <select
                    id="staff-role"
                    {...register("role")}
                    className="h-10 w-full rounded-lg border border-neutral-200 bg-white px-2.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5192D]"
                  >
                    <option value="admin">Admin</option>
                    <option value="super_admin">Super admin</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setCreateOpen(false);
                  reset();
                }}
                className="h-9 rounded-lg border border-neutral-200 px-3.5 text-xs font-semibold text-neutral-700 transition-colors hover:bg-neutral-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5192D]"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="h-9 rounded-lg bg-[#E5192D] px-3.5 text-xs font-semibold text-white transition-colors hover:bg-[#c81424] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5192D] focus-visible:ring-offset-2 disabled:opacity-60"
              >
                {isSubmitting ? "Creating…" : "Create account"}
              </button>
            </div>
          </form>
        </div>
      )}

      {pendingUser && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-neutral-950/50 p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) onPendingChange(null);
          }}
        >
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="staff-status-title"
            className="w-full max-w-sm rounded-xl border border-neutral-200 bg-white p-5 shadow-xl"
          >
            <h2 id="staff-status-title" className="text-base font-bold text-neutral-900">
              {pendingUser.isActive ? "Deactivate admin?" : "Activate admin?"}
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-neutral-600">
              <span className="font-semibold text-neutral-900">{pendingUser.name}</span>{" "}
              {pendingUser.isActive
                ? "will lose access immediately and be signed out."
                : "will regain access to the admin workspace."}
            </p>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => onPendingChange(null)}
                className="h-9 rounded-lg border border-neutral-200 px-3.5 text-xs font-semibold text-neutral-700 hover:bg-neutral-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={onConfirmStatusChange}
                className={`h-9 rounded-lg px-3.5 text-xs font-semibold text-white ${
                  pendingUser.isActive
                    ? "bg-[#E5192D] hover:bg-[#c81424]"
                    : "bg-neutral-900 hover:bg-neutral-700"
                }`}
              >
                {pendingUser.isActive ? "Deactivate" : "Activate"}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-neutral-950/50 p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) onDeleteTargetChange(null);
          }}
        >
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="staff-delete-title"
            className="w-full max-w-sm rounded-xl border border-neutral-200 bg-white p-5 shadow-xl"
          >
            <h2 id="staff-delete-title" className="text-base font-bold text-neutral-900">
              Remove admin?
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-neutral-600">
              <span className="font-semibold text-neutral-900">{deleteTarget.name}</span> will
              be permanently removed from staff. This cannot be undone.
            </p>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => onDeleteTargetChange(null)}
                className="h-9 rounded-lg border border-neutral-200 px-3.5 text-xs font-semibold text-neutral-700 hover:bg-neutral-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={onConfirmDelete}
                className="h-9 rounded-lg bg-[#E5192D] px-3.5 text-xs font-semibold text-white hover:bg-[#c81424]"
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

async function createStaffOnServer(values: CreateAdminValues): Promise<void> {
  const env = (import.meta as unknown as { env?: Record<string, string | undefined> }).env;
  const baseUrl = env?.VITE_API_URL ?? "";
  const token = localStorage.getItem("foundit_access_token");
  if (!baseUrl || !token) return;
  const res = await fetch(`${baseUrl.replace(/\/$/, "")}/api/users`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(values),
  });
  if (!res.ok) {
    const data = (await res.json().catch(() => null)) as { message?: string } | null;
    throw new Error(data?.message ?? "Failed to create admin on server.");
  }
}
