import api from "@/lib/api";
import type { AdminUser, AdminUserRole } from "@/components/admin/types";

interface ServerAdminUser {
  id: string;
  name: string;
  email: string;
  role: AdminUserRole;
  isActive: boolean;
  suspendedUntil?: string | null;
  suspensionReason?: string | null;
  createdAt: string;
  reportCount: number;
}

interface UsersResponse {
  users: ServerAdminUser[];
  count: number;
  hasMore?: boolean;
}

export interface ListAdminUsersPageResult {
  users: AdminUser[];
  hasMore: boolean;
}

interface UserResponse {
  message: string;
  user: ServerAdminUser;
}

export interface CreateAdminUserPayload {
  name: string;
  email: string;
  password: string;
  role: Extract<AdminUserRole, "staff" | "admin">;
}

function toAdminUser(user: ServerAdminUser): AdminUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    isActive: user.isActive,
    suspendedUntil: user.suspendedUntil ?? null,
    suspensionReason: user.suspensionReason ?? null,
    joined: new Intl.DateTimeFormat("en", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(new Date(user.createdAt)),
    reportCount: user.reportCount,
  };
}

export async function listAdminUsersPage(params?: {
  limit?: number;
  offset?: number;
}): Promise<ListAdminUsersPageResult> {
  const query: Record<string, string> = {};
  if (params?.limit !== undefined) query.limit = String(params.limit);
  if (params?.offset !== undefined) query.offset = String(params.offset);
  const { data } = await api.get<UsersResponse>("/users", { params: query });
  return {
    users: data.users.map(toAdminUser),
    hasMore: Boolean(data.hasMore),
  };
}

export async function listAdminUsers(): Promise<AdminUser[]> {
  const { users } = await listAdminUsersPage();
  return users;
}

export async function createAdminUser(
  payload: CreateAdminUserPayload,
): Promise<void> {
  await api.post<UserResponse>("/users", payload);
}

export async function updateAdminUserStatus(
  id: string,
  isActive: boolean,
): Promise<void> {
  await api.patch<UserResponse>(`/users/${id}/status`, { isActive });
}

export async function updateAdminUserRole(
  id: string,
  role: AdminUserRole,
): Promise<void> {
  await api.patch<UserResponse>(`/users/${id}/role`, { role });
}

export type SuspendAdminUserPayload =
  | {
      suspended: true;
      durationDays?: number;
      suspendedUntil?: string;
      reason: string;
    }
  | {
      suspended: false;
    };

export async function updateAdminUserSuspension(
  id: string,
  payload: SuspendAdminUserPayload,
): Promise<void> {
  await api.patch<UserResponse>(`/users/${id}/suspend`, payload);
}

export async function deleteAdminUser(id: string): Promise<void> {
  await api.delete<{ message: string }>(`/users/${id}`);
}

export interface SyncSchoolIdsCsvResult {
  message: string;
  csvSchoolIdCount: number;
  deactivatedCount: number;
  keptActiveCount: number;
}

export async function syncSchoolIdsCsv(
  file: File,
): Promise<SyncSchoolIdsCsvResult> {
  const formData = new FormData();
  formData.append("file", file);
  const { data } = await api.post<SyncSchoolIdsCsvResult>(
    "/users/sync-school-ids",
    formData,
    {
      headers: { "Content-Type": "multipart/form-data" },
    },
  );
  return data;
}
