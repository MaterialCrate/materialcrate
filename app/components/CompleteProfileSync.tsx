"use client";

import { useUser } from "@auth0/nextjs-auth0/client";
import { useEffect, useRef } from "react";

const PENDING_PROFILE_KEY = "pendingProfile";

type PendingProfile = {
  username?: string;
  institution?: string;
  program?: string;
  email?: string;
};

export default function CompleteProfileSync() {
  const { user, isLoading } = useUser();
  const hasRunRef = useRef(false);

  useEffect(() => {
    if (hasRunRef.current || isLoading || !user) return;

    const raw = localStorage.getItem(PENDING_PROFILE_KEY);
    if (!raw) {
      hasRunRef.current = true;
      return;
    }

    let payload: PendingProfile | null = null;
    try {
      payload = JSON.parse(raw) as PendingProfile;
    } catch {
      localStorage.removeItem(PENDING_PROFILE_KEY);
      hasRunRef.current = true;
      return;
    }

    if (!payload || Object.keys(payload).length === 0) {
      localStorage.removeItem(PENDING_PROFILE_KEY);
      hasRunRef.current = true;
      return;
    }

    fetch("/api/graphql/complete-profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
      .then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || "Failed to complete profile");
        }
        localStorage.removeItem(PENDING_PROFILE_KEY);
      })
      .catch(() => {
        // Keep pending profile for retry on next page load.
      })
      .finally(() => {
        hasRunRef.current = true;
      });
  }, [isLoading, user]);

  return null;
}
