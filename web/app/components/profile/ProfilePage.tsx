"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/lib/auth-client";
import { subscribeToFollowActivity } from "@/app/lib/post-activity-realtime";
import Acheivement from "@/app/components/profile/Acheivement";
import Header, { type ProfileTab } from "@/app/components/profile/Header";
import Post, {
  type HomePost,
  type PostOptionsAnchor,
} from "@/app/components/home/Post";
import CommentDrawer from "@/app/components/home/CommentDrawer";
import OptionsDrawer from "@/app/components/home/PostOptions";
import PdfViewerModal from "@/app/components/home/PdfViewerModal";
import UploadDrawer from "@/app/components/home/UploadDrawer";
import FollowersnFollowingList from "./FollowersnFollowingList";
import Alert from "../Alert";

type ProfileFieldVisibility = "everyone" | "followers" | "only_you";

type ProfileUser = {
  id: string;
  username: string;
  displayName: string;
  profilePicture?: string | null;
  profileBackground?: string | null;
  followersCount?: number | null;
  followingCount?: number | null;
  subscriptionPlan?: string | null;
  isBot?: boolean;
  institution?: string | null;
  institutionVisibility?: string | null;
  program?: string | null;
  programVisibility?: string | null;
  visibilityPublicProfile?: boolean;
  isFollowedByCurrentUser?: boolean;
  isFollowingCurrentUser?: boolean;
  hasPendingFollowRequest?: boolean;
};

type ProfilePageProps = {
  username?: string;
};

const normalizeUsername = (value?: string | null) =>
  value?.trim().toLowerCase() || "";

const normalizeProfileFieldVisibility = (
  value?: string | null,
): ProfileFieldVisibility => {
  const normalized = value?.trim().toLowerCase();

  if (normalized === "followers" || normalized === "only_you") {
    return normalized;
  }

  return "everyone";
};

export default function ProfilePage({ username }: ProfilePageProps) {
  const router = useRouter();
  const { user, isLoading: isLoadingAuth } = useAuth();
  const routeUsername = username?.trim() || "";
  const isPublicProfile = routeUsername.length > 0;
  const [profile, setProfile] = useState<ProfileUser | null>(null);
  const [posts, setPosts] = useState<HomePost[]>([]);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [isLoadingPosts, setIsLoadingPosts] = useState(true);
  const [error, setError] = useState<string>("");
  const [isCommentDrawerOpen, setIsCommentDrawerOpen] = useState(false);
  const [isUploadDrawerOpen, setIsUploadDrawerOpen] = useState(false);
  const [isPostOptionsDrawerOpen, setIsPostOptionsDrawerOpen] = useState(false);
  const [activeCommentPostId, setActiveCommentPostId] = useState<string | null>(
    null,
  );
  const [activeCommentPost, setActiveCommentPost] = useState<HomePost | null>(
    null,
  );
  const [activeOptionsPost, setActiveOptionsPost] = useState<HomePost | null>(
    null,
  );
  const [activeOptionsAnchor, setActiveOptionsAnchor] =
    useState<PostOptionsAnchor | null>(null);
  const [activePdfPost, setActivePdfPost] = useState<HomePost | null>(null);
  const [editingPost, setEditingPost] = useState<HomePost | null>(null);
  const [isUpdatingFollow, setIsUpdatingFollow] = useState(false);
  const [selectedTab, setSelectedTab] = useState<ProfileTab>("posts");
  const [selectedFollowList, setSelectedFollowList] = useState<
    "followers" | "following" | null
  >(null);

  const handleFollowCountsChange = useCallback(
    ({
      followersCount,
      followingCount,
    }: {
      followersCount: number;
      followingCount: number;
    }) => {
      setProfile((current) =>
        current
          ? {
              ...current,
              followersCount,
              followingCount,
            }
          : current,
      );
    },
    [],
  );

  useEffect(() => {
    let isCancelled = false;

    const loadProfile = async () => {
      setError("");
      setIsLoadingProfile(true);

      try {
        if (!isPublicProfile) {
          if (isLoadingAuth) {
            return;
          }

          if (!user) {
            if (!isCancelled) {
              setProfile(null);
              setIsLoadingProfile(false);
            }
            return;
          }

          if (!isCancelled) {
            setProfile(user as ProfileUser);
            setIsLoadingProfile(false);
          }
          return;
        }

        const response = await fetch(
          `/api/users/${encodeURIComponent(routeUsername)}`,
          {
            cache: "no-store",
          },
        );
        const body = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error(body?.error || "Failed to load profile");
        }

        if (!isCancelled) {
          setProfile(body?.user ?? null);
          setIsLoadingProfile(false);
        }
      } catch (err) {
        if (!isCancelled) {
          setProfile(null);
          setError(
            err instanceof Error ? err.message : "Failed to load profile",
          );
          setIsLoadingProfile(false);
        }
      }
    };

    void loadProfile();

    return () => {
      isCancelled = true;
    };
  }, [isLoadingAuth, isPublicProfile, routeUsername, user]);

  useEffect(() => {
    const profileUsername = profile?.username?.trim();

    if (!profileUsername) {
      setPosts([]);
      setIsLoadingPosts(false);
      return;
    }

    const controller = new AbortController();

    const loadPosts = async () => {
      setIsLoadingPosts(true);

      try {
        const response = await fetch(
          `/api/posts?author=${encodeURIComponent(profileUsername)}`,
          {
            cache: "no-store",
            signal: controller.signal,
          },
        );
        const body = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error(body?.error || "Failed to load posts");
        }

        if (!controller.signal.aborted) {
          setPosts(Array.isArray(body?.posts) ? body.posts : []);
        }
      } catch (err) {
        if (!controller.signal.aborted) {
          setPosts([]);
          setError("Failed to load posts");
          console.error("Failed to load posts: ", err);
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsLoadingPosts(false);
        }
      }
    };

    void loadPosts();

    return () => controller.abort();
  }, [profile?.username]);

  useEffect(() => {
    if (!profile?.id) {
      return;
    }

    let unsubscribe: (() => void) | undefined;
    let isDisposed = false;

    void subscribeToFollowActivity(profile.id, (event) => {
      setProfile((current) => {
        if (!current || current.id !== event.userId) {
          return current;
        }

        const nextProfile: ProfileUser = {
          ...current,
          followersCount:
            typeof event.followersCount === "number"
              ? event.followersCount
              : current.followersCount,
          followingCount:
            typeof event.followingCount === "number"
              ? event.followingCount
              : current.followingCount,
        };

        if (user?.id && event.actorId === user.id) {
          if (event.reason === "unfollowed") {
            nextProfile.isFollowedByCurrentUser = false;
            nextProfile.hasPendingFollowRequest = false;
          } else {
            nextProfile.isFollowedByCurrentUser = true;
            nextProfile.hasPendingFollowRequest = false;
          }
        }

        return nextProfile;
      });
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
  }, [profile?.id, user?.id]);

  const isOwner =
    normalizeUsername(user?.username as string) !== "" &&
    normalizeUsername(user?.username as string) ===
      normalizeUsername(profile?.username as string);
  const displayName =
    profile?.displayName?.trim() || profile?.username?.trim() || "Unknown User";
  const profileUsername = profile?.username
    ? `@${profile.username}`
    : "@unknown";
  const profilePictureUrl = profile?.profilePicture?.trim() || "";
  const followerCount = profile?.followersCount ?? 0;
  const followingCount = profile?.followingCount ?? 0;
  const postsHeading = isOwner ? "My Posts" : "Posts";
  const isPrivateProfile = profile?.visibilityPublicProfile === false;
  const isFollower = Boolean(profile?.isFollowedByCurrentUser);
  const hasPendingRequest = Boolean(profile?.hasPendingFollowRequest);
  const canViewContent = isOwner || !isPrivateProfile || isFollower;
  const showInstitution =
    normalizeProfileFieldVisibility(profile?.institutionVisibility) !==
    "only_you";
  const showProgram =
    normalizeProfileFieldVisibility(profile?.programVisibility) !== "only_you";
  const followLabel: "Follow" | "Following" | "Follow back" | "Requested" =
    profile?.isFollowedByCurrentUser
      ? "Following"
      : hasPendingRequest
        ? "Requested"
        : profile?.isFollowingCurrentUser
          ? "Follow back"
          : "Follow";

  const handleFollowToggle = async () => {
    if (!profile?.username) {
      return;
    }

    if (!user) {
      router.push("/login");
      return;
    }

    if (isUpdatingFollow) {
      return;
    }

    const shouldUnfollow = Boolean(profile.isFollowedByCurrentUser);
    const shouldCancelRequest =
      Boolean(profile.hasPendingFollowRequest) && !shouldUnfollow;
    const previousFollowed = Boolean(profile.isFollowedByCurrentUser);
    const previousPending = Boolean(profile.hasPendingFollowRequest);
    const previousFollowerCount = profile.followersCount ?? 0;

    setIsUpdatingFollow(true);
    setError("");

    if (shouldCancelRequest) {
      // Cancel pending follow request
      setProfile((current) =>
        current ? { ...current, hasPendingFollowRequest: false } : current,
      );

      try {
        const response = await fetch(
          `/api/users/${encodeURIComponent(profile.username)}/follow?cancelRequest=true`,
          { method: "DELETE" },
        );
        const body = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(body?.error || "Failed to cancel follow request");
        }
      } catch (err) {
        setProfile((current) =>
          current
            ? { ...current, hasPendingFollowRequest: previousPending }
            : current,
        );
        setError("Failed to cancel follow request");
        console.error("Error cancelling follow request:", err);
      } finally {
        setIsUpdatingFollow(false);
      }
      return;
    }

    // Normal follow/unfollow
    // For private profiles, optimistically show "Requested" instead of "Following"
    const isTargetPrivate = isPrivateProfile && !shouldUnfollow;
    setProfile((current) =>
      current
        ? {
            ...current,
            isFollowedByCurrentUser: isTargetPrivate ? false : !shouldUnfollow,
            hasPendingFollowRequest: isTargetPrivate ? true : previousPending,
            followersCount: isTargetPrivate
              ? previousFollowerCount
              : Math.max(0, previousFollowerCount + (shouldUnfollow ? -1 : 1)),
          }
        : current,
    );

    try {
      const response = await fetch(
        `/api/users/${encodeURIComponent(profile.username)}/follow`,
        {
          method: shouldUnfollow ? "DELETE" : "POST",
        },
      );
      const body = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(body?.error || "Failed to update follow state");
      }

      // If the response indicates it was a pending request (private profile)
      if (body?.pending) {
        setProfile((current) =>
          current
            ? {
                ...current,
                isFollowedByCurrentUser: false,
                hasPendingFollowRequest: true,
                followersCount: previousFollowerCount,
              }
            : current,
        );
      }
    } catch (err) {
      setProfile((current) =>
        current
          ? {
              ...current,
              isFollowedByCurrentUser: previousFollowed,
              hasPendingFollowRequest: previousPending,
              followersCount: previousFollowerCount,
            }
          : current,
      );
      setError("Failed to update follow state");
      console.error("Error updating follow state:", err);
    } finally {
      setIsUpdatingFollow(false);
    }
  };

  const handlePostPinned = (pinnedPost: HomePost) => {
    setPosts((current) => {
      const nextPosts = current.map((post) => {
        if (post.id === pinnedPost.id) {
          return { ...post, ...pinnedPost, pinned: Boolean(pinnedPost.pinned) };
        }

        if (
          post.author?.id &&
          pinnedPost.author?.id &&
          post.author.id === pinnedPost.author.id
        ) {
          return { ...post, pinned: false };
        }

        return post;
      });

      nextPosts.sort((left, right) => {
        if (Boolean(left.pinned) === Boolean(right.pinned)) return 0;
        return left.pinned ? -1 : 1;
      });

      return nextPosts;
    });

    setActiveOptionsPost((current) =>
      current?.id === pinnedPost.id
        ? { ...current, ...pinnedPost, pinned: Boolean(pinnedPost.pinned) }
        : current,
    );
  };

  const handlePostUpdated = (updatedPost: HomePost) => {
    const updatedAuthorUsername =
      updatedPost.author?.username?.trim().toLowerCase() || "";

    setPosts((current) =>
      current.map((post) =>
        post.id === updatedPost.id
          ? { ...post, ...updatedPost }
          : updatedAuthorUsername &&
              post.author?.username?.trim().toLowerCase() ===
                updatedAuthorUsername
            ? {
                ...post,
                isAuthorFollowedByCurrentUser:
                  updatedPost.isAuthorFollowedByCurrentUser,
                isAuthorMutedByCurrentUser:
                  updatedPost.isAuthorMutedByCurrentUser,
                isAuthorBlockedByCurrentUser:
                  updatedPost.isAuthorBlockedByCurrentUser,
              }
            : post,
      ),
    );
    setActiveOptionsPost((current) =>
      current?.id === updatedPost.id ? { ...current, ...updatedPost } : current,
    );
    setActiveCommentPost((current) =>
      current?.id === updatedPost.id ? { ...current, ...updatedPost } : current,
    );
  };

  const handlePostDeleted = (deletedPostId: string) => {
    setPosts((current) => current.filter((post) => post.id !== deletedPostId));
    setActiveOptionsPost((current) =>
      current?.id === deletedPostId ? null : current,
    );
    setActiveCommentPost((current) =>
      current?.id === deletedPostId ? null : current,
    );
    setActiveCommentPostId((current) =>
      current === deletedPostId ? null : current,
    );
    setActivePdfPost((current) =>
      current?.id === deletedPostId ? null : current,
    );
  };

  if (!isPublicProfile && isLoadingAuth) {
    return (
      <p className="px-6 py-8 text-sm text-[#696969]">Loading profile...</p>
    );
  }

  if (!isPublicProfile && !user) {
    return (
      <div className="px-6 py-10 space-y-4">
        <p className="text-sm text-[#696969]">Sign in to view your profile.</p>
        <button
          type="button"
          onClick={() => router.push("/login")}
          className="rounded-full bg-[#E1761F] px-4 py-2 text-sm font-medium text-white"
        >
          Go to login
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-24">
      <Alert message={error} type="error" />
      <CommentDrawer
        isOpen={isCommentDrawerOpen}
        onClose={() => {
          setIsCommentDrawerOpen(false);
          setActiveCommentPostId(null);
          setActiveCommentPost(null);
        }}
        postId={activeCommentPostId}
        post={activeCommentPost}
      />
      <UploadDrawer
        isOpen={isUploadDrawerOpen}
        post={editingPost}
        onClose={() => {
          setIsUploadDrawerOpen(false);
          setEditingPost(null);
        }}
        onPostSaved={(savedPost) => {
          setPosts((current) =>
            current.map((post) =>
              post.id === savedPost.id ? savedPost : post,
            ),
          );
        }}
      />
      <OptionsDrawer
        isOpen={isPostOptionsDrawerOpen}
        onClose={() => {
          setIsPostOptionsDrawerOpen(false);
          setActiveOptionsPost(null);
          setActiveOptionsAnchor(null);
        }}
        post={activeOptionsPost}
        anchor={activeOptionsAnchor}
        onPostPinned={handlePostPinned}
        onPostUpdated={handlePostUpdated}
        onPostDeleted={handlePostDeleted}
        onEditPost={(selectedPost) => {
          setEditingPost(selectedPost);
          setIsUploadDrawerOpen(true);
          setIsPostOptionsDrawerOpen(false);
          setActiveOptionsPost(null);
          setActiveOptionsAnchor(null);
          setIsCommentDrawerOpen(false);
          setActiveCommentPostId(null);
          setActiveCommentPost(null);
          setActivePdfPost(null);
        }}
      />
      <PdfViewerModal
        isOpen={Boolean(activePdfPost)}
        post={activePdfPost}
        onClose={() => setActivePdfPost(null)}
      />
      <Header
        displayName={displayName}
        username={profileUsername}
        profilePictureUrl={profilePictureUrl}
        profileBackground={profile?.profileBackground}
        followers={followerCount}
        following={followingCount}
        subscriptionPlan={profile?.subscriptionPlan ?? "free"}
        isBot={profile?.isBot ?? false}
        institution={profile?.institution}
        institutionVisible={showInstitution}
        program={profile?.program}
        programVisible={showProgram}
        isOwner={isOwner}
        postsLabel={postsHeading}
        followLabel={followLabel}
        isFollowLoading={isUpdatingFollow}
        onFollowClick={handleFollowToggle}
        onFollowListOpen={(tab) => setSelectedFollowList(tab)}
        selectedTab={selectedTab}
        onTabChange={setSelectedTab}
      />

      {isLoadingProfile ? (
        <p className="px-6 py-8 text-sm text-[#696969]">Loading profile...</p>
      ) : !profile ? (
        <p className="px-6 py-8 text-sm text-[#696969]">
          {error || "Profile not found."}
        </p>
      ) : !canViewContent ? (
        <div className="px-6 py-12 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-[#F0F0F0]">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#999"
              strokeWidth={1.5}
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-6 w-6"
            >
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </div>
          <p className="text-sm font-medium text-[#262626]">
            This account is private
          </p>
          <p className="mt-1 text-sm text-[#696969]">
            {hasPendingRequest
              ? "Your follow request is pending."
              : "Follow this account to see their posts and achievements."}
          </p>
        </div>
      ) : (
        <>
          {selectedTab === "achievements" ? (
            <section className="px-6">
              <div className="flex justify-between gap-3">
                <Acheivement />
                <Acheivement />
              </div>
            </section>
          ) : (
            <section>
              {error && posts.length === 0 && isLoadingPosts ? (
                <p className="px-6 py-8 text-sm text-[#696969]">
                  Loading posts...
                </p>
              ) : posts.length === 0 ? (
                <p className="px-6 py-8 text-sm text-[#696969]">
                  No posts yet.
                </p>
              ) : (
                posts.map((post) => (
                  <div key={post.id}>
                    <Post
                      post={post}
                      showPinnedIndicator
                      onCommentClick={(selectedPost) => {
                        setActiveCommentPostId(selectedPost.id);
                        setActiveCommentPost(selectedPost);
                        setIsCommentDrawerOpen(true);
                        setIsUploadDrawerOpen(false);
                        setEditingPost(null);
                        setIsPostOptionsDrawerOpen(false);
                        setActiveOptionsPost(null);
                        setActiveOptionsAnchor(null);
                        setActivePdfPost(null);
                      }}
                      onOptionsClick={(selectedPost, anchor) => {
                        setActiveOptionsPost(selectedPost);
                        setActiveOptionsAnchor(anchor);
                        setIsPostOptionsDrawerOpen(true);
                        setIsUploadDrawerOpen(false);
                        setEditingPost(null);
                        setIsCommentDrawerOpen(false);
                        setActiveCommentPostId(null);
                        setActiveCommentPost(null);
                        setActivePdfPost(null);
                      }}
                      onFileClick={(selectedPost) => {
                        setActivePdfPost(selectedPost);
                        setIsUploadDrawerOpen(false);
                        setEditingPost(null);
                        setIsCommentDrawerOpen(false);
                        setActiveCommentPostId(null);
                        setActiveCommentPost(null);
                        setIsPostOptionsDrawerOpen(false);
                        setActiveOptionsPost(null);
                        setActiveOptionsAnchor(null);
                      }}
                    />
                  </div>
                ))
              )}
            </section>
          )}
        </>
      )}
      <FollowersnFollowingList
        isOpen={selectedFollowList !== null}
        userId={profile?.id}
        username={profile?.username}
        subscriptionPlan={profile?.subscriptionPlan}
        initialTab={selectedFollowList ?? "followers"}
        onClose={() => setSelectedFollowList(null)}
        onCountsChange={handleFollowCountsChange}
      />
    </div>
  );
}
