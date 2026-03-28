"use client";

import { useEffect, useMemo, useRef } from "react";

type NotificationItem = {
  id: string;
  title: string;
  description: string;
  unread: boolean;
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

    const syncUnreadNotifications = async () => {
      try {
        const response = await fetch("/api/notifications?limit=20&unreadOnly=true", {
          method: "GET",
          cache: "no-store",
        });

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

          new window.Notification(item.title, {
            body: item.description,
            tag: `mc-${item.id}`,
          });

          seenIdsRef.current.add(item.id);
        }

        saveSeenIdsToStorage(seenIdsRef.current);
      } catch {}
    };

    void requestPermission().then(() => syncUnreadNotifications());

    const intervalId = window.setInterval(() => {
      void syncUnreadNotifications();
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
