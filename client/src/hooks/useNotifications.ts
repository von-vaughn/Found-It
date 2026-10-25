import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/context/useAuth";
import {
  listNotifications,
  deleteNotification,
  deleteReadNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  type ServerNotification,
} from "@/services/notificationService";

export const notificationKeys = {
  all: ["notifications"] as const,
  user: (userId?: string) =>
    [...notificationKeys.all, userId ?? "anonymous"] as const,
};

export function useNotifications() {
  const { user } = useAuth();
  return useQuery<ServerNotification[], Error>({
    queryKey: notificationKeys.user(user?.id),
    queryFn: listNotifications,
    enabled: Boolean(user),
    staleTime: 0,
    refetchInterval: 10_000,
    refetchIntervalInBackground: false,
  });
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const queryKey = notificationKeys.user(user?.id);

  return useMutation({
    mutationFn: markNotificationRead,
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<ServerNotification[]>(queryKey);
      queryClient.setQueryData<ServerNotification[]>(queryKey, (current) =>
        current?.map((notification) =>
          notification.id === id
            ? { ...notification, isRead: true }
            : notification,
        ),
      );
      return { previous };
    },
    onError: (_error, _id, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKey, context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const queryKey = notificationKeys.user(user?.id);

  return useMutation({
    mutationFn: markAllNotificationsRead,
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<ServerNotification[]>(queryKey);
      queryClient.setQueryData<ServerNotification[]>(queryKey, (current) =>
        current?.map((notification) => ({ ...notification, isRead: true })),
      );
      return { previous };
    },
    onError: (_error, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKey, context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });
}

export function useDeleteNotification() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const queryKey = notificationKeys.user(user?.id);

  return useMutation({
    mutationFn: deleteNotification,
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<ServerNotification[]>(queryKey);
      queryClient.setQueryData<ServerNotification[]>(queryKey, (current) =>
        current?.filter((notification) => notification.id !== id),
      );
      return { previous };
    },
    onError: (_error, _id, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKey, context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });
}

export function useDeleteReadNotifications() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const queryKey = notificationKeys.user(user?.id);

  return useMutation({
    mutationFn: deleteReadNotifications,
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<ServerNotification[]>(queryKey);
      queryClient.setQueryData<ServerNotification[]>(queryKey, (current) =>
        current?.filter((notification) => !notification.isRead),
      );
      return { previous };
    },
    onError: (_error, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKey, context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });
}
