import { createContext } from "react";

export interface User {
  id: string;
  name: string;
  email: string;
  studentId?: string;
  avatar?: string;
  role?: string;
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
