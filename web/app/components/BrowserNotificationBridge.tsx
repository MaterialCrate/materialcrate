"use client";

import { useEffect, useMemo, useRef } from "react";
import { useAuth } from "@/app/lib/auth-client";
import {
  getNotificationDescriptionPreview,
  getNotificationHref,
} from "@/app/lib/notification-navigation";
import { subscribeToNotificationActivity } from "@/app/lib/post-activity-realtime";

type NotificationItem = {
  id: string;
  type: string;
  actorUsername?: string | null;
  postId?: string | null;
  commentId?: string | null;
  title: string;
  description: string;
  unread: boolean;
};

type PushPrefs = {
  pushNotificationsLikes: boolean;
  pushNotificationsComments: boolean;
  pushNotificationsFollows: boolean;
  pushNotificationsMentions: boolean;
};

const PUSH_TYPE_TO_PREF: Record<string, keyof PushPrefs> = {
  POST_LIKE: "pushNotificationsLikes",
  COMMENT_LIKE: "pushNotificationsLikes",
  COMMENT: "pushNotificationsComments",
  FOLLOW: "pushNotificationsFollows",
  FOLLOW_REQUEST: "pushNotificationsFollows",
};

const DEFAULT_PUSH_PREFS: PushPrefs = {
  pushNotificationsLikes: true,
  pushNotificationsComments: true,
  pushNotificationsFollows: true,
  pushNotificationsMentions: true,
};

const SEEN_IDS_STORAGE_KEY = "mc-browser-notification-seen";
const UNREAD_NOTIFICATIONS_SYNC_INTERVAL_MS = 60000;
const NOTIFICATION_SYNC_MIN_INTERVAL_MS = 1500;
const NOTIFICATION_SYNC_DEBOUNCE_MS = 400;

const readSeenIdsFromStorage = () => {
  if (typeof window === "undefined") {
    return new Set<string>();
  }

  try {
    const raw = window.sessionStorage.getItem(SEEN_IDS_STORAGE_KEY);
    if (!raw) {
      return new Set<string>();
    }

    const parsed = JSON.parse(raw);
    return new Set(
      Array.isArray(parsed)
        ? parsed.filter((value): value is string => typeof value === "string")
        : [],
    );
  } catch {
    return new Set<string>();
  }
};

const saveSeenIdsToStorage = (seenIds: Set<string>) => {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.sessionStorage.setItem(
      SEEN_IDS_STORAGE_KEY,
      JSON.stringify(Array.from(seenIds)),
    );
  } catch {}
};

export default function BrowserNotificationBridge() {
  const { user, isLoading } = useAuth();
  const seenIdsRef = useRef<Set<string>>(new Set());
  const pushPrefsRef = useRef<PushPrefs>(DEFAULT_PUSH_PREFS);
  const syncTimeoutRef = useRef<number | null>(null);
  const lastSyncAtRef = useRef(0);
  const canUseNotifications = useMemo(
    () => typeof window !== "undefined" && "Notification" in window,
    [],
  );

  useEffect(() => {
    if (!canUseNotifications || isLoading || !user?.id) {
      return;
    }

    seenIdsRef.current = readSeenIdsFromStorage();

    const requestPermission = async () => {
      try {
        await window.Notification.requestPermission();
      } catch {}
    };

    const fetchPushPrefs = async () => {
      try {
        const response = await fetch("/api/auth/me", { method: "GET" });
        const body = await response.json().catch(() => ({}));
        if (response.ok && body?.user) {
          pushPrefsRef.current = {
            pushNotificationsLikes:
              typeof body.user.pushNotificationsLikes === "boolean"
                ? body.user.pushNotificationsLikes
                : true,
            pushNotificationsComments:
              typeof body.user.pushNotificationsComments === "boolean"
                ? body.user.pushNotificationsComments
                : true,
            pushNotificationsFollows:
              typeof body.user.pushNotificationsFollows === "boolean"
                ? body.user.pushNotificationsFollows
                : true,
            pushNotificationsMentions:
              typeof body.user.pushNotificationsMentions === "boolean"
                ? body.user.pushNotificationsMentions
                : true,
          };
        }
      } catch {}
    };

    const shouldShowBrowserNotification = (type: string): boolean => {
      const prefKey = PUSH_TYPE_TO_PREF[type];
      if (!prefKey) return true;
      return pushPrefsRef.current[prefKey];
    };

    const syncUnreadNotifications = async () => {
      try {
        const response = await fetch(
          "/api/notifications?limit=20&unreadOnly=true",
          {
            method: "GET",
            cache: "no-store",
          },
        );

        if (!response.ok) {
          return;
        }

        const body = await response.json().catch(() => ({}));
        const notifications = Array.isArray(body?.notifications)
          ? (body.notifications as NotificationItem[])
          : [];

        if (window.Notification.permission !== "granted") {
          return;
        }

        for (const item of notifications) {
          if (!item?.id || !item.unread || seenIdsRef.current.has(item.id)) {
            continue;
          }

          seenIdsRef.current.add(item.id);

          if (!shouldShowBrowserNotification(item.type)) {
            continue;
          }

          const href = getNotificationHref(item) ?? "/notifications";
          const browserNotification = new window.Notification(item.title, {
            body: getNotificationDescriptionPreview(item.description, 120),
            tag: `mc-${item.id}`,
          });

          browserNotification.onclick = () => {
            browserNotification.close();
            try {
              window.focus();
            } catch {}
            window.location.assign(href);
          };
        }

        saveSeenIdsToStorage(seenIdsRef.current);
      } catch {}
    };

    const scheduleUnreadNotificationsSync = (
      delay = NOTIFICATION_SYNC_DEBOUNCE_MS,
    ) => {
      if (document.visibilityState === "hidden") {
        return;
      }

      if (syncTimeoutRef.current) {
        window.clearTimeout(syncTimeoutRef.current);
      }

      const elapsed = Date.now() - lastSyncAtRef.current;
      const nextDelay =
        elapsed >= NOTIFICATION_SYNC_MIN_INTERVAL_MS
          ? delay
          : Math.max(delay, NOTIFICATION_SYNC_MIN_INTERVAL_MS - elapsed);

      syncTimeoutRef.current = window.setTimeout(() => {
        lastSyncAtRef.current = Date.now();
        void syncUnreadNotifications();
      }, nextDelay);
    };

    void requestPermission()
      .then(() => fetchPushPrefs())
      .then(() => syncUnreadNotifications());

    let unsubscribe: (() => void) | undefined;
    let isDisposed = false;
    void subscribeToNotificationActivity(user.id, (event) => {
      if (
        event.reason !== "notification-created" &&
        typeof event.unreadCount === "number" &&
        event.unreadCount <= 0
      ) {
        return;
      }

      scheduleUnreadNotificationsSync();
    }).then((cleanup) => {
      if (isDisposed) {
        cleanup();
        return;
      }

      unsubscribe = cleanup;
    });

    const intervalId = window.setInterval(() => {
      void syncUnreadNotifications();
    }, UNREAD_NOTIFICATIONS_SYNC_INTERVAL_MS);

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void fetchPushPrefs().then(() => scheduleUnreadNotificationsSync(0));
      }
    };

    const onWindowFocus = () => {
      void fetchPushPrefs().then(() => scheduleUnreadNotificationsSync(0));
    };

    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("focus", onWindowFocus);

    return () => {
      isDisposed = true;
      window.clearInterval(intervalId);
      if (syncTimeoutRef.current) {
        window.clearTimeout(syncTimeoutRef.current);
        syncTimeoutRef.current = null;
      }
      unsubscribe?.();
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("focus", onWindowFocus);
    };
  }, [canUseNotifications, isLoading, user?.id]);

  return null;
}
