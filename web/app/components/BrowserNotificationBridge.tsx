"use client";

import { useEffect, useMemo, useRef } from "react";

type NotificationItem = {
  id: string;
  type: string;
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
  const seenIdsRef = useRef<Set<string>>(new Set());
  const pushPrefsRef = useRef<PushPrefs>(DEFAULT_PUSH_PREFS);
  const canUseNotifications = useMemo(
    () => typeof window !== "undefined" && "Notification" in window,
    [],
  );

  useEffect(() => {
    if (!canUseNotifications) {
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

          new window.Notification(item.title, {
            body: item.description,
            tag: `mc-${item.id}`,
          });
        }

        saveSeenIdsToStorage(seenIdsRef.current);
      } catch {}
    };

    void requestPermission()
      .then(() => fetchPushPrefs())
      .then(() => syncUnreadNotifications());

    const intervalId = window.setInterval(() => {
      void fetchPushPrefs().then(() => syncUnreadNotifications());
    }, 30000);

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void syncUnreadNotifications();
      }
    };

    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [canUseNotifications]);

  return null;
}
