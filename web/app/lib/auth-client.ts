"use client";

import { useEffect, useState } from "react";

type User = {
  id: string;
  email: string;
  pendingEmail?: string | null;
  emailVerified: boolean;
  username: string;
  displayName: string;
  profilePicture?: string | null;
  profileBackground: string;
  visibilityPublicProfile: boolean;
  visibilityPublicPosts: boolean;
  visibilityPublicComments: boolean;
  visibilityOnlineStatus: boolean;
  linkedSEOs: string[];
  subscriptionPlan: string;
  subscriptionStartedAt?: string | null;
  subscriptionEndsAt?: string | null;
  pendingSubscriptionPlan?: string | null;
  pendingSubscriptionAction?: string | null;
  pendingSubscriptionEffectiveAt?: string | null;
  createdAt?: string | null;
  followersCount: number;
  followingCount: number;
  institution?: string | null;
  institutionVisibility?: string | null;
  program?: string | null;
  programVisibility?: string | null;
  emailNotificationsAccountActivity: boolean;
  emailNotificationsWeeklySummary: boolean;
  emailNotificationsProductUpdates: boolean;
  emailNotificationsMarketing: boolean;
  pushNotificationsLikes: boolean;
  pushNotificationsComments: boolean;
  pushNotificationsFollows: boolean;
  pushNotificationsMentions: boolean;
  theme: string;
  tokenBalance: number;
  tokensEarned: number;
  tokensRedeemed: number;
};

type AuthState = {
  user: User | null;
  loading: boolean;
  hasResolvedInitialAuth: boolean;
};

let cachedUser: User | null = null;
let cachedLoading = true;
let cachedHasResolvedInitialAuth = false;
let inFlight: Promise<User | null> | null = null;
const listeners = new Set<(state: AuthState) => void>();

const notify = () => {
  const state = {
    user: cachedUser,
    loading: cachedLoading,
    hasResolvedInitialAuth: cachedHasResolvedInitialAuth,
  };
  listeners.forEach((listener) => listener(state));
};

const fetchMe = async () => {
  if (inFlight) return inFlight;
  cachedLoading = true;
  notify();

  inFlight = fetch("/api/auth/me")
    .then(async (res) => {
      if (!res.ok) return null;
      const body = await res.json().catch(() => ({}));
      return body?.user ?? null;
    })
    .catch(() => null)
    .finally(() => {
      cachedLoading = false;
      cachedHasResolvedInitialAuth = true;
    })
    .then((user) => {
      cachedUser = user;
      inFlight = null;
      notify();
      return user;
    });

  return inFlight;
};

export const refreshAuth = () => fetchMe();

export const useAuth = () => {
  const [state, setState] = useState<AuthState>({
    user: cachedUser,
    loading: cachedLoading,
    hasResolvedInitialAuth: cachedHasResolvedInitialAuth,
  });

  useEffect(() => {
    const listener = (next: AuthState) => setState(next);
    listeners.add(listener);
    if (cachedLoading) fetchMe();

    return () => {
      listeners.delete(listener);
    };
  }, []);

  return {
    user: state.user,
    isLoading: state.loading,
    hasResolvedInitialAuth: state.hasResolvedInitialAuth,
    refresh: refreshAuth,
  };
};
