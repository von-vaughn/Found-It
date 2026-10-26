import {
  api,
  rawAxios,
  setAccessToken,
  setInMemoryUser,
  broadcastAuthEvent,
  type SafeAuthUser,
} from "@/lib/api";

export interface AuthResponse {
  message: string;
  user: SafeAuthUser;
  accessToken: string;
  mustChangePassword?: boolean;
}

export const authService = {
  async login(credentials: {
    email: string;
    password: string;
  }): Promise<AuthResponse> {
    const { data } = await api.post<AuthResponse>("/auth/login", credentials);
    setAccessToken(data.accessToken);
    setInMemoryUser(data.user);
    broadcastAuthEvent({ type: "REFRESHED" });
    return data;
  },

  async checkEmail(
    email: string,
  ): Promise<{ available: boolean; message: string }> {
    try {
      const { data } = await api.post<{ available: boolean; message: string }>(
        "/auth/check-email",
        { email },
      );
      return data;
    } catch (err: unknown) {
      const response = (
        err as {
          response?: {
            status?: number;
            data?: { available?: boolean; message?: string };
          };
        }
      )?.response;
      if (response?.status === 409) {
        return {
          available: false,
          message:
            response.data?.message || "An account with this email already exists.",
        };
      }
      throw err;
    }
  },

  async register(payload: {
    name: string;
    email: string;
    password: string;
  }): Promise<{ message: string }> {
    const { data } = await api.post<{ message: string }>(
      "/auth/register",
      payload,
    );
    return data;
  },

  async verifyEmail(payload: {
    email: string;
    otp: string;
  }): Promise<AuthResponse> {
    const { data } = await api.post<AuthResponse>(
      "/auth/verify-email",
      payload,
    );
    setAccessToken(data.accessToken);
    setInMemoryUser(data.user);
    broadcastAuthEvent({ type: "REFRESHED" });
    return data;
  },

  async resendOtp(payload: { email: string }): Promise<{ message: string }> {
    const { data } = await api.post<{ message: string }>(
      "/auth/resend-otp",
      payload,
    );
    return data;
  },

  async getMe(): Promise<{ user: SafeAuthUser }> {
    const { data } = await api.get<{ user: SafeAuthUser }>("/auth/me");
    setInMemoryUser(data.user);
    return data;
  },

  async logout(): Promise<void> {
    try {
      await rawAxios.post("/auth/logout");
    } finally {
      setAccessToken(null);
      setInMemoryUser(null);
      broadcastAuthEvent({ type: "LOGOUT" });
    }
  },

  async changePassword(payload: {
    currentPassword: string;
    newPassword: string;
  }): Promise<{ message: string }> {
    const { data } = await api.patch<{ message: string }>(
      "/auth/change-password",
      payload,
    );
    setAccessToken(null);
    setInMemoryUser(null);
    broadcastAuthEvent({ type: "LOGOUT" });
    return data;
  },
};

export default authService;
