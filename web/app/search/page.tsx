"use client";

import { useDeferredValue, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Post, {
  type HomePost,
  type PostOptionsAnchor,
} from "@/app/components/home/Post";
import OptionsDrawer from "@/app/components/home/PostOptions";
import Header, { type SearchTab } from "@/app/components/search/Header";
import UserCard, { type SearchUser } from "@/app/components/search/UserCard";
import LoadingBar from "../components/LoadingBar";
import Alert from "../components/Alert";

const RESULT_LIMIT = 12;

export default function SearchPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const searchParamsString = searchParams.toString();
  const initialQuery = searchParams.get("q")?.trim() ?? "";
  const initialTab =
    searchParams.get("tab") === "users" ? "users" : "documents";

  const [query, setQuery] = useState(initialQuery);
  const [activeTab, setActiveTab] = useState<SearchTab>(initialTab);
  const [users, setUsers] = useState<SearchUser[]>([]);
  const [documents, setDocuments] = useState<HomePost[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [isPostOptionsDrawerOpen, setIsPostOptionsDrawerOpen] = useState(false);
  const [activeOptionsPost, setActiveOptionsPost] = useState<HomePost | null>(null);
  const [activeOptionsAnchor, setActiveOptionsAnchor] =
    useState<PostOptionsAnchor | null>(null);

  const deferredQuery = useDeferredValue(query.trim());

  useEffect(() => {
    const nextQuery = searchParams.get("q")?.trim() ?? "";
    const nextTab = searchParams.get("tab") === "users" ? "users" : "documents";

    setQuery((current) => (current === nextQuery ? current : nextQuery));
    setActiveTab((current) => (current === nextTab ? current : nextTab));
  }, [searchParams]);

  useEffect(() => {
    const nextParams = new URLSearchParams(searchParamsString);

    if (query.trim()) {
      nextParams.set("q", query.trim());
    } else {
      nextParams.delete("q");
    }

    nextParams.set("tab", activeTab);

    const nextQueryString = nextParams.toString();
    router.replace(nextQueryString ? `/search?${nextQueryString}` : "/search", {
      scroll: false,
    });
  }, [activeTab, query, router, searchParamsString]);

  useEffect(() => {
    const normalizedQuery = deferredQuery.trim();

    if (!normalizedQuery) {
      setUsers([]);
      setDocuments([]);
      setError("");
      setIsLoading(false);
      return;
    }

    const controller = new AbortController();
    const timeoutId = window.setTimeout(async () => {
      try {
        setIsLoading(true);
        setError("");

        const response = await fetch(
          `/api/search?q=${encodeURIComponent(normalizedQuery)}&limit=${RESULT_LIMIT}`,
          {
            cache: "no-store",
            signal: controller.signal,
          },
        );
        const body = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error(body?.error || "Failed to search");
        }

        if (!controller.signal.aborted) {
          setUsers(Array.isArray(body?.users) ? body.users : []);
          setDocuments(Array.isArray(body?.documents) ? body.documents : []);
        }
      } catch (searchError) {
        if (!controller.signal.aborted) {
          setUsers([]);
          setDocuments([]);
          setError("Failed to search");
          console.error("Error during search:", searchError);
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    }, 220);

    return () => {
      controller.abort();
      window.clearTimeout(timeoutId);
    };
  }, [deferredQuery]);

  const visibleResults = activeTab === "users" ? users : documents;
  const hasQuery = query.trim().length > 0;
  const handlePostUpdated = (updatedPost: HomePost) => {
    setDocuments((current) =>
      current.map((post) =>
        post.id === updatedPost.id ? { ...post, ...updatedPost } : post,
      ),
    );
    setActiveOptionsPost((current) =>
      current?.id === updatedPost.id ? { ...current, ...updatedPost } : current,
    );
  };

  return (
    <div className="min-h-dvh bg-[#f7f7f7] pb-4 pt-34">
      {error && <Alert type="error" message={error} />}
      <OptionsDrawer
        isOpen={isPostOptionsDrawerOpen}
        onClose={() => {
          setIsPostOptionsDrawerOpen(false);
          setActiveOptionsPost(null);
          setActiveOptionsAnchor(null);
        }}
        post={activeOptionsPost}
        anchor={activeOptionsAnchor}
        onPostUpdated={handlePostUpdated}
      />
      <>
        <Header
          query={query}
          onQueryChange={setQuery}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          search={() => {
            const nextParams = new URLSearchParams(searchParamsString);

            if (query.trim()) {
              nextParams.set("q", query.trim());
            } else {
              nextParams.delete("q");
            }

            nextParams.set("tab", activeTab);

            const nextQueryString = nextParams.toString();
            router.push(
              nextQueryString ? `/search?${nextQueryString}` : "/search",
            );
          }}
        />
        {isLoading && <LoadingBar />}
      </>

      <main>
        {visibleResults.length === 0 && hasQuery ? (
          <section>
            <p className="text-sm leading-6 text-[#7f6d5a] px-4 ">
              Nothing matched &quot;{query.trim()}&quot;. Try a broader keyword
              or switch tabs.
            </p>
          </section>
        ) : activeTab === "users" ? (
          <section className="space-y-3 pt-3">
            {users.map((searchUser) => (
              <UserCard
                key={searchUser.id}
                user={searchUser}
                onClick={(selectedUser) =>
                  router.push(
                    `/user/${encodeURIComponent(selectedUser.username)}`,
                  )
                }
              />
            ))}
          </section>
        ) : (
          <section>
            {documents.map((document, index) => (
              <div key={index}>
                <Post
                  key={document.id}
                  post={document}
                  onOptionsClick={(selectedDocument, anchor) => {
                    setActiveOptionsPost(selectedDocument);
                    setActiveOptionsAnchor(anchor);
                    setIsPostOptionsDrawerOpen(true);
                  }}
                  onFileClick={(selectedDocument) =>
                    router.push(
                      `/post/${encodeURIComponent(selectedDocument.id)}`,
                    )
                  }
                  onCommentClick={(selectedDocument) =>
                    router.push(
                      `/post/${encodeURIComponent(selectedDocument.id)}`,
                    )
                  }
                />
                {index < documents.length - 1 && (
                  <div className="px-6">
                    <div className="h-px w-full bg-black/20 mt-4" />
                  </div>
                )}
              </div>
            ))}
          </section>
        )}
      </main>
    </div>
  );
}
