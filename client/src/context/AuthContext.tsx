import React, { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { AuthContext, type User, type Role } from "@/context/auth-context";
import {
  authService,
} from "@/services/authService";
import {
  authChannel,
  getInMemoryUser,
  type AuthSyncEvent,
} from "@/lib/api";

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [pendingEmail, setPendingEmailState] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const initAuth = async () => {
      try {
        // Refresh token is in httpOnly cookie; calling refreshAccessToken()
        // returns { user, accessToken } serialized across open tabs with Web Locks.
        const { user: refreshedUser } = await authService.refresh();
        if (isMounted) setUser(refreshedUser);
      } catch {
        if (isMounted) setUser(null);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    initAuth();

    // Multi-tab synchronization
    const handleBroadcast = (event: MessageEvent<AuthSyncEvent>) => {
      if (event.data?.type === "LOGOUT") {
        if (isMounted) setUser(null);
      } else if (event.data?.type === "REFRESHED") {
        const cached = getInMemoryUser();
        if (cached && isMounted) {
          setUser(cached);
        } else {
          authService
            .refresh()
            .then(({ user: rehydrated }) => {
              if (isMounted) setUser(rehydrated);
            })
            .catch(() => {
              if (isMounted) setUser(null);
            });
        }
      }
    };

    authChannel?.addEventListener("message", handleBroadcast);

    const handleUnauthorized = () => {
      if (isMounted) setUser(null);
    };
    window.addEventListener("foundit:auth-unauthorized", handleUnauthorized);

    return () => {
      isMounted = false;
      authChannel?.removeEventListener("message", handleBroadcast);
      window.removeEventListener(
        "foundit:auth-unauthorized",
        handleUnauthorized,
      );
    };
  }, []);

  const setPendingEmail = (email: string) => {
    setPendingEmailState(email.trim().toLowerCase());
  };

  const login = async (
    email: string,
    password: string,
  ): Promise<{
    success: boolean;
    message?: string;
    role?: Role;
    requiresVerification?: boolean;
  }> => {
    const normalizedEmail = email.trim().toLowerCase();
    try {
      const data = await authService.login({
        email: normalizedEmail,
        password,
      });
      setUser(data.user);
      setPendingEmailState(null);
      toast.success(`Welcome back, ${data.user.name}!`, {
        icon: "🎉",
      });
      return {
        success: true,
        role: data.user.role,
      };
    } catch (err: unknown) {
      const response = (err as { response?: { status?: number; data?: { message?: string } } })?.response;
      const status = response?.status;
      const message = response?.data?.message || "Sign in failed. Check your connection.";

      if (status === 403 && message.toLowerCase().includes("not verified")) {
        setPendingEmailState(normalizedEmail);
        return {
          success: false,
          message,
          requiresVerification: true,
        };
      }

      return {
        success: false,
        message,
      };
    }
  };

  const signup = async (userData: {
    name: string;
    email: string;
    password: string;
  }): Promise<{ success: boolean; message?: string }> => {
    const normalizedEmail = userData.email.trim().toLowerCase();
    try {
      const data = await authService.register({
        name: userData.name.trim(),
        email: normalizedEmail,
        password: userData.password,
      });
      setPendingEmailState(normalizedEmail);
      return { success: true, message: data.message };
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || "Account registration failed. Please try again.";
      return { success: false, message };
    }
  };

  const verifyOtp = async (
    code: string,
  ): Promise<{ success: boolean; message?: string; role?: Role }> => {
    const email = pendingEmail;
    if (!email) {
      return {
        success: false,
        message: "No email pending verification. Please register or sign in again.",
      };
    }
    try {
      const data = await authService.verifyEmail({
        email,
        otp: code.trim(),
      });
      setUser(data.user);
      setPendingEmailState(null);
      toast.success(`Welcome, ${data.user.name}! Your email is verified.`, {
        icon: "🎉",
      });
      return {
        success: true,
        role: data.user.role,
      };
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || "Verification failed. Check the code and try again.";
      return { success: false, message };
    }
  };

  const resendOtp = async (
    emailTarget?: string,
  ): Promise<{ success: boolean; message?: string }> => {
    const email = (emailTarget || pendingEmail)?.trim().toLowerCase();
    if (!email) {
      return { success: false, message: "No email provided." };
    }
    try {
      const data = await authService.resendOtp({ email });
      toast.success(data.message || "A new verification code was sent.");
      return { success: true, message: data.message };
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || "Could not resend code. Please wait before trying again.";
      toast.error(message);
      return { success: false, message };
    }
  };

  const logout = async () => {
    try {
      await authService.logout();
    } finally {
      setUser(null);
      setPendingEmailState(null);
      toast.success("Successfully signed out.", {
        icon: "👋",
      });
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        pendingEmail,
        setPendingEmail,
        login,
        signup,
        verifyOtp,
        resendOtp,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
