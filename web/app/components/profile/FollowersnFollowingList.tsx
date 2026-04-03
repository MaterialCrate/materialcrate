"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ArrowLeft2, Verify } from "iconsax-reactjs";
import { subscribeToFollowActivity } from "@/app/lib/post-activity-realtime";

export type FollowListTab = "followers" | "following";

type FollowConnection = {
  id: string;
  username: string;
  displayName: string;
  profilePicture?: string | null;
  subscriptionPlan?: string | null;
  isCurrentUser: boolean;
  isFollowedByCurrentUser: boolean;
  isFollowingCurrentUser: boolean;
  followActionLabel: "Follow" | "Follow back" | "Unfollow" | null;
};

type FollowersnFollowingListProps = {
  isOpen: boolean;
  userId?: string;
  username?: string;
  subscriptionPlan?: string | null;
  initialTab: FollowListTab;
  onClose: () => void;
  onCountsChange?: (counts: {
    followersCount: number;
    followingCount: number;
  }) => void;
};

const normalizeUsername = (value?: string | null) =>
  String(value || "")
    .trim()
    .toLowerCase();

const getActionLabel = (
  user: Pick<
    FollowConnection,
    "isCurrentUser" | "isFollowedByCurrentUser" | "isFollowingCurrentUser"
  >,
): FollowConnection["followActionLabel"] => {
  if (user.isCurrentUser) {
    return null;
  }

  if (user.isFollowedByCurrentUser) {
    return "Unfollow";
  }

  if (user.isFollowingCurrentUser) {
    return "Follow back";
  }

  return "Follow";
};

export default function FollowersnFollowingList({
  isOpen,
  userId,
  username,
  subscriptionPlan,
  initialTab,
  onClose,
  onCountsChange,
}: FollowersnFollowingListProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<FollowListTab>(initialTab);
  const [followers, setFollowers] = useState<FollowConnection[]>([]);
  const [following, setFollowing] = useState<FollowConnection[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [updatingUsernames, setUpdatingUsernames] = useState<string[]>([]);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
    }
  }, [initialTab, isOpen]);

  useEffect(() => {
    if (!isOpen || !username?.trim()) {
      return;
    }

    const controller = new AbortController();

    const loadConnections = async () => {
      setIsLoading(true);
      setError("");

      try {
        const response = await fetch(
          `/api/users/${encodeURIComponent(username)}/connections`,
          {
            cache: "no-store",
            signal: controller.signal,
          },
        );
        const body = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error(body?.error || "Failed to load connections");
        }

        if (!controller.signal.aborted) {
          const nextFollowers = Array.isArray(body?.followers)
            ? body.followers
            : [];
          const nextFollowing = Array.isArray(body?.following)
            ? body.following
            : [];

          setFollowers(nextFollowers);
          setFollowing(nextFollowing);
          onCountsChange?.({
            followersCount: nextFollowers.length,
            followingCount: nextFollowing.length,
          });
        }
      } catch (err) {
        if (!controller.signal.aborted) {
          setFollowers([]);
          setFollowing([]);
          setError("Failed to load connections");
          console.error("Error loading connections:", err);
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    };

    void loadConnections();

    return () => controller.abort();
  }, [isOpen, onCountsChange, reloadKey, username]);

  useEffect(() => {
    if (!isOpen || !userId?.trim()) {
      return;
    }

    let unsubscribe: (() => void) | undefined;
    let isDisposed = false;

    void subscribeToFollowActivity(userId, () => {
      setReloadKey((current) => current + 1);
    }).then((cleanup) => {
      if (isDisposed) {
        cleanup();
        return;
      }

      unsubscribe = cleanup;
    });

    return () => {
      isDisposed = true;
      unsubscribe?.();
    };
  }, [isOpen, userId]);

  const activeList = useMemo(
    () => (activeTab === "followers" ? followers : following),
    [activeTab, followers, following],
  );

  const updateConnectionsForUsername = (
    targetUsername: string,
    updater: (entry: FollowConnection) => FollowConnection,
  ) => {
    setFollowers((current) =>
      current.map((entry) =>
        normalizeUsername(entry.username) === targetUsername
          ? updater(entry)
          : entry,
      ),
    );
    setFollowing((current) =>
      current.map((entry) =>
        normalizeUsername(entry.username) === targetUsername
          ? updater(entry)
          : entry,
      ),
    );
  };

  const handleFollowToggle = async (entry: FollowConnection) => {
    const targetUsername = normalizeUsername(entry.username);

    if (!targetUsername || entry.isCurrentUser) {
      return;
    }

    const shouldUnfollow = entry.isFollowedByCurrentUser;

    setUpdatingUsernames((current) => [...current, targetUsername]);
    setError("");

    updateConnectionsForUsername(targetUsername, (current) => {
      const nextEntry = {
        ...current,
        isFollowedByCurrentUser: !shouldUnfollow,
      };

      return {
        ...nextEntry,
        followActionLabel: getActionLabel(nextEntry),
      };
    });

    try {
      const response = await fetch(
        `/api/users/${encodeURIComponent(entry.username)}/follow`,
        {
          method: shouldUnfollow ? "DELETE" : "POST",
        },
      );
      const body = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(body?.error || "Failed to update follow state");
      }
    } catch (err) {
      updateConnectionsForUsername(targetUsername, (current) => {
        const nextEntry = {
          ...current,
          isFollowedByCurrentUser: shouldUnfollow,
        };

        return {
          ...nextEntry,
          followActionLabel: getActionLabel(nextEntry),
        };
      });
      setError("Failed to update follow state");
      console.error("Error updating follow state:", err);
      if (err instanceof Error && err.message === "Not authenticated") {
        router.push("/login");
      }
    } finally {
      setUpdatingUsernames((current) =>
        current.filter((usernameEntry) => usernameEntry !== targetUsername),
      );
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <section className="fixed inset-0 z-70 flex h-dvh flex-col bg-[#FBFBFB]">
      <div className="border-b border-black/10 px-4 pt-5 bg-white">
        <div className="flex items-center gap-3">
          <button
            type="button"
            aria-label="Close follow list"
            onClick={onClose}
          >
            <ArrowLeft2 size={22} color="#1E1E1E" />
          </button>
          <div className="flex items-center gap-1">
            <p className="text-base font-semibold text-[#1E1E1E]">{username}</p>
            {subscriptionPlan === "pro" && (
              <Verify size={18} color="#E1761F" variant="Bold" />
            )}
          </div>
        </div>
        <div className="relative mt-5 grid grid-cols-2">
          <span
            aria-hidden="true"
            className={`pointer-events-none absolute bottom-0 left-0 h-0.75 w-1/2 bg-[#1E1E1E] transition-transform duration-300 ease-out ${
              activeTab === "followers" ? "translate-x-0" : "translate-x-full"
            }`}
          />
          <button
            type="button"
            className={`pb-3 text-center text-sm font-medium transition-colors ${
              activeTab === "followers" ? "text-[#1E1E1E]" : "text-[#7B7B7B]"
            }`}
            onClick={() => setActiveTab("followers")}
          >
            Followers
          </button>
          <button
            type="button"
            className={`pb-3 text-center text-sm font-medium transition-colors ${
              activeTab === "following" ? "text-[#1E1E1E]" : "text-[#7B7B7B]"
            }`}
            onClick={() => setActiveTab("following")}
          >
            Following
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-6 pt-3">
        {error ? <p className="py-4 text-sm text-[#696969]">{error}</p> : null}
        {isLoading ? (
          <p className="py-4 text-sm text-[#696969]">Loading users...</p>
        ) : activeList.length === 0 ? (
          <p className="py-4 text-sm text-[#696969]">
            No {activeTab === "followers" ? "followers" : "following"} yet.
          </p>
        ) : (
          <div className="space-y-4">
            {activeList.map((entry) => {
              const normalizedEntryUsername = normalizeUsername(entry.username);
              const isUpdating = updatingUsernames.includes(
                normalizedEntryUsername,
              );

              return (
                <div
                  key={entry.id}
                  className="flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3">
                    {entry.profilePicture ? (
                      <Image
                        src={entry.profilePicture}
                        alt={entry.displayName}
                        width={52}
                        height={52}
                        className="h-13 w-13 rounded-xl object-cover"
                        unoptimized
                      />
                    ) : (
                      <div className="flex h-13 w-13 items-center justify-center rounded-xl bg-[#E9E9E9]">
                        <span className="text-lg font-semibold text-[#6D6D6D]">
                          {entry.displayName.charAt(0)}
                        </span>
                      </div>
                    )}
                    <div className="min-w-0">
                      <div className="flex items-center gap-1">
                        <p className="truncate text-sm font-semibold text-[#000000]">
                          {entry.displayName}
                        </p>
                        {entry.subscriptionPlan?.trim().toLowerCase() ===
                        "pro" ? (
                          <Verify size={16} color="#E1761F" variant="Bold" />
                        ) : null}
                      </div>
                      <p className="truncate text-xs font-medium text-[#585858]">
                        @{entry.username}
                      </p>
                    </div>
                  </div>
                  {entry.followActionLabel ? (
                    <button
                      type="button"
                      onClick={() => void handleFollowToggle(entry)}
                      disabled={isUpdating}
                      className={`min-w-24 rounded-full border px-4 py-2 text-sm font-medium disabled:opacity-60 ${
                        entry.followActionLabel === "Unfollow"
                          ? "border-[#979797] text-[#202020]"
                          : "border-black bg-[#131212] text-white"
                      }`}
                    >
                      {isUpdating ? "..." : entry.followActionLabel}
                    </button>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
