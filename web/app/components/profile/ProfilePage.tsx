"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/lib/auth-client";
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

type ProfileUser = {
  id: string;
  username: string;
  displayName: string;
  profilePicture?: string | null;
  followersCount?: number | null;
  followingCount?: number | null;
  subscriptionPlan?: string | null;
  institution?: string | null;
  program?: string | null;
  isFollowedByCurrentUser?: boolean;
  isFollowingCurrentUser?: boolean;
};

type ProfilePageProps = {
  username?: string;
};

const normalizeUsername = (value?: string | null) =>
  value?.trim().toLowerCase() || "";

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
            setProfile(user);
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

  const isOwner =
    normalizeUsername(user?.username) !== "" &&
    normalizeUsername(user?.username) === normalizeUsername(profile?.username);
  const displayName =
    profile?.displayName?.trim() || profile?.username?.trim() || "Unknown User";
  const profileUsername = profile?.username
    ? `@${profile.username}`
    : "@unknown";
  const profilePictureUrl = profile?.profilePicture?.trim() || "";
  const followerCount = profile?.followersCount ?? 0;
  const followingCount = profile?.followingCount ?? 0;
  const postsHeading = isOwner ? "My Posts" : "Posts";
  const followLabel: "Follow" | "Following" | "Follow back" =
    profile?.isFollowedByCurrentUser
      ? "Following"
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
    const previousFollowed = Boolean(profile.isFollowedByCurrentUser);
    const previousFollowerCount = profile.followersCount ?? 0;

    setIsUpdatingFollow(true);
    setError("");
    setProfile((current) =>
      current
        ? {
            ...current,
            isFollowedByCurrentUser: !shouldUnfollow,
            followersCount: Math.max(
              0,
              previousFollowerCount + (shouldUnfollow ? -1 : 1),
            ),
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
    } catch (err) {
      setProfile((current) =>
        current
          ? {
              ...current,
              isFollowedByCurrentUser: previousFollowed,
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
        followers={followerCount}
        following={followingCount}
        subscriptionPlan={profile?.subscriptionPlan ?? "free"}
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
                posts.map((post, index) => (
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
                    {index < posts.length - 1 && (
                      <div className="px-6">
                        <div className="mt-4 h-px w-full bg-black/20" />
                      </div>
                    )}
                  </div>
                ))
              )}
            </section>
          )}
        </>
      )}
      <FollowersnFollowingList
        isOpen={selectedFollowList !== null}
        username={profile?.username}
        subscriptionPlan={profile?.subscriptionPlan}
        initialTab={selectedFollowList ?? "followers"}
        onClose={() => setSelectedFollowList(null)}
        onCountsChange={handleFollowCountsChange}
      />
    </div>
  );
}
