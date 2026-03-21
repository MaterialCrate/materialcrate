"use client";

import { useDeferredValue, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft2, DocumentText, SearchNormal1, User } from "iconsax-reactjs";
import DocumentCard, {
  type SearchDocument,
} from "@/app/components/search/DocumentCard";
import UserCard, { type SearchUser } from "@/app/components/search/UserCard";

type SearchTab = "users" | "documents";

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
  const [documents, setDocuments] = useState<SearchDocument[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

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

  return (
    <div className="min-h-dvh bg-[linear-gradient(180deg,#fff8ef_0%,#ffffff_34%,#f7f7f2_100%)] pb-14">
      <div className="sticky top-0 z-30 border-b border-black/5 bg-[#fffaf4]/90 backdrop-blur-md">
        <div className="px-5 pb-4 pt-6">
          <div className="flex items-center gap-3">
            <button
              type="button"
              aria-label="Go back"
              onClick={() => router.back()}
              className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-[#202020] shadow-[0_10px_30px_rgba(63,39,7,0.08)]"
            >
              <ArrowLeft2 size={20} color="#202020" />
            </button>

            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#bf6b1a]">
                Discover
              </p>
              <h1 className="truncate text-2xl font-semibold text-[#20160b]">
                Search the crate
              </h1>
            </div>
          </div>

          <div className="mt-4 rounded-[28px] border border-[#f0dfc8] bg-white px-4 py-3 shadow-[0_24px_60px_rgba(92,57,16,0.08)]">
            <label className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#f8efe3]">
                <SearchNormal1 size={18} color="#c56f1b" />
              </div>
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Find users, course codes, titles..."
                className="w-full bg-transparent text-[15px] text-[#20160b] outline-none placeholder:text-[#9f8f7f]"
              />
            </label>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2 rounded-full bg-[#f2e7d7] p-1">
            {(["documents", "users"] as SearchTab[]).map((tab) => {
              const isActive = activeTab === tab;
              const count =
                tab === "documents" ? documents.length : users.length;

              return (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveTab(tab)}
                  className={`rounded-full px-4 py-3 text-sm font-medium capitalize transition ${
                    isActive
                      ? "bg-[#20160b] text-white shadow-[0_12px_24px_rgba(0,0,0,0.14)]"
                      : "text-[#6d5a46]"
                  }`}
                >
                  <span>{tab}</span>
                  {hasQuery && (
                    <span className="ml-2 text-xs opacity-80">{count}</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <main className="px-5 pt-5">
        {!hasQuery ? (
          <section className="overflow-hidden rounded-[32px] bg-[#20160b] p-6 text-white shadow-[0_28px_60px_rgba(32,22,11,0.18)]">
            <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[#efba79]">
              Start typing
            </p>
            <h2 className="mt-2 text-2xl font-semibold">
              Jump between people and documents without leaving the page.
            </h2>
            <p className="mt-3 max-w-md text-sm leading-6 text-white/72">
              Search by username, display name, course code, title, year, or a
              phrase inside a document description.
            </p>
            <div className="mt-6 grid gap-3 text-sm text-white/88">
              <div className="rounded-[24px] border border-white/10 bg-white/6 px-4 py-3">
                Try `chemistry`, `@jane`, or `BIO101`
              </div>
              <div className="rounded-[24px] border border-white/10 bg-white/6 px-4 py-3">
                Switch tabs to narrow the results instantly
              </div>
            </div>
          </section>
        ) : error ? (
          <section className="rounded-[28px] border border-[#f3d2d2] bg-white px-5 py-6 shadow-sm">
            <p className="text-base font-medium text-[#942222]">{error}</p>
            <p className="mt-2 text-sm text-[#8b6d6d]">
              Try a different keyword or reload the page.
            </p>
          </section>
        ) : isLoading ? (
          <section className="space-y-3">
            {[0, 1, 2].map((item) => (
              <div
                key={item}
                className="animate-pulse rounded-[28px] border border-black/5 bg-white px-5 py-5 shadow-sm"
              >
                <div className="h-4 w-24 rounded-full bg-[#eee7dd]" />
                <div className="mt-4 h-5 w-2/3 rounded-full bg-[#f3ede3]" />
                <div className="mt-3 h-4 w-full rounded-full bg-[#f7f1e7]" />
              </div>
            ))}
          </section>
        ) : visibleResults.length === 0 ? (
          <section className="rounded-[30px] border border-[#eadccb] bg-white px-6 py-10 text-center shadow-[0_24px_60px_rgba(92,57,16,0.06)]">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#f8efe3]">
              {activeTab === "users" ? (
                <User size={28} color="#c56f1b" variant="Bold" />
              ) : (
                <DocumentText size={28} color="#c56f1b" />
              )}
            </div>
            <h2 className="mt-4 text-xl font-semibold text-[#20160b]">
              No {activeTab} found
            </h2>
            <p className="mt-2 text-sm leading-6 text-[#7f6d5a]">
              Nothing matched{" "}
              <span className="font-medium text-[#20160b]">{query.trim()}</span>
              . Try a broader keyword or switch tabs.
            </p>
          </section>
        ) : activeTab === "users" ? (
          <section className="space-y-3">
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
          <section className="space-y-3">
            {documents.map((document) => (
              <DocumentCard
                key={document.id}
                document={document}
                onClick={(selectedDocument) =>
                  router.push(
                    `/post/${encodeURIComponent(selectedDocument.id)}`,
                  )
                }
              />
            ))}
          </section>
        )}
      </main>
    </div>
  );
}
