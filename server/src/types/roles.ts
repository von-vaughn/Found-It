export const ROLES = ['user', 'admin', 'super_admin'] as const;
export type Role = (typeof ROLES)[number];

/** Higher number = more privilege */
export const ROLE_LEVEL: Record<Role, number> = {
  user: 1,
  admin: 2,
  super_admin: 3,
};

export interface SafeUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  isActive: boolean;
  isVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface JwtPayload {
  sub: string; // user id
  email: string;
  role: Role;
  type: 'access' | 'refresh';
}
