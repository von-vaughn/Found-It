import { createContext } from "react";

export const SCHOOL_EMAIL_DOMAINS = ["@wmsu.edu.ph"] as const;

export const isSchoolEmail = (email: string): boolean => {
  const parts = email.trim().toLowerCase().split("@");
  return parts.length === 2 && parts[1] === "wmsu.edu.ph";
};

export type Role = "school_user" | "admin" | "super_admin";

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  isActive: boolean;
  isVerified: boolean;
  mustChangePassword?: boolean;
  studentId?: string;
  avatar?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  pendingEmail: string | null;
  setPendingEmail: (email: string) => void;
  login: (
    email: string,
    password: string,
  ) => Promise<{
    success: boolean;
    message?: string;
    role?: Role;
    requiresVerification?: boolean;
  }>;
  signup: (userData: {
    name: string;
    email: string;
    password: string;
  }) => Promise<{ success: boolean; message?: string }>;
  checkEmailAvailability?: (
    email: string,
  ) => Promise<{ available: boolean; message?: string }>;
  verifyOtp: (code: string) => Promise<{ success: boolean; message?: string; role?: Role }>;
  resendOtp: (email?: string) => Promise<{ success: boolean; message?: string }>;
  logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);
