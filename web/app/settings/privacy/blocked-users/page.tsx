"use client";

import React, { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import Header from "@/app/components/Header";
import { Forbidden2, Trash } from "iconsax-reactjs";
import ActionButton from "@/app/components/ActionButton";
import Alert from "@/app/components/Alert";

type BlockedUser = {
  id: string;
  username: string;
  profilePicture?: string | null;
};

export default function Page() {
  const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [busyIds, setBusyIds] = useState<Set<string>>(new Set());
  const [isUnblockingAll, setIsUnblockingAll] = useState(false);
  const [alert, setAlert] = useState<{
    message: string;
    type: "success" | "error" | "info";
  } | null>(null);

  const fetchBlockedUsers = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/settings/privacy/blocked-users");
      const body = await res.json().catch(() => ({}));
      if (!res.ok)
        throw new Error(body?.error || "Failed to fetch blocked users");
      setBlockedUsers(body.blockedUsers ?? []);
    } catch {
      setAlert({ message: "Failed to load blocked users", type: "error" });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBlockedUsers();
  }, [fetchBlockedUsers]);

  async function handleUnblock(user: BlockedUser) {
    setBusyIds((prev) => new Set(prev).add(user.id));
    try {
      const res = await fetch(
        `/api/users/${encodeURIComponent(user.username)}/block`,
        { method: "DELETE" },
      );
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error || "Failed to unblock user");
      }
      setBlockedUsers((prev) => prev.filter((u) => u.id !== user.id));
      setAlert({
        message: `@${user.username} has been unblocked`,
        type: "success",
      });
    } catch {
      setAlert({
        message: `Failed to unblock @${user.username}`,
        type: "error",
      });
    } finally {
      setBusyIds((prev) => {
        const next = new Set(prev);
        next.delete(user.id);
        return next;
      });
    }
  }

  async function handleUnblockAll() {
    if (blockedUsers.length === 0) return;
    setIsUnblockingAll(true);
    try {
      const results = await Promise.allSettled(
        blockedUsers.map((user) =>
          fetch(`/api/users/${encodeURIComponent(user.username)}/block`, {
            method: "DELETE",
          }),
        ),
      );
      const failedCount = results.filter((r) => r.status === "rejected").length;
      if (failedCount > 0) {
        setAlert({
          message: `Failed to unblock ${failedCount} user(s)`,
          type: "error",
        });
      } else {
        setAlert({ message: "All users have been unblocked", type: "success" });
      }
      await fetchBlockedUsers();
    } catch {
      setAlert({ message: "Failed to unblock all users", type: "error" });
    } finally {
      setIsUnblockingAll(false);
    }
  }

  return (
    <div className="min-h-dvh bg-[#F7F7F7]">
      <Header title="Blocked Users" isLoading={isLoading} />
      <div className="mx-auto max-w-2xl px-4 pb-8 pt-20 sm:px-6">
      {alert && (
        <Alert
          key={`${alert.type}-${alert.message}`}
          message={alert.message}
          type={alert.type}
        />
      )}
      <div className="mb-4 rounded-[20px] bg-[#1D1D1D] px-4 py-4 text-white">
        <p className="text-[11px] uppercase tracking-[0.16em] text-white/55">
          Safety
        </p>
        <h2 className="mt-1 text-lg font-semibold">Manage blocked accounts.</h2>
        <p className="mt-1 text-xs text-white/72">
          Blocked people cannot easily find your profile or interact with your
          content.
        </p>
      </div>
      {!isLoading && blockedUsers.length === 0 ? (
        <p className="py-8 text-center text-sm text-[#8C8C8C]">
          You haven&apos;t blocked anyone.
        </p>
      ) : (
        <div className="space-y-3">
          {blockedUsers.map((user) => (
            <div
              key={user.id}
              className="flex items-center justify-between gap-3 rounded-[20px] border border-black/6 bg-white px-4 py-3"
            >
              <div className="flex items-center gap-3">
                <div className="relative rounded-[14px] bg-[#FDEEEE] p-2.5">
                  <Forbidden2
                    size={40}
                    color="#C04A4A"
                    variant="Bulk"
                    className="absolute inset-0 m-auto"
                  />
                  {user.profilePicture && (
                    <Image
                      src={user.profilePicture}
                      alt={`${user.username}'s profile picture`}
                      width={32}
                      height={32}
                      unoptimized
                      className="rounded-full object-cover"
                    />
                  )}
                </div>
                <div>
                  <p className="text-sm font-medium text-[#3D3D3D]">
                    @{user.username}
                  </p>
                  <p className="text-xs text-[#6B6B6B]">
                    This user is currently blocked.
                  </p>
                </div>
              </div>
              <button
                type="button"
                aria-label={`Unblock ${user.username}`}
                disabled={busyIds.has(user.id) || isUnblockingAll}
                className="transition-opacity hover:opacity-70 active:opacity-40 disabled:opacity-40"
                onClick={() => handleUnblock(user)}
              >
                <Trash size={18} color="#E00505" />
              </button>
            </div>
          ))}
        </div>
      )}
      {blockedUsers.length > 0 && (
        <ActionButton
          className="mt-5 w-full"
          onClick={handleUnblockAll}
          disabled={isUnblockingAll}
        >
          {isUnblockingAll ? "Unblocking..." : "Unblock all"}
        </ActionButton>
      )}
      </div>
    </div>
  );
}
