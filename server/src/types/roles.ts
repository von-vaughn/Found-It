export const ROLES = ['school_user', 'staff', 'admin'] as const;
export type Role = (typeof ROLES)[number];

/** Higher number = more privilege */
export const ROLE_LEVEL: Record<Role, number> = {
  school_user: 1,
  staff: 2,
  admin: 3,
};

export interface SafeUser {
  id: string;
  name: string;
  email: string;
  schoolId?: string;
  role: Role;
  isActive: boolean;
  isVerified: boolean;
  hasSeenTutorial: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface JwtPayload {
  sub: string; // user id
  email: string;
  role: Role;
  type: 'access' | 'refresh';
  jti?: string; // refresh tokens only: unique id per token
}
