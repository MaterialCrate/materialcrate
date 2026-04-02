"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  Add,
  ArrowRight2,
  Clock,
  CloseCircle,
  DocumentText1,
} from "iconsax-reactjs";
import Alert from "../components/Alert";
import LoadingBar from "../components/LoadingBar";

type ArchiveFolder = {
  id: string;
  name: string;
};

type ArchiveSavedPost = {
  id: string;
  postId: string;
  createdAt?: string;
  post: {
    id: string;
    title?: string | null;
    description?: string | null;
    categories?: string[] | null;
    year?: number | null;
    author?: {
      displayName?: string | null;
      username?: string | null;
    } | null;
  };
  folder?: {
    id: string;
    name: string;
  } | null;
};

type ArchiveData = {
  id: string;
  name?: string | null;
  folders?: ArchiveFolder[];
  savedPosts?: ArchiveSavedPost[];
};

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  text: string;
  createdAt: string;
  documentId: string;
  documentTitle: string;
};

const CHAT_HISTORY_STORAGE_KEY = "ju-intelli-chat-history";

const PROMPT_SUGGESTIONS = [
  "Summarize the key points from this document.",
  "Explain the hardest concept in simpler words.",
  "Turn this into 5 revision questions with answers.",
  "Pull out the main formulas, keywords, and takeaways.",
];

const createMessageId = () => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const formatHistoryTime = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Just now";
  }

  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
};

const buildLocalAssistantReply = (
  documentTitle: string,
  userPrompt: string,
) => {
  if (/summarize/i.test(userPrompt)) {
    return `Summary request saved for "${documentTitle}". You can reopen it anytime from History.`;
  }

  if (/explain/i.test(userPrompt)) {
    return `Explanation request saved for "${documentTitle}". This thread will stay in your local history.`;
  }

  if (/question|quiz/i.test(userPrompt)) {
    return `Quiz request saved for "${documentTitle}". You can come back to this chat later from History.`;
  }

  return `Your Ju Intelli prompt for "${documentTitle}" has been saved to this chat history.`;
};

export default function HubPage() {
  const searchParams = useSearchParams();
  const requestedPostId = searchParams.get("postId")?.trim() ?? "";
  const hideHeaderTimerRef = useRef<number | null>(null);
  const chatScrollRef = useRef<HTMLDivElement | null>(null);
  const promptTextareaRef = useRef<HTMLTextAreaElement | null>(null);

  const [archive, setArchive] = useState<ArchiveData | null>(null);
  const [selectedDocumentId, setSelectedDocumentId] = useState("");
  const [prompt, setPrompt] = useState("");
  const [history, setHistory] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isHeaderVisible, setIsHeaderVisible] = useState(true);
  const [error, setError] = useState("");

  const showHeaderTemporarily = useCallback(() => {
    setIsHeaderVisible(true);

    if (typeof window === "undefined") {
      return;
    }

    if (hideHeaderTimerRef.current) {
      window.clearTimeout(hideHeaderTimerRef.current);
    }

    hideHeaderTimerRef.current = window.setTimeout(() => {
      setIsHeaderVisible(false);
    }, 5000);
  }, []);

  const resizePromptTextarea = useCallback(() => {
    const textarea = promptTextareaRef.current;
    if (!textarea) {
      return;
    }

    textarea.style.height = "0px";
    textarea.style.height = `${Math.min(textarea.scrollHeight, 112)}px`;
    textarea.style.overflowY = textarea.scrollHeight > 112 ? "auto" : "hidden";
  }, []);

  useEffect(() => {
    if (typeof document === "undefined") {
      return;
    }

    const previousBodyOverflow = document.body.style.overflow;
    const previousHtmlOverflow = document.documentElement.style.overflow;

    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousHtmlOverflow;
    };
  }, []);

  useEffect(() => {
    showHeaderTemporarily();

    return () => {
      if (typeof window !== "undefined" && hideHeaderTimerRef.current) {
        window.clearTimeout(hideHeaderTimerRef.current);
      }
    };
  }, [showHeaderTemporarily]);

  useEffect(() => {
    if (isPickerOpen || isHistoryOpen) {
      setIsHeaderVisible(true);
      if (typeof window !== "undefined" && hideHeaderTimerRef.current) {
        window.clearTimeout(hideHeaderTimerRef.current);
      }
      return;
    }

    showHeaderTemporarily();
  }, [isHistoryOpen, isPickerOpen, showHeaderTemporarily]);

  useEffect(() => {
    const container = chatScrollRef.current;
    if (!container) {
      return;
    }

    container.scrollTop = container.scrollHeight;
  }, [selectedDocumentId, history]);

  useEffect(() => {
    resizePromptTextarea();
  }, [prompt, resizePromptTextarea]);

  useEffect(() => {
    let isCancelled = false;

    const loadSavedDocuments = async () => {
      try {
        setIsLoading(true);
        setError("");

        const response = await fetch("/api/archive", {
          method: "GET",
          cache: "no-store",
        });
        const body = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error(body?.error || "Failed to load your saved files.");
        }

        if (!isCancelled) {
          setArchive((body?.archive as ArchiveData | null) ?? null);
        }
      } catch (loadError) {
        if (!isCancelled) {
          setArchive(null);
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Failed to load your saved files.",
          );
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    };

    void loadSavedDocuments();

    return () => {
      isCancelled = true;
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    try {
      const rawHistory = window.localStorage.getItem(CHAT_HISTORY_STORAGE_KEY);
      if (!rawHistory) {
        return;
      }

      const parsedHistory = JSON.parse(rawHistory) as ChatMessage[];
      if (Array.isArray(parsedHistory)) {
        setHistory(parsedHistory);
      }
    } catch {}
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(
      CHAT_HISTORY_STORAGE_KEY,
      JSON.stringify(history),
    );
  }, [history]);

  const documents = useMemo(() => archive?.savedPosts ?? [], [archive]);

  const requestedDocument = useMemo(
    () =>
      requestedPostId
        ? (documents.find((document) =>
            [document.id, document.postId, document.post.id].some(
              (value) => value === requestedPostId,
            ),
          ) ?? null)
        : null,
    [documents, requestedPostId],
  );

  useEffect(() => {
    if (documents.length === 0) {
      return;
    }

    setSelectedDocumentId((current) => {
      if (requestedDocument) {
        return requestedDocument.id;
      }

      if (current && documents.some((document) => document.id === current)) {
        return current;
      }

      return documents[0].id;
    });
  }, [documents, requestedDocument]);

  const selectedDocument = useMemo(
    () =>
      documents.find((document) => document.id === selectedDocumentId) ??
      documents[0] ??
      null,
    [documents, selectedDocumentId],
  );

  const conversation = useMemo(
    () =>
      selectedDocument
        ? history.filter(
            (message) => message.documentId === selectedDocument.id,
          )
        : [],
    [history, selectedDocument],
  );

  const historyEntries = useMemo(
    () =>
      history
        .filter((message) => message.role === "user")
        .slice()
        .reverse(),
    [history],
  );

  const requestedDocumentMissing =
    Boolean(requestedPostId) && !isLoading && !requestedDocument;

  const handleSelectDocument = (documentId: string) => {
    setSelectedDocumentId(documentId);
    setIsPickerOpen(false);
  };

  const handleSendPrompt = () => {
    if (!selectedDocument || !prompt.trim()) {
      return;
    }

    const nextPrompt = prompt.trim();
    const documentTitle =
      selectedDocument.post.title?.trim() || "Untitled document";
    const timestamp = new Date().toISOString();

    const nextMessages: ChatMessage[] = [
      {
        id: createMessageId(),
        role: "user",
        text: nextPrompt,
        createdAt: timestamp,
        documentId: selectedDocument.id,
        documentTitle,
      },
      {
        id: createMessageId(),
        role: "assistant",
        text: buildLocalAssistantReply(documentTitle, nextPrompt),
        createdAt: timestamp,
        documentId: selectedDocument.id,
        documentTitle,
      },
    ];

    setHistory((current) => [...current, ...nextMessages]);
    setPrompt("");
  };

  const handleUseHistoryEntry = (entry: ChatMessage) => {
    setSelectedDocumentId(entry.documentId);
    setPrompt(entry.text);
    setIsHistoryOpen(false);
  };

  const handleClearHistory = () => {
    if (!selectedDocument) {
      setHistory([]);
      return;
    }

    setHistory((current) =>
      current.filter((message) => message.documentId !== selectedDocument.id),
    );
  };

  return (
    <div
      className="h-dvh overflow-hidden bg-[#fafafa] text-[#202020]"
      onPointerDownCapture={() => {
        if (!isPickerOpen && !isHistoryOpen) {
          showHeaderTemporarily();
        }
      }}
      onFocusCapture={() => {
        if (!isPickerOpen && !isHistoryOpen) {
          showHeaderTemporarily();
        }
      }}
    >
      {isLoading && <LoadingBar />}
      {error ? <Alert type="error" message={error} /> : null}

      {isPickerOpen ? (
        <>
          <button
            type="button"
            aria-label="Close saved document picker"
            onClick={() => setIsPickerOpen(false)}
            className="fixed inset-0 z-40 bg-black/30"
          />
          <div className="fixed inset-x-0 bottom-0 z-50 rounded-t-4xl bg-[#F7F7F7] px-4 pb-6 pt-4 shadow-[0_-18px_40px_rgba(0,0,0,0.14)]">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#7f6d5a]">
                  Saved posts
                </p>
                <h2 className="text-base font-semibold text-[#202020]">
                  Choose a document for Ju Intelli
                </h2>
              </div>
              <button
                type="button"
                aria-label="Close"
                onClick={() => setIsPickerOpen(false)}
              >
                <CloseCircle size={24} color="#8a8a8a" />
              </button>
            </div>

            <div className="max-h-[50vh] space-y-2 overflow-y-auto pr-1">
              {documents.length > 0 ? (
                documents.map((document) => {
                  const isSelected = document.id === selectedDocument?.id;
                  const title =
                    document.post.title?.trim() || "Untitled document";
                  const author =
                    document.post.author?.displayName?.trim() ||
                    document.post.author?.username?.trim() ||
                    "Unknown author";

                  return (
                    <button
                      key={document.id}
                      type="button"
                      onClick={() => handleSelectDocument(document.id)}
                      className={`flex w-full items-start gap-3 rounded-[20px] border px-3 py-3 text-left transition ${
                        isSelected
                          ? "border-[#202020] bg-[#f7f7f7]"
                          : "border-black/6 bg-white"
                      }`}
                    >
                      <div className="rounded-2xl bg-[#f1f1f1] p-2 text-[#202020]">
                        <DocumentText1 size={18} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="truncate text-sm font-semibold text-[#202020]">
                            {title}
                          </p>
                          {isSelected ? (
                            <span className="shrink-0 rounded-full bg-[#202020] px-2 py-1 text-[10px] font-medium text-white">
                              Selected
                            </span>
                          ) : null}
                        </div>
                        <p className="mt-1 text-xs text-[#696969]">
                          {author}
                          {document.folder?.name
                            ? ` • ${document.folder.name}`
                            : ""}
                        </p>
                      </div>
                    </button>
                  );
                })
              ) : (
                <div className="rounded-[20px] bg-[#f7f7f7] px-4 py-5 text-sm text-[#696969]">
                  No saved files yet. Save a post first, then it can be used in
                  Ju Intelli.
                </div>
              )}
            </div>
          </div>
        </>
      ) : null}

      {isHistoryOpen ? (
        <>
          <button
            type="button"
            aria-label="Close history"
            onClick={() => setIsHistoryOpen(false)}
            className="fixed inset-0 z-40 bg-black/30"
          />
          <div className="fixed inset-x-0 bottom-0 z-50 rounded-t-4xl bg-white px-4 pb-6 pt-4 shadow-[0_-18px_40px_rgba(0,0,0,0.14)]">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#7f6d5a]">
                  History
                </p>
                <h2 className="text-base font-semibold text-[#202020]">
                  Recent Ju Intelli chats
                </h2>
              </div>
              <button
                type="button"
                aria-label="Close history"
                onClick={() => setIsHistoryOpen(false)}
              >
                <CloseCircle size={24} color="#8a8a8a" />
              </button>
            </div>

            {historyEntries.length > 0 ? (
              <div className="max-h-[50vh] space-y-2 overflow-y-auto pr-1">
                {historyEntries.map((entry) => (
                  <button
                    key={entry.id}
                    type="button"
                    onClick={() => handleUseHistoryEntry(entry)}
                    className="w-full rounded-[20px] border border-black/6 bg-white px-3 py-3 text-left"
                  >
                    <p className="text-xs font-medium text-[#7f6d5a]">
                      {entry.documentTitle}
                    </p>
                    <p className="mt-1 line-clamp-2 text-sm text-[#202020]">
                      {entry.text}
                    </p>
                    <p className="mt-1 text-[11px] text-[#8a8a8a]">
                      {formatHistoryTime(entry.createdAt)}
                    </p>
                  </button>
                ))}
              </div>
            ) : (
              <div className="rounded-[20px] bg-[#f7f7f7] px-4 py-5 text-sm text-[#696969]">
                No chat history yet. Your prompts will appear here once you
                start a conversation.
              </div>
            )}
          </div>
        </>
      ) : null}

      <header
        className={`fixed inset-x-0 top-0 z-30 border-b border-black/6 bg-white backdrop-blur-sm transition-all duration-300 ${
          isHeaderVisible
            ? "translate-y-0 opacity-100"
            : "-translate-y-full opacity-0 pointer-events-none"
        }`}
      >
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 pb-3 pt-6">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#7f6d5a]">
              Hub
            </p>
            <h1 className="text-lg font-medium text-[#202020]">Ju Intelli</h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              aria-label="View history"
              onClick={() => setIsHistoryOpen(true)}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-black/8 bg-white"
            >
              <Clock size={18} color="#202020" />
            </button>
            <button
              type="button"
              aria-label="Choose a saved document"
              onClick={() => setIsPickerOpen(true)}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-black/8 bg-white"
            >
              <Add size={18} color="#202020" />
            </button>
          </div>
        </div>
      </header>

      <main
        className={`mx-auto flex h-full max-w-3xl flex-col overflow-hidden px-4 pb-24 transition-[padding-top] duration-300 ${
          isHeaderVisible ? "pt-24" : "pt-4"
        }`}
      >
        {requestedDocumentMissing ? (
          <section className="mb-3 rounded-2xl border border-[#f0d4ae] bg-[#fff8ef] px-4 py-3 text-sm text-[#7c5a2a]">
            That post isn&apos;t in your saved list yet. Tap{" "}
            <span className="font-semibold">+</span> to choose one of your saved
            documents instead.
          </section>
        ) : null}

        <section className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="shrink-0 border-b border-black/6 px-4 py-3">
            <p className="text-sm font-medium text-[#202020]">
              {selectedDocument?.post.title?.trim() ||
                "Choose a saved document"}
            </p>
            <p className="mt-1 text-xs text-[#696969]">
              {selectedDocument
                ? `${selectedDocument.post.author?.displayName?.trim() || selectedDocument.post.author?.username?.trim() || "Unknown author"}${selectedDocument.folder?.name ? ` • ${selectedDocument.folder.name}` : " • Saved posts"}`
                : "Only documents already saved in the app can be used here."}
            </p>
          </div>

          <div
            ref={chatScrollRef}
            className="min-h-0 flex-1 overflow-y-auto px-3 py-4"
          >
            {selectedDocument ? (
              conversation.length > 0 ? (
                <div className="space-y-3">
                  {conversation.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${
                        message.role === "user"
                          ? "justify-end"
                          : "justify-start"
                      }`}
                    >
                      <div
                        className={`max-w-[85%] rounded-3xl px-4 py-3 text-sm leading-6 ${
                          message.role === "user"
                            ? "bg-[#202020] text-white"
                            : "bg-[#f4f4f4] text-[#202020]"
                        }`}
                      >
                        <p>{message.text}</p>
                        <p
                          className={`mt-2 text-[11px] ${
                            message.role === "user"
                              ? "text-white/70"
                              : "text-[#8a8a8a]"
                          }`}
                        >
                          {formatHistoryTime(message.createdAt)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex min-h-full flex-col items-center justify-center px-4 py-8 text-center">
                  <div className="rounded-full bg-[#f4f4f4] p-3">
                    <DocumentText1 size={20} color="#202020" />
                  </div>
                  <h2 className="mt-4 text-lg font-medium text-[#202020]">
                    Start a new chat
                  </h2>
                  <p className="mt-2 max-w-md text-sm leading-6 text-[#696969]">
                    Ask Ju Intelli about this saved document. Only this message
                    area scrolls, and your chat is kept in local history.
                  </p>
                  <div className="mt-4 flex flex-wrap justify-center gap-2">
                    {PROMPT_SUGGESTIONS.map((suggestion) => (
                      <button
                        key={suggestion}
                        type="button"
                        onClick={() => setPrompt(suggestion)}
                        className="rounded-full border border-black/8 bg-white px-3 py-2 text-xs text-[#202020]"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </div>
              )
            ) : (
              <div className="flex min-h-full flex-col items-center justify-center px-4 py-8 text-center">
                <h2 className="text-lg font-medium text-[#202020]">
                  Choose a saved document
                </h2>
                <p className="mt-2 max-w-md text-sm leading-6 text-[#696969]">
                  Ju Intelli only works with documents already saved in the app.
                </p>
                <button
                  type="button"
                  onClick={() => setIsPickerOpen(true)}
                  className="mt-4 inline-flex items-center gap-2 rounded-full bg-[#202020] px-4 py-2 text-sm font-medium text-white"
                >
                  <Add size={16} color="#ffffff" />
                  Pick from Saved
                </button>
              </div>
            )}
          </div>
        </section>

        <section className="mt-3 shrink-0">
          <div className="mb-2 flex items-center justify-between gap-2">
            {conversation.length > 0 ? (
              <button
                type="button"
                onClick={handleClearHistory}
                className="text-xs font-medium text-[#7f6d5a]"
              >
                Clear chat
              </button>
            ) : null}
          </div>

          <div className="flex items-end gap-2 rounded-[28px]py-1 px-2">
            <textarea
              ref={promptTextareaRef}
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              rows={1}
              placeholder="Message Ju Intelli about this document..."
              className="min-h-12 max-h-28 flex-1 resize-none rounded-3xl border border-black/6 bg-white shadow-sm px-4 py-3 text-sm placeholder:text-sm text-[#202020] outline-none"
            />
            <button
              type="button"
              aria-label="Send message"
              onClick={handleSendPrompt}
              disabled={!selectedDocument || !prompt.trim()}
              className="flex p-3 items-center justify-center rounded-full bg-[#202020] disabled:cursor-not-allowed disabled:bg-[#c9c9c9]"
            >
              <ArrowRight2 size={18} color="#ffffff" />
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}
