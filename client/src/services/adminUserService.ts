import api from "@/lib/api";
import type { AdminUser, AdminUserRole } from "@/components/admin/types";

interface ServerAdminUser {
  id: string;
  name: string;
  email: string;
  role: AdminUserRole;
  isActive: boolean;
  createdAt: string;
  reportCount: number;
}

interface UsersResponse {
  users: ServerAdminUser[];
  count: number;
}

interface UserResponse {
  message: string;
  user: ServerAdminUser;
}

export interface CreateAdminUserPayload {
  name: string;
  email: string;
  password: string;
  role: Extract<AdminUserRole, "admin" | "super_admin">;
}

function toAdminUser(user: ServerAdminUser): AdminUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    isActive: user.isActive,
    joined: new Intl.DateTimeFormat("en", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(new Date(user.createdAt)),
    reportCount: user.reportCount,
  };
}

export async function listAdminUsers(): Promise<AdminUser[]> {
  const { data } = await api.get<UsersResponse>("/users");
  return data.users.map(toAdminUser);
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

export async function deleteAdminUser(id: string): Promise<void> {
  await api.delete<{ message: string }>(`/users/${id}`);
}
