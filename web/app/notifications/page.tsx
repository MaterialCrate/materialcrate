"use client";

import React, { useCallback, useEffect, useMemo } from "react";
import Image from "next/image";
import {
  ArchiveMinus,
  DocumentText1,
  Heart,
  Like1,
  Notification,
  type Icon as IconsaxIcon,
  MedalStar,
  MessageText1,
  Profile2User,
  Setting4,
} from "iconsax-reactjs";
import Header from "../components/Header";
import Alert from "../components/Alert";

type NotificationItem = {
  id: string | number;
  type?: string;
  title: string;
  description: string;
  icon?: string;
  profilePicture?: string | null;
  time: string;
  accent: string;
  unread?: boolean;
  imageLabel: string;
  imageTone: string;
  Icon: IconsaxIcon;
};

type ApiNotificationItem = {
  id: string | number;
  type?: string;
  title: string;
  description: string;
  icon?: string;
  profilePicture?: string | null;
  unread?: boolean;
  time: string;
};

const ICON_STYLES: Record<
  string,
  { accent: string; imageTone: string; Icon: IconsaxIcon }
> = {
  MessageText1: {
    accent: "#E1761F",
    imageTone: "bg-[#FFE6CF] text-[#B76217]",
    Icon: MessageText1,
  },
  MedalStar: {
    accent: "#1D1D1D",
    imageTone: "bg-[#EFEFEF] text-[#202020]",
    Icon: MedalStar,
  },
  ArchiveMinus: {
    accent: "#5F6FFF",
    imageTone: "bg-[#E8EBFF] text-[#4150D8]",
    Icon: ArchiveMinus,
  },
  Profile2User: {
    accent: "#1F9D75",
    imageTone: "bg-[#DBF5EC] text-[#197356]",
    Icon: Profile2User,
  },
  DocumentText1: {
    accent: "#D14D72",
    imageTone: "bg-[#FFE0E8] text-[#B33F61]",
    Icon: DocumentText1,
  },
  Setting4: {
    accent: "#7C5CFA",
    imageTone: "bg-[#EEE8FF] text-[#684AD9]",
    Icon: Setting4,
  },
  Like1: {
    accent: "#D14D72",
    imageTone: "bg-[#FFE0E8] text-[#B33F61]",
    Icon: Like1,
  },
  Heart: {
    accent: "#D14D72",
    imageTone: "bg-[#FFE0E8] text-[#B33F61]",
    Icon: Heart,
  },
  Notification: {
    accent: "#1D1D1D",
    imageTone: "bg-[#EFEFEF] text-[#202020]",
    Icon: Notification,
  },
};

const getImageLabel = (title: string) => {
  const letters = title
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? "")
    .join("");

  return letters || "NT";
};

const getGroupLabel = (time: string) => {
  const parsed = new Date(time);
  if (Number.isNaN(parsed.getTime())) {
    return "Earlier this week";
  }

  const now = new Date();
  const startOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
  );
  const startOfItemDay = new Date(
    parsed.getFullYear(),
    parsed.getMonth(),
    parsed.getDate(),
  );

  const diffDays = Math.floor(
    (startOfToday.getTime() - startOfItemDay.getTime()) / (1000 * 60 * 60 * 24),
  );

  if (diffDays <= 0) return "Today";
  if (diffDays <= 7) return "Earlier this week";
  return parsed.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
};

export default function Page() {
  const [notifications, setNotifications] = React.useState<
    ApiNotificationItem[]
  >([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const formatNotificationTime = (value: string) => {
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      return value;
    }

    return parsed.toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  const fetchNotifications = useCallback(async () => {
    try {
      setError(null);
      const response = await fetch("/api/notifications?limit=100", {
        method: "GET",
        cache: "no-store",
      });

      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError("Failed to fetch notifications");
        console.error(
          "Failed to fetch notifications: ",
          body?.error,
          body?.details,
        );
        return;
      }

      const items = Array.isArray(body?.notifications)
        ? (body.notifications as ApiNotificationItem[])
        : [];
      setNotifications(items);
    } catch {
      setError("Failed to fetch notifications");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const notificationGroups = useMemo(() => {
    const groupsMap = new Map<string, NotificationItem[]>();

    for (const notification of notifications) {
      const style =
        ICON_STYLES[notification.icon ?? ""] ?? ICON_STYLES.Notification;
      const groupLabel = getGroupLabel(notification.time);
      const current = groupsMap.get(groupLabel) ?? [];

      current.push({
        id: notification.id,
        type: notification.type,
        title: notification.title,
        description: notification.description,
        profilePicture: notification.profilePicture ?? null,
        time: formatNotificationTime(notification.time),
        unread: Boolean(notification.unread),
        imageLabel: getImageLabel(notification.title),
        imageTone: style.imageTone,
        accent: style.accent,
        Icon: style.Icon,
      });

      groupsMap.set(groupLabel, current);
    }

    const orderedLabels = ["Today", "Earlier this week"];
    const groupEntries = Array.from(groupsMap.entries()).sort(
      ([left], [right]) => {
        const leftIndex = orderedLabels.indexOf(left);
        const rightIndex = orderedLabels.indexOf(right);
        if (leftIndex === -1 && rightIndex === -1)
          return left.localeCompare(right);
        if (leftIndex === -1) return 1;
        if (rightIndex === -1) return -1;
        return leftIndex - rightIndex;
      },
    );

    return groupEntries.map(([label, items]) => ({ label, items }));
  }, [notifications]);

  useEffect(() => {
    void fetchNotifications();
  }, [fetchNotifications]);

  const markAllAsRead = async () => {
    try {
      const response = await fetch("/api/notifications", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ markAll: true }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        setError("Failed to read notifications");
        console.error("Failed to mark notifications as read: ", body?.error);
        return;
      }

      setNotifications((previous) =>
        previous.map((item) => ({
          ...item,
          unread: false,
        })),
      );
    } catch {
      setError("Failed to read notifications");
    }
  };

  const markOneAsRead = async (notificationId: string | number) => {
    try {
      const response = await fetch("/api/notifications", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ notificationId }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        setError("Failed to read notification");
        console.error("Failed to mark notification as read: ", body?.error);
        return;
      }

      setNotifications((previous) =>
        previous.map((item) =>
          String(item.id) === String(notificationId)
            ? {
                ...item,
                unread: false,
              }
            : item,
        ),
      );
    } catch {
      setError("Failed to mark notification as read");
    }
  };

  return (
    <div className="min-h-dvh bg-[#F7F7F7] px-4 pb-28 pt-20">
      <Header title="Notifications" isLoading={isLoading} />
      {error && <Alert message={error} type="error" />}

      <main className="space-y-5">
        {notificationGroups.map((group) => (
          <section key={group.label}>
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-[11px] font-medium uppercase tracking-[0.14em] text-[#8A8A8A]">
                {group.label}
              </h2>
              <button
                type="button"
                onClick={() => {
                  void markAllAsRead();
                }}
                className="text-xs font-medium text-[#8A8A8A]"
              >
                Mark all as read
              </button>
            </div>

            <div className="space-y-3">
              {group.items.map((item) => (
                <article
                  key={item.id}
                  className="rounded-[22px] border border-black/6 bg-white px-4 py-4 shadow-[0_10px_30px_rgba(17,17,17,0.04)] active:opacity-50 cursor-pointer"
                  onClick={() => {
                    void (item.unread && markOneAsRead(item.id));
                  }}
                >
                  <div className="flex items-start gap-3">
                    <div className="relative shrink-0">
                      <div
                        className={`relative flex h-13 w-13 items-center justify-center overflow-hidden rounded-[18px] text-sm font-semibold ${item.imageTone}`}
                      >
                        {item.profilePicture ? (
                          <Image
                            src={item.profilePicture}
                            alt={item.title}
                            fill
                            sizes="52px"
                            unoptimized
                            className="object-cover"
                          />
                        ) : (
                          item.imageLabel
                        )}
                      </div>
                      <div
                        className="absolute -right-1 -bottom-1 flex h-7 w-7 items-center justify-center rounded-full border-2 border-white"
                        style={{ backgroundColor: item.accent }}
                      >
                        <item.Icon size={14} color="#FFFFFF" variant="Bulk" />
                      </div>
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h3 className="text-sm font-semibold text-[#262626]">
                            {item.title}
                          </h3>
                        </div>
                        <p className="flex items-center gap-2 shrink-0 text-[11px] font-medium text-[#8A8A8A]">
                          {item.unread && (
                            <span className="h-2.5 w-2.5 rounded-full bg-[#E1761F]" />
                          )}
                          {item.time}
                        </p>
                      </div>

                      <p className="text-sm leading-6 text-[#666666]">
                        {item.description}
                      </p>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>
        ))}
      </main>
    </div>
  );
}
