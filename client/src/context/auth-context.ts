import { createContext } from "react";

// Only students with a valid school email may register or sign in. Single source
// of truth so the signup form and the auth provider cannot drift apart.
export const SCHOOL_EMAIL_DOMAINS = ["@wmsu.edu.ph"] as const;

export const isSchoolEmail = (email: string): boolean => {
  const normalized = email.trim().toLowerCase();
  return SCHOOL_EMAIL_DOMAINS.some((domain) => normalized.endsWith(domain));
};

export interface User {
  id: string;
  name: string;
  email: string;
  studentId?: string;
  avatar?: string;
  createdAt: string;
}

export interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  pendingEmail: string | null;
  currentOtp: string;
  setPendingEmail: (email: string) => void;
  sendOtp: (email: string) => string;
  login: (email: string, password?: string) => Promise<boolean>;
  signup: (userData: {
    name: string;
    email: string;
    studentId?: string;
    password?: string;
  }) => Promise<boolean>;
  verifyOtp: (code: string) => Promise<{ success: boolean; message?: string }>;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);
