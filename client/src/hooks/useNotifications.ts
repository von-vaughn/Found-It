import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useAuth } from "@/context/useAuth";
import {
  listNotifications,
  listNotificationsPage,
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
  infinite: (userId?: string, pageSize?: number) =>
    [...notificationKeys.all, "infinite", userId ?? "anonymous", pageSize ?? 25] as const,
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

export function useInfiniteNotifications(pageSize = 25) {
  const { user } = useAuth();
  const query = useInfiniteQuery({
    queryKey: notificationKeys.infinite(user?.id, pageSize),
    initialPageParam: 0,
    queryFn: ({ pageParam }) =>
      listNotificationsPage({ limit: pageSize, offset: pageParam }),
    getNextPageParam: (lastPage, allPages) => {
      if (!lastPage.hasMore) return undefined;
      return allPages.reduce((sum, page) => sum + page.notifications.length, 0);
    },
    enabled: Boolean(user),
    staleTime: 0,
    refetchInterval: 10_000,
    refetchIntervalInBackground: false,
  });

  const notifications: ServerNotification[] = [];
  const seen = new Set<string>();
  for (const page of query.data?.pages ?? []) {
    for (const notification of page.notifications) {
      if (!seen.has(notification.id)) {
        seen.add(notification.id);
        notifications.push(notification);
      }
    }
  }
  const unreadCount =
    query.data?.pages[0]?.unreadCount ??
    notifications.filter((notification) => !notification.isRead).length;

  return {
    ...query,
    notifications,
    unreadCount,
  };
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
      queryClient.invalidateQueries({ queryKey: notificationKeys.all });
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
      queryClient.invalidateQueries({ queryKey: notificationKeys.all });
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
      queryClient.invalidateQueries({ queryKey: notificationKeys.all });
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
      queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    },
  });
}
