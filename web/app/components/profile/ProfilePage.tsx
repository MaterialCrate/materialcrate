"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/lib/auth-client";
import Acheivement from "@/app/components/profile/Acheivement";
import Header from "@/app/components/profile/Header";
import Post, { type HomePost } from "@/app/components/home/Post";
import CommentDrawer from "@/app/components/home/CommentDrawer";
import OptionsDrawer from "@/app/components/home/OptionsDrawer";
import PdfViewerModal from "@/app/components/home/PdfViewerModal";

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
};

type ProfilePageProps = {
  username?: string;
};

const normalizeUsername = (value?: string | null) => value?.trim().toLowerCase() || "";

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
  const [isPostOptionsDrawerOpen, setIsPostOptionsDrawerOpen] = useState(false);
  const [activeCommentPostId, setActiveCommentPostId] = useState<string | null>(
    null,
  );
  const [activeOptionsPost, setActiveOptionsPost] = useState<HomePost | null>(null);
  const [activePdfPost, setActivePdfPost] = useState<HomePost | null>(null);

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

        const response = await fetch(`/api/users/${encodeURIComponent(routeUsername)}`, {
          cache: "no-store",
        });
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
          setError(err instanceof Error ? err.message : "Failed to load profile");
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
          setError((current) =>
            current || (err instanceof Error ? err.message : "Failed to load posts"),
          );
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
  const profileUsername = profile?.username ? `@${profile.username}` : "@unknown";
  const profilePictureUrl = profile?.profilePicture?.trim() || "";
  const followerCount = profile?.followersCount ?? 0;
  const followingCount = profile?.followingCount ?? 0;
  const postsHeading = isOwner ? "My Posts" : "Posts";

  if (!isPublicProfile && isLoadingAuth) {
    return <p className="px-6 py-8 text-sm text-[#696969]">Loading profile...</p>;
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
      <CommentDrawer
        isOpen={isCommentDrawerOpen}
        onClose={() => {
          setIsCommentDrawerOpen(false);
          setActiveCommentPostId(null);
        }}
        postId={activeCommentPostId}
      />
      <OptionsDrawer
        isOpen={isPostOptionsDrawerOpen}
        onClose={() => {
          setIsPostOptionsDrawerOpen(false);
          setActiveOptionsPost(null);
        }}
        authorUsername={activeOptionsPost?.author?.username}
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
      />

      {isLoadingProfile ? (
        <p className="px-6 py-8 text-sm text-[#696969]">Loading profile...</p>
      ) : !profile ? (
        <p className="px-6 py-8 text-sm text-[#696969]">
          {error || "Profile not found."}
        </p>
      ) : (
        <>
          <div className="flex justify-between gap-3 px-6">
            <Acheivement />
            <Acheivement />
          </div>

          <section>
            {error && posts.length === 0 && !isLoadingPosts ? (
              <p className="px-6 py-8 text-sm text-[#696969]">{error}</p>
            ) : isLoadingPosts ? (
              <p className="px-6 py-8 text-sm text-[#696969]">Loading posts...</p>
            ) : posts.length === 0 ? (
              <p className="px-6 py-8 text-sm text-[#696969]">No posts yet.</p>
            ) : (
              posts.map((post, index) => (
                <div key={post.id}>
                  <Post
                    post={post}
                    onCommentClick={(selectedPost) => {
                      setActiveCommentPostId(selectedPost.id);
                      setIsCommentDrawerOpen(true);
                      setIsPostOptionsDrawerOpen(false);
                      setActiveOptionsPost(null);
                      setActivePdfPost(null);
                    }}
                    onOptionsClick={(selectedPost) => {
                      setActiveOptionsPost(selectedPost);
                      setIsPostOptionsDrawerOpen(true);
                      setIsCommentDrawerOpen(false);
                      setActiveCommentPostId(null);
                      setActivePdfPost(null);
                    }}
                    onFileClick={(selectedPost) => {
                      setActivePdfPost(selectedPost);
                      setIsCommentDrawerOpen(false);
                      setActiveCommentPostId(null);
                      setIsPostOptionsDrawerOpen(false);
                      setActiveOptionsPost(null);
                    }}
                  />
                  {index < posts.length - 1 ? (
                    <div className="px-6">
                      <div className="mt-4 h-px w-full bg-black/40" />
                    </div>
                  ) : null}
                </div>
              ))
            )}
          </section>
        </>
      )}
    </div>
  );
}
