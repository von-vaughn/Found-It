import React, { useCallback, useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { AuthContext, type Role } from "@/context/auth-context";
import { authService } from "@/services/authService";
import {
  authChannel,
  getInMemoryUser,
  type AuthSyncEvent,
  type SafeAuthUser,
} from "@/lib/api";

const AUTH_USER_QUERY_KEY = ["auth", "user"] as const;

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const queryClient = useQueryClient();
  const [pendingEmail, setPendingEmailState] = useState<string | null>(null);

  const setAuthUser = useCallback(
    (user: SafeAuthUser | null) =>
      queryClient.setQueryData<SafeAuthUser | null>(
        AUTH_USER_QUERY_KEY,
        user,
      ),
    [queryClient],
  );

  // Access token lives in memory only, so on a fresh page load this request
  // 401s once and the axios interceptor silently refreshes via the httpOnly
  // cookie (serialized across tabs with Web Locks).
  const userQuery = useQuery({
    queryKey: AUTH_USER_QUERY_KEY,
    queryFn: async () => (await authService.getMe()).user,
    retry: false,
    staleTime: Infinity,
    // The auth events below are the only triggers that refetch the session.
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    // Multi-tab synchronization
    const handleBroadcast = (event: MessageEvent<AuthSyncEvent>) => {
      if (event.data?.type === "LOGOUT") {
        setAuthUser(null);
      } else if (event.data?.type === "REFRESHED") {
        const cached = getInMemoryUser();
        if (cached) {
          setAuthUser(cached);
        } else {
          void queryClient.invalidateQueries({
            queryKey: AUTH_USER_QUERY_KEY,
          });
        }
      }
    };

    authChannel?.addEventListener("message", handleBroadcast);

    const handleUnauthorized = () => setAuthUser(null);
    window.addEventListener("foundit:auth-unauthorized", handleUnauthorized);

    return () => {
      authChannel?.removeEventListener("message", handleBroadcast);
      window.removeEventListener(
        "foundit:auth-unauthorized",
        handleUnauthorized,
      );
    };
  }, [queryClient, setAuthUser]);

  const loginMutation = useMutation({ mutationFn: authService.login });
  const registerMutation = useMutation({ mutationFn: authService.register });
  const verifyEmailMutation = useMutation({
    mutationFn: authService.verifyEmail,
  });
  const resendOtpMutation = useMutation({ mutationFn: authService.resendOtp });
  const logoutMutation = useMutation({ mutationFn: authService.logout });

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
      const data = await loginMutation.mutateAsync({
        email: normalizedEmail,
        password,
      });
      setAuthUser(data.user);
      setPendingEmailState(null);
      toast.success(`Welcome back, ${data.user.name}!`, {
        icon: "🎉",
      });
      return {
        success: true,
        role: data.user.role,
      };
    } catch (err: unknown) {
      const response = (
        err as {
          response?: { status?: number; data?: { message?: string } };
        }
      )?.response;
      const status = response?.status;
      const message =
        response?.data?.message || "Sign in failed. Check your connection.";

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
      const data = await registerMutation.mutateAsync({
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

  const checkEmailAvailability = async (
    email: string,
  ): Promise<{ available: boolean; message?: string }> => {
    try {
      return await authService.checkEmail(email);
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || "Unable to verify email availability.";
      return { available: false, message };
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
      const data = await verifyEmailMutation.mutateAsync({
        email,
        otp: code.trim(),
      });
      setAuthUser(data.user);
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
      const data = await resendOtpMutation.mutateAsync({ email });
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
      await logoutMutation.mutateAsync();
    } finally {
      setAuthUser(null);
      setPendingEmailState(null);
      toast.success("Successfully signed out.", {
        icon: "👋",
      });
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user: userQuery.data ?? null,
        isAuthenticated: !!userQuery.data,
        isLoading: userQuery.isPending,
        pendingEmail,
        setPendingEmail,
        login,
        signup,
        checkEmailAvailability,
        verifyOtp,
        resendOtp,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
