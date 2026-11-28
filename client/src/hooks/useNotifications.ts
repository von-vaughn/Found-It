import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  type InfiniteData,
  type QueryClient,
  type QueryKey,
} from "@tanstack/react-query";
import { useAuth } from "@/context/useAuth";
import { isInfiniteData } from "@/lib/queryCache";
import {
  listNotifications,
  listNotificationsPage,
  deleteNotification,
  deleteReadNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  type ListNotificationsPageResult,
  type ServerNotification,
} from "@/services/notificationService";

export const notificationKeys = {
  all: ["notifications"] as const,
  user: (userId?: string) =>
    [...notificationKeys.all, userId ?? "anonymous"] as const,
  infinitePrefix: (userId?: string) =>
    [...notificationKeys.all, "infinite", userId ?? "anonymous"] as const,
  infinite: (userId?: string, pageSize?: number) =>
    [...notificationKeys.infinitePrefix(userId), pageSize ?? 25] as const,
};

type NotificationSnapshot = Array<[QueryKey, unknown]>;

function snapshotUserNotifications(
  queryClient: QueryClient,
  userId?: string,
): NotificationSnapshot {
  return [
    ...queryClient.getQueriesData({ queryKey: notificationKeys.user(userId) }),
    ...queryClient.getQueriesData({
      queryKey: notificationKeys.infinitePrefix(userId),
    }),
  ];
}

function restoreUserNotifications(
  queryClient: QueryClient,
  snapshot: NotificationSnapshot | undefined,
) {
  if (!snapshot) return;
  for (const [key, data] of snapshot) {
    queryClient.setQueryData(key, data);
  }
}

function updateInfiniteNotifications(
  queryClient: QueryClient,
  userId: string | undefined,
  transform: (
    data: InfiniteData<ListNotificationsPageResult>,
  ) => InfiniteData<ListNotificationsPageResult>,
) {
  queryClient.setQueriesData<InfiniteData<ListNotificationsPageResult>>(
    { queryKey: notificationKeys.infinitePrefix(userId) },
    (current) => (isInfiniteData<ListNotificationsPageResult>(current) ? transform(current) : current),
  );
}

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
  const userId = user?.id;
  const queryKey = notificationKeys.user(userId);

  return useMutation({
    mutationFn: markNotificationRead,
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: notificationKeys.all });
      const snapshot = snapshotUserNotifications(queryClient, userId);

      queryClient.setQueryData<ServerNotification[]>(queryKey, (current) =>
        current?.map((notification) =>
          notification.id === id
            ? { ...notification, isRead: true }
            : notification,
        ),
      );
      updateInfiniteNotifications(queryClient, userId, (current) => {
        const wasUnread = current.pages.some((page) =>
          page.notifications.some((n) => n.id === id && !n.isRead),
        );
        return {
          ...current,
          pages: current.pages.map((page) => ({
            ...page,
            unreadCount: wasUnread
              ? Math.max(0, page.unreadCount - 1)
              : page.unreadCount,
            notifications: page.notifications.map((notification) =>
              notification.id === id
                ? { ...notification, isRead: true }
                : notification,
            ),
          })),
        };
      });

      return { snapshot };
    },
    onError: (_error, _id, context) => {
      restoreUserNotifications(queryClient, context?.snapshot);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    },
  });
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const userId = user?.id;
  const queryKey = notificationKeys.user(userId);

  return useMutation({
    mutationFn: markAllNotificationsRead,
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: notificationKeys.all });
      const snapshot = snapshotUserNotifications(queryClient, userId);

      queryClient.setQueryData<ServerNotification[]>(queryKey, (current) =>
        current?.map((notification) => ({ ...notification, isRead: true })),
      );
      updateInfiniteNotifications(queryClient, userId, (current) => ({
        ...current,
        pages: current.pages.map((page) => ({
          ...page,
          unreadCount: 0,
          notifications: page.notifications.map((notification) => ({
            ...notification,
            isRead: true,
          })),
        })),
      }));

      return { snapshot };
    },
    onError: (_error, _variables, context) => {
      restoreUserNotifications(queryClient, context?.snapshot);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    },
  });
}

export function useDeleteNotification() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const userId = user?.id;
  const queryKey = notificationKeys.user(userId);

  return useMutation({
    mutationFn: deleteNotification,
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: notificationKeys.all });
      const snapshot = snapshotUserNotifications(queryClient, userId);

      queryClient.setQueryData<ServerNotification[]>(queryKey, (current) =>
        current?.filter((notification) => notification.id !== id),
      );
      updateInfiniteNotifications(queryClient, userId, (current) => {
        const wasUnread = current.pages.some((page) =>
          page.notifications.some((n) => n.id === id && !n.isRead),
        );
        return {
          ...current,
          pages: current.pages.map((page) => ({
            ...page,
            unreadCount: wasUnread
              ? Math.max(0, page.unreadCount - 1)
              : page.unreadCount,
            notifications: page.notifications.filter(
              (notification) => notification.id !== id,
            ),
          })),
        };
      });

      return { snapshot };
    },
    onError: (_error, _id, context) => {
      restoreUserNotifications(queryClient, context?.snapshot);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    },
  });
}

export function useDeleteReadNotifications() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const userId = user?.id;
  const queryKey = notificationKeys.user(userId);

  return useMutation({
    mutationFn: deleteReadNotifications,
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: notificationKeys.all });
      const snapshot = snapshotUserNotifications(queryClient, userId);

      queryClient.setQueryData<ServerNotification[]>(queryKey, (current) =>
        current?.filter((notification) => !notification.isRead),
      );
      updateInfiniteNotifications(queryClient, userId, (current) => ({
        ...current,
        pages: current.pages.map((page) => ({
          ...page,
          notifications: page.notifications.filter(
            (notification) => !notification.isRead,
          ),
        })),
      }));

      return { snapshot };
    },
    onError: (_error, _variables, context) => {
      restoreUserNotifications(queryClient, context?.snapshot);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    },
  });
}
