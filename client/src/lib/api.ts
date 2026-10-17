import axios, { type AxiosInstance, type InternalAxiosRequestConfig } from "axios";

export interface SafeAuthUser {
  id: string;
  name: string;
  email: string;
  role: "school_user" | "admin" | "super_admin";
  isActive: boolean;
  isVerified: boolean;
  mustChangePassword?: boolean;
  studentId?: string;
  avatar?: string;
  createdAt: string;
  updatedAt: string;
}

// In-memory access token storage (never written to localStorage)
let inMemoryAccessToken: string | null = null;
let inMemoryUser: SafeAuthUser | null = null;

export const setAccessToken = (token: string | null) => {
  inMemoryAccessToken = token;
};

export const getAccessToken = (): string | null => inMemoryAccessToken;

export const setInMemoryUser = (user: SafeAuthUser | null) => {
  inMemoryUser = user;
};

export const getInMemoryUser = (): SafeAuthUser | null => inMemoryUser;

// Multi-tab synchronization channel (sends events only, never tokens or user data)
export type AuthSyncEvent = { type: "REFRESHED" } | { type: "LOGOUT" };

export const authChannel =
  typeof window !== "undefined" && "BroadcastChannel" in window
    ? new BroadcastChannel("foundit_auth_sync")
    : null;

export function broadcastAuthEvent(event: AuthSyncEvent) {
  authChannel?.postMessage(event);
}

// Raw Axios instance without interceptors for refresh requests
export const rawAxios: AxiosInstance = axios.create({
  baseURL: "/api",
  withCredentials: true,
  headers: {
    "X-Requested-With": "XMLHttpRequest",
  },
});

let refreshPromise: Promise<string> | null = null;

/**
 * Executes token refresh serialized across open tabs using the Web Locks API.
 * When multiple tabs reload concurrently or encounter 401s, they queue on the
 * "foundit_refresh" lock. The first tab rotates the cookie; subsequent tabs
 * seamlessly pick up the rotated cookie from the shared browser cookie jar.
 */
export function refreshAccessToken(): Promise<string> {
  if (refreshPromise) return refreshPromise;

  const performRefresh = async (): Promise<string> => {
    const { data } = await rawAxios.post<{
      user: SafeAuthUser;
      accessToken: string;
    }>("/auth/refresh");

    setAccessToken(data.accessToken);
    setInMemoryUser(data.user);
    broadcastAuthEvent({ type: "REFRESHED" });
    return data.accessToken;
  };

  if (typeof navigator !== "undefined" && navigator.locks) {
    refreshPromise = navigator.locks
      .request("foundit_refresh", performRefresh)
      .finally(() => {
        refreshPromise = null;
      });
  } else {
    refreshPromise = performRefresh().finally(() => {
      refreshPromise = null;
    });
  }

  return refreshPromise;
}

// Main Axios instance with CSRF headers, credentials, and silent refresh interceptor
export const api: AxiosInstance = axios.create({
  baseURL: "/api",
  withCredentials: true,
  headers: {
    "X-Requested-With": "XMLHttpRequest",
  },
});

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Explicit list of unauthenticated endpoints that should NEVER trigger a 401 refresh retry
const NO_RETRY_PATHS = [
  "/auth/login",
  "/auth/register",
  "/auth/verify-email",
  "/auth/resend-otp",
  "/auth/refresh",
  "/auth/logout",
];

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };

    if (!originalRequest) return Promise.reject(error);

    const isExcluded = NO_RETRY_PATHS.some((path) =>
      originalRequest.url?.includes(path),
    );

    if (error.response?.status === 401 && !originalRequest._retry && !isExcluded) {
      originalRequest._retry = true;
      try {
        const newAccessToken = await refreshAccessToken();
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        return api(originalRequest);
      } catch (refreshErr) {
        setAccessToken(null);
        setInMemoryUser(null);
        broadcastAuthEvent({ type: "LOGOUT" });
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("foundit:auth-unauthorized"));
        }
        return Promise.reject(refreshErr);
      }
    }

    return Promise.reject(error);
  },
);

export default api;
