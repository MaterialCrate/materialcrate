"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { Clock, DocumentText, User } from "iconsax-reactjs";
import type { HomePost } from "@/app/components/home/Post";
import Header from "@/app/components/Header";

type PostHistoryVersion = {
  id: string;
  postId: string;
  versionNumber: number;
  title: string;
  courseCode: string;
  description?: string | null;
  year?: number | null;
  fileUrl: string;
  thumbnailUrl?: string | null;
  createdAt: string;
  editor?: {
    id: string;
    displayName: string;
    username: string;
    profilePicture?: string | null;
    subscriptionPlan?: string | null;
  } | null;
};

const formatTimestamp = (value: string) => {
  const trimmed = value?.trim();
  if (!trimmed) {
    return "Unknown date";
  }

  let timestamp = Number.NaN;
  const numericTimestamp = Number(trimmed);

  if (Number.isFinite(numericTimestamp)) {
    timestamp =
      numericTimestamp < 1_000_000_000_000
        ? numericTimestamp * 1000
        : numericTimestamp;
  } else {
    timestamp = new Date(trimmed).getTime();
  }

  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) {
    return "Unknown date";
  }

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
};

const normalizeText = (value?: string | null) => value?.trim() || "";

const getChangedFields = (
  version: PostHistoryVersion,
  previousVersion?: PostHistoryVersion,
) => {
  if (!previousVersion) {
    return ["Initial version"];
  }

  const changes: string[] = [];

  if (version.title !== previousVersion.title) {
    changes.push("Title");
  }
  if (version.courseCode !== previousVersion.courseCode) {
    changes.push("Course code");
  }
  if (
    normalizeText(version.description) !==
    normalizeText(previousVersion.description)
  ) {
    changes.push("Description");
  }
  if ((version.year ?? null) !== (previousVersion.year ?? null)) {
    changes.push("Year");
  }

  return changes.length > 0 ? changes : ["No metadata change detected"];
};

export default function PostHistoryPage() {
  const params = useParams<{ id: string }>();
  const [post, setPost] = useState<HomePost | null>(null);
  const [versions, setVersions] = useState<PostHistoryVersion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const postId = params?.id?.trim();
    if (!postId) {
      setError("Post not found.");
      setIsLoading(false);
      return;
    }

    const controller = new AbortController();

    const loadHistory = async () => {
      try {
        setIsLoading(true);
        setError("");

        const response = await fetch(
          `/api/posts/${encodeURIComponent(postId)}/history`,
          {
            method: "GET",
            cache: "no-store",
            signal: controller.signal,
          },
        );
        const body = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error(body?.error || "Failed to load post history");
        }

        setPost(body?.post ?? null);
        setVersions(Array.isArray(body?.versions) ? body.versions : []);
      } catch (loadError) {
        if (!controller.signal.aborted) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Failed to load post history",
          );
          setPost(null);
          setVersions([]);
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    };

    void loadHistory();

    return () => controller.abort();
  }, [params?.id]);

  const historyItems = useMemo(
    () =>
      versions.map((version, index) => ({
        ...version,
        changes: getChangedFields(version, versions[index + 1]),
      })),
    [versions],
  );

  return (
    <div className="min-h-screen bg-[#F7F7F7] pb-10 pt-20">
      <Header title="Post History" />

      <main className="mx-auto flex max-w-3xl flex-col gap-4 px-4">
        {isLoading ? (
          <p className="py-8 text-sm text-[#696969]">Loading history...</p>
        ) : error ? (
          <p className="py-8 text-sm text-[#8A3A25]">{error}</p>
        ) : !post ? (
          <p className="py-8 text-sm text-[#696969]">Post not found.</p>
        ) : (
          <>
            <section className="rounded-[28px] border border-black/6 bg-white p-5 shadow-[0_16px_50px_rgba(0,0,0,0.06)]">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#FFF3E7]">
                  <DocumentText size={24} color="#E1761F" variant="Bold" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-base font-medium text-[#202020]">
                    {post.title}
                  </p>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-[#7A7A7A]">
                    <span>{post.courseCode}</span>
                    {post.year ? <span>{post.year}</span> : null}
                    <span>
                      {versions.length} saved version
                      {versions.length === 1 ? "" : "s"}
                    </span>
                  </div>
                  {post.description ? (
                    <p className="mt-3 text-sm leading-6 text-[#4E4E4E]">
                      {post.description}
                    </p>
                  ) : (
                    <p className="mt-3 text-sm text-[#9A9A9A]">
                      No current description.
                    </p>
                  )}
                </div>
              </div>
            </section>

            {historyItems.length === 0 ? (
              <section className="rounded-[28px] border border-dashed border-black/10 bg-white px-5 py-8 text-sm text-[#696969]">
                No saved versions yet. The history starts after a post is
                created or edited with the new versioning flow.
              </section>
            ) : (
              <section className="space-y-4">
                {historyItems.map((version, index) => {
                  const isLatest = index === 0;
                  const editorName =
                    version.editor?.displayName?.trim() ||
                    version.editor?.username?.trim() ||
                    "Unknown user";

                  return (
                    <article
                      key={version.id}
                      className="rounded-[28px] border border-black/6 bg-white p-5 shadow-[0_16px_50px_rgba(0,0,0,0.06)]"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-[#111111] px-3 py-1 text-[11px] font-medium text-white">
                          Version {version.versionNumber}
                        </span>
                        {isLatest ? (
                          <span className="rounded-full bg-[#FFF3E7] px-3 py-1 text-[11px] font-medium text-[#E1761F]">
                            Latest
                          </span>
                        ) : null}
                      </div>

                      <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-[#7A7A7A]">
                        <span className="inline-flex items-center gap-1.5">
                          <Clock size={14} color="#7A7A7A" />
                          {formatTimestamp(version.createdAt)}
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                          <User size={14} color="#7A7A7A" />
                          {editorName}
                        </span>
                      </div>

                      <div className="mt-4 flex flex-wrap gap-2">
                        {version.changes.map((change) => (
                          <span
                            key={`${version.id}-${change}`}
                            className="rounded-full bg-[#F3F3F3] px-3 py-1 text-[11px] font-medium text-[#4E4E4E]"
                          >
                            {change}
                          </span>
                        ))}
                      </div>

                      <div className="mt-5 space-y-4">
                        <div>
                          <p className="text-[11px] uppercase tracking-[0.16em] text-[#9A9A9A]">
                            Title
                          </p>
                          <p className="mt-1 text-sm font-medium text-[#202020]">
                            {version.title}
                          </p>
                        </div>

                        <div className="flex flex-wrap gap-6">
                          <div>
                            <p className="text-[11px] uppercase tracking-[0.16em] text-[#9A9A9A]">
                              Course Code
                            </p>
                            <p className="mt-1 text-sm text-[#202020]">
                              {version.courseCode}
                            </p>
                          </div>
                          <div>
                            <p className="text-[11px] uppercase tracking-[0.16em] text-[#9A9A9A]">
                              Year
                            </p>
                            <p className="mt-1 text-sm text-[#202020]">
                              {version.year ?? "Not set"}
                            </p>
                          </div>
                        </div>

                        <div>
                          <p className="text-[11px] uppercase tracking-[0.16em] text-[#9A9A9A]">
                            Description
                          </p>
                          <p className="mt-1 text-sm leading-6 text-[#4E4E4E]">
                            {version.description?.trim() || "No description."}
                          </p>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </section>
            )}
          </>
        )}
      </main>
    </div>
  );
}
