"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Add,
  ArrowRight2,
  Clock,
  CloseCircle,
  DocumentText1,
  InfoCircle,
} from "iconsax-reactjs";
import Alert from "../components/Alert";
import LoadingBar from "../components/LoadingBar";
import { useSystemPopup } from "../components/SystemPopup";

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
  chatId?: string;
};

type ChatMeta = {
  id: string;
  documentTitle: string;
  updatedAt: string;
};

type HubChatRecord = {
  id: string;
  postId: string;
  savedPostId?: string | null;
  documentTitle: string;
  messages?: Array<Pick<ChatMessage, "id" | "role" | "text" | "createdAt">>;
  createdAt: string;
  updatedAt: string;
};

type HistoryEntry = {
  id: string;
  documentId: string;
  documentTitle: string;
  previewText: string;
  updatedAt: string;
};

type AiUsage = {
  dailyTokensUsed: number;
  monthlyTokensUsed: number;
  dailyTokenLimit: number;
  monthlyTokenLimit: number;
  dailyResetsAt: string;
  monthlyResetsAt: string;
  plan: string;
};

const mapChatRowsToMessages = (rows: HubChatRecord[]) =>
  rows
    .flatMap((chat) =>
      (Array.isArray(chat.messages) ? chat.messages : []).map((message) => ({
        ...message,
        documentId: chat.postId,
        documentTitle: chat.documentTitle,
        chatId: chat.id,
      })),
    )
    .sort(
      (left, right) =>
        new Date(left.createdAt).getTime() -
        new Date(right.createdAt).getTime(),
    );

const mapChatRowsToMeta = (rows: HubChatRecord[]) =>
  Object.fromEntries(
    rows
      .filter((chat) => chat.id && chat.postId)
      .map((chat) => [
        chat.postId,
        {
          id: chat.id,
          documentTitle: chat.documentTitle,
          updatedAt: chat.updatedAt,
        },
      ]),
  ) as Record<string, ChatMeta>;

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

const formatTokenCount = (count: number) => {
  if (count >= 1_000_000) {
    return `${(count / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  }
  if (count >= 1_000) {
    return `${(count / 1_000).toFixed(1).replace(/\.0$/, "")}k`;
  }
  return String(count);
};

const formatResetTime = (isoString: string) => {
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) {
    return "soon";
  }

  const now = new Date();
  const diffMs = date.getTime() - now.getTime();

  if (diffMs <= 0) {
    return "soon";
  }

  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

  if (diffHours >= 24) {
    const diffDays = Math.ceil(diffHours / 24);
    return `in ${diffDays} day${diffDays === 1 ? "" : "s"}`;
  }

  if (diffHours > 0) {
    return `in ${diffHours}h ${diffMinutes}m`;
  }

  return `in ${diffMinutes}m`;
};

const BULLET_LINE_REGEX = /^[-*•]\s+/;
const NUMBERED_LINE_REGEX = /^\d+\.\s+/;
const HEADING_LINE_REGEX = /^#{1,3}\s+/;

const renderInlineFormattedText = (text: string) =>
  text
    .split(/(\*\*[^*]+\*\*|`[^`]+`)/g)
    .filter(Boolean)
    .map((part, index) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return (
          <strong key={`${part}-${index}`} className="font-semibold">
            {part.slice(2, -2)}
          </strong>
        );
      }

      if (part.startsWith("`") && part.endsWith("`")) {
        return (
          <code
            key={`${part}-${index}`}
            className="rounded bg-black/6 px-1 py-0.5 font-mono text-[0.95em]"
          >
            {part.slice(1, -1)}
          </code>
        );
      }

      return <span key={`${part}-${index}`}>{part}</span>;
    });

const renderMessageText = (text: string) => {
  const normalizedLines = text.replace(/\r\n/g, "\n").split("\n");
  const blocks = [];
  let index = 0;

  while (index < normalizedLines.length) {
    const trimmedLine = normalizedLines[index].trim();

    if (!trimmedLine) {
      index += 1;
      continue;
    }

    if (BULLET_LINE_REGEX.test(trimmedLine)) {
      const items: string[] = [];

      while (index < normalizedLines.length) {
        const currentLine = normalizedLines[index].trim();

        if (!currentLine) {
          index += 1;
          break;
        }

        if (!BULLET_LINE_REGEX.test(currentLine)) {
          break;
        }

        items.push(currentLine.replace(BULLET_LINE_REGEX, "").trim());
        index += 1;
      }

      blocks.push(
        <ul
          key={`bullet-${blocks.length}`}
          className="list-disc space-y-2 pl-5"
        >
          {items.map((item, itemIndex) => (
            <li key={`${item}-${itemIndex}`} className="wrap-break-word">
              {renderInlineFormattedText(item)}
            </li>
          ))}
        </ul>,
      );
      continue;
    }

    if (NUMBERED_LINE_REGEX.test(trimmedLine)) {
      const items: string[] = [];

      while (index < normalizedLines.length) {
        const currentLine = normalizedLines[index].trim();

        if (!currentLine) {
          index += 1;
          break;
        }

        if (!NUMBERED_LINE_REGEX.test(currentLine)) {
          break;
        }

        items.push(currentLine.replace(NUMBERED_LINE_REGEX, "").trim());
        index += 1;
      }

      blocks.push(
        <ol
          key={`numbered-${blocks.length}`}
          className="list-decimal space-y-2 pl-5"
        >
          {items.map((item, itemIndex) => (
            <li key={`${item}-${itemIndex}`} className="wrap-break-word">
              {renderInlineFormattedText(item)}
            </li>
          ))}
        </ol>,
      );
      continue;
    }

    const paragraphLines: string[] = [];
    while (index < normalizedLines.length) {
      const currentLine = normalizedLines[index];
      const currentTrimmed = currentLine.trim();

      if (!currentTrimmed) {
        index += 1;
        break;
      }

      if (
        BULLET_LINE_REGEX.test(currentTrimmed) ||
        NUMBERED_LINE_REGEX.test(currentTrimmed)
      ) {
        break;
      }

      paragraphLines.push(currentLine.trimEnd());
      index += 1;
    }

    const paragraphText = paragraphLines.join("\n").trim();
    const isHeading =
      paragraphLines.length === 1 && HEADING_LINE_REGEX.test(paragraphText);

    blocks.push(
      <p
        key={`paragraph-${blocks.length}`}
        className={`wrap-break-word whitespace-pre-wrap ${
          isHeading ? "font-semibold text-ink" : ""
        }`}
      >
        {renderInlineFormattedText(
          isHeading
            ? paragraphText.replace(HEADING_LINE_REGEX, "")
            : paragraphText,
        )}
      </p>,
    );
  }

  return <div className="space-y-3">{blocks}</div>;
};

export default function HubPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const requestedPostId = searchParams.get("postId")?.trim() ?? "";
  const hideHeaderTimerRef = useRef<number | null>(null);
  const chatScrollRef = useRef<HTMLDivElement | null>(null);
  const promptTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const streamingTextRef = useRef("");
  const streamingRafRef = useRef<number | null>(null);
  const popup = useSystemPopup();

  const [archive, setArchive] = useState<ArchiveData | null>(null);
  const [directDocument, setDirectDocument] = useState<ArchiveSavedPost | null>(
    null,
  );
  const [selectedDocumentId, setSelectedDocumentId] = useState("");
  const [prompt, setPrompt] = useState("");
  const [history, setHistory] = useState<ChatMessage[]>([]);
  const [chatMetaByDocumentId, setChatMetaByDocumentId] = useState<
    Record<string, ChatMeta>
  >({});
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [isResolvingRequestedDocument, setIsResolvingRequestedDocument] =
    useState(false);
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isHeaderVisible, setIsHeaderVisible] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [streamingMessage, setStreamingMessage] = useState<{
    id: string;
    text: string;
    documentId: string;
  } | null>(null);
  const [isClearingChat, setIsClearingChat] = useState(false);
  const [error, setError] = useState("");
  const [aiUsage, setAiUsage] = useState<AiUsage | null>(null);
  const [isLimitDrawerOpen, setIsLimitDrawerOpen] = useState(false);

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
    const container = chatScrollRef.current;
    if (!container) {
      return;
    }

    const distanceFromBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight;

    if (distanceFromBottom < 120) {
      container.scrollTop = container.scrollHeight;
    }
  }, [streamingMessage]);

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
          setError("Failed to load your saved files.");
          console.error("Error loading saved files:", loadError);
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
    let isCancelled = false;

    const loadChatHistory = async () => {
      try {
        setIsLoadingHistory(true);

        const response = await fetch("/api/hub/chat", {
          method: "GET",
          cache: "no-store",
        });
        const body = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error(body?.error || "Failed to load chat history.");
        }

        const chats = Array.isArray(body?.chats)
          ? (body.chats as HubChatRecord[])
          : [];

        if (!isCancelled) {
          setHistory(mapChatRowsToMessages(chats));
          setChatMetaByDocumentId(mapChatRowsToMeta(chats));
        }
      } catch (historyError) {
        if (!isCancelled) {
          console.error("Error loading chat history:", historyError);
        }
      } finally {
        if (!isCancelled) {
          setIsLoadingHistory(false);
        }
      }
    };

    void loadChatHistory();

    return () => {
      isCancelled = true;
    };
  }, []);

  useEffect(() => {
    let isCancelled = false;

    const loadUsage = async () => {
      try {
        const response = await fetch("/api/hub/usage", {
          method: "GET",
          cache: "no-store",
        });
        const body = await response.json().catch(() => ({}));

        if (!isCancelled && response.ok && body?.usage) {
          setAiUsage(body.usage as AiUsage);
        }
      } catch {
        // Non-blocking
      }
    };

    void loadUsage();

    return () => {
      isCancelled = true;
    };
  }, []);

  const savedDocuments = useMemo(() => archive?.savedPosts ?? [], [archive]);

  const requestedSavedDocument = useMemo(
    () =>
      requestedPostId
        ? (savedDocuments.find((document) =>
            [document.id, document.postId, document.post.id].some(
              (value) => value === requestedPostId,
            ),
          ) ?? null)
        : null,
    [requestedPostId, savedDocuments],
  );

  useEffect(() => {
    if (!requestedPostId || requestedSavedDocument) {
      setDirectDocument(null);
      setIsResolvingRequestedDocument(false);
      return;
    }

    let isCancelled = false;

    const loadRequestedDocument = async () => {
      try {
        setIsResolvingRequestedDocument(true);
        const response = await fetch(
          `/api/posts/${encodeURIComponent(requestedPostId)}`,
          {
            method: "GET",
            cache: "no-store",
          },
        );
        const body = await response.json().catch(() => ({}));

        if (!response.ok || !body?.post?.id) {
          throw new Error(body?.error || "Failed to load the selected file.");
        }

        if (!isCancelled) {
          setDirectDocument({
            id: body.post.id,
            postId: body.post.id,
            createdAt: body.post.createdAt,
            post: body.post,
            folder: null,
          });
        }
      } catch {
        if (!isCancelled) {
          setDirectDocument(null);
        }
      } finally {
        if (!isCancelled) {
          setIsResolvingRequestedDocument(false);
        }
      }
    };

    void loadRequestedDocument();

    return () => {
      isCancelled = true;
    };
  }, [requestedPostId, requestedSavedDocument]);

  const documents = useMemo(() => {
    if (!directDocument) {
      return savedDocuments;
    }

    const alreadyIncluded = savedDocuments.some((document) =>
      [document.id, document.postId, document.post.id].some(
        (value) => value === directDocument.post.id,
      ),
    );

    return alreadyIncluded
      ? savedDocuments
      : [directDocument, ...savedDocuments];
  }, [directDocument, savedDocuments]);

  const requestedDocument = useMemo(
    () =>
      requestedSavedDocument ??
      (requestedPostId
        ? (documents.find((document) =>
            [document.id, document.postId, document.post.id].some(
              (value) => value === requestedPostId,
            ),
          ) ?? null)
        : null),
    [documents, requestedPostId, requestedSavedDocument],
  );

  useEffect(() => {
    if (documents.length === 0 && !requestedDocument) {
      return;
    }

    setSelectedDocumentId((current) => {
      if (requestedDocument?.post.id) {
        return requestedDocument.post.id;
      }

      if (
        current &&
        documents.some((document) => document.post.id === current)
      ) {
        return current;
      }

      return documents[0]?.post.id ?? "";
    });
  }, [documents, requestedDocument]);

  const selectedDocument = useMemo(
    () =>
      documents.find((document) => document.post.id === selectedDocumentId) ??
      requestedDocument ??
      documents[0] ??
      null,
    [documents, requestedDocument, selectedDocumentId],
  );

  const selectedChatId = useMemo(
    () =>
      selectedDocument
        ? (chatMetaByDocumentId[selectedDocument.post.id]?.id ?? "")
        : "",
    [chatMetaByDocumentId, selectedDocument],
  );

  const conversation = useMemo(
    () =>
      selectedDocument
        ? history.filter((message) =>
            [selectedDocument.post.id, selectedDocument.id].includes(
              message.documentId,
            ),
          )
        : [],
    [history, selectedDocument],
  );

  const historyEntries = useMemo<HistoryEntry[]>(() => {
    return Object.entries(chatMetaByDocumentId)
      .map(([documentId, meta]) => {
        const chatMessages = history.filter(
          (message) =>
            message.chatId === meta.id ||
            (!message.chatId && message.documentId === documentId),
        );
        const latestUserMessage = chatMessages
          .slice()
          .reverse()
          .find((message) => message.role === "user");
        const latestMessage = chatMessages[chatMessages.length - 1];

        return {
          id: meta.id,
          documentId,
          documentTitle: meta.documentTitle,
          previewText:
            latestUserMessage?.text ||
            latestMessage?.text ||
            "Open conversation",
          updatedAt: latestMessage?.createdAt || meta.updatedAt,
        };
      })
      .sort(
        (left, right) =>
          new Date(right.updatedAt).getTime() -
          new Date(left.updatedAt).getTime(),
      );
  }, [chatMetaByDocumentId, history]);

  const requestedDocumentMissing =
    Boolean(requestedPostId) &&
    !isLoading &&
    !isResolvingRequestedDocument &&
    !requestedDocument;

  const handleSelectDocument = (documentId: string) => {
    setSelectedDocumentId(documentId);
    setIsPickerOpen(false);
  };

  const syncChatFromServer = useCallback((chat: HubChatRecord | null) => {
    if (!chat?.id || !chat?.postId) {
      return;
    }

    setChatMetaByDocumentId((current) => ({
      ...current,
      [chat.postId]: {
        id: chat.id,
        documentTitle: chat.documentTitle,
        updatedAt: chat.updatedAt,
      },
    }));

    const nextMessages = mapChatRowsToMessages([chat]);

    setHistory((current) => {
      const remainingMessages = current.filter(
        (message) =>
          message.documentId !== chat.postId && message.chatId !== chat.id,
      );

      return [...remainingMessages, ...nextMessages].sort(
        (left, right) =>
          new Date(left.createdAt).getTime() -
          new Date(right.createdAt).getTime(),
      );
    });
  }, []);

  const handleClearChat = useCallback(async () => {
    if (!selectedDocument || !selectedChatId || isClearingChat) {
      return;
    }

    const confirmed = await popup.confirm({
      title: "Clear chat?",
      message:
        "This will permanently remove this Ju Intelli conversation from your history.",
      confirmLabel: "Clear",
      cancelLabel: "Cancel",
      isDestructive: true,
    });

    if (!confirmed) {
      return;
    }

    try {
      setIsClearingChat(true);
      setError("");

      const response = await fetch("/api/hub/chat", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          chatId: selectedChatId,
        }),
      });
      const body = await response.json().catch(() => ({}));

      if (!response.ok || !body?.ok) {
        throw new Error(body?.error || "Failed to clear chat.");
      }

      setHistory((current) =>
        current.filter((message) => message.chatId !== selectedChatId),
      );
      setChatMetaByDocumentId((current) => {
        const next = { ...current };
        delete next[selectedDocument.post.id];
        return next;
      });
      setPrompt("");
    } catch (clearError) {
      setError(
        clearError instanceof Error
          ? clearError.message
          : "Failed to clear chat.",
      );
    } finally {
      setIsClearingChat(false);
    }
  }, [isClearingChat, popup, selectedChatId, selectedDocument]);

  const handleSendPrompt = async () => {
    if (!selectedDocument || !prompt.trim() || isSending) {
      return;
    }

    if (aiUsage) {
      const dailyExceeded = aiUsage.dailyTokensUsed >= aiUsage.dailyTokenLimit;
      const monthlyExceeded =
        aiUsage.monthlyTokensUsed >= aiUsage.monthlyTokenLimit;

      if (dailyExceeded || monthlyExceeded) {
        setIsLimitDrawerOpen(true);
        return;
      }
    }

    const nextPrompt = prompt.trim();
    const documentTitle =
      selectedDocument.post.title?.trim() || "Untitled document";
    const timestamp = new Date().toISOString();
    const userMessage: ChatMessage = {
      id: createMessageId(),
      role: "user",
      text: nextPrompt,
      createdAt: timestamp,
      documentId: selectedDocument.post.id,
      documentTitle,
    };

    setHistory((current) => [...current, userMessage]);
    setPrompt("");
    setError("");
    setIsSending(true);
    streamingTextRef.current = "";
    setStreamingMessage({
      id: createMessageId(),
      text: "",
      documentId: selectedDocument.post.id,
    });

    try {
      const response = await fetch("/api/hub/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          savedPostId:
            selectedDocument.id !== selectedDocument.post.id
              ? selectedDocument.id
              : undefined,
          postId: selectedDocument.post.id,
          prompt: nextPrompt,
          history: conversation.map((message) => ({
            id: message.id,
            role: message.role,
            text: message.text,
            createdAt: message.createdAt,
          })),
        }),
      });

      if (response.status === 429) {
        const body = await response.json().catch(() => ({}));
        if (body?.usage) {
          setAiUsage(body.usage as AiUsage);
        }
        setHistory((current) => current.filter((m) => m.id !== userMessage.id));
        setPrompt(nextPrompt);
        setIsLimitDrawerOpen(true);
        return;
      }

      if (!response.ok || !response.body) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body?.error || "Failed to get Ju Intelli response.");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      outer: while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const jsonStr = line.slice(6).trim();
          if (!jsonStr) continue;

          try {
            const event = JSON.parse(jsonStr) as Record<string, unknown>;

            if (event.type === "chunk" && typeof event.text === "string") {
              streamingTextRef.current += event.text as string;
              if (streamingRafRef.current === null) {
                streamingRafRef.current = requestAnimationFrame(() => {
                  const text = streamingTextRef.current;
                  setStreamingMessage((current) =>
                    current ? { ...current, text } : null,
                  );
                  streamingRafRef.current = null;
                });
              }
            } else if (event.type === "done") {
              if (event.usage) {
                setAiUsage(event.usage as AiUsage);
              }
              if (event.chat) {
                syncChatFromServer(event.chat as HubChatRecord);
              } else if (typeof event.reply === "string") {
                setHistory((current) => [
                  ...current,
                  {
                    id: createMessageId(),
                    role: "assistant",
                    text: event.reply as string,
                    createdAt: new Date().toISOString(),
                    documentId: selectedDocument.post.id,
                    documentTitle,
                    chatId: selectedChatId || undefined,
                  },
                ]);
              }
              if (typeof event.warning === "string") {
                setError(event.warning);
              }
              break outer;
            }
          } catch {
            // ignore malformed events
          }
        }
      }
    } catch (chatError) {
      const message =
        chatError instanceof Error
          ? chatError.message
          : "Failed to get Ju Intelli response.";

      setError(message);
      setHistory((current) => [
        ...current,
        {
          id: createMessageId(),
          role: "assistant",
          text: `I couldn’t respond right now. ${message}`,
          createdAt: new Date().toISOString(),
          documentId: selectedDocument.post.id,
          documentTitle,
        },
      ]);
    } finally {
      if (streamingRafRef.current !== null) {
        cancelAnimationFrame(streamingRafRef.current);
        streamingRafRef.current = null;
      }
      setStreamingMessage(null);
      setIsSending(false);
    }
  };

  const handleUseHistoryEntry = async (entry: HistoryEntry) => {
    const matchingDocument = documents.find((document) =>
      [document.post.id, document.id].includes(entry.documentId),
    );

    setIsHistoryOpen(false);

    if (matchingDocument?.post.id) {
      setSelectedDocumentId(matchingDocument.post.id);
      return;
    }

    try {
      setIsResolvingRequestedDocument(true);
      const response = await fetch(
        `/api/posts/${encodeURIComponent(entry.documentId)}`,
        {
          method: "GET",
          cache: "no-store",
        },
      );
      const body = await response.json().catch(() => ({}));

      if (!response.ok || !body?.post?.id) {
        throw new Error(body?.error || "Failed to reopen that document.");
      }

      setDirectDocument({
        id: body.post.id,
        postId: body.post.id,
        createdAt: body.post.createdAt,
        post: body.post,
        folder: null,
      });
      setSelectedDocumentId(body.post.id);
      setError("");
    } catch (historyError) {
      setError("Failed to reopen that document.");
      console.error("Error reopening document from history:", historyError);
    } finally {
      setIsResolvingRequestedDocument(false);
    }
  };

  return (
    <div
      className="h-dvh overflow-hidden bg-page text-ink"
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
      {(isLoading || isLoadingHistory) && <LoadingBar />}
      {error ? <Alert type="error" message={error} /> : null}

      {isPickerOpen && (
        <>
          <button
            type="button"
            aria-label="Close saved document picker"
            onClick={() => setIsPickerOpen(false)}
            className="fixed inset-0 z-40 bg-black/30"
          />
          <div className="fixed inset-x-0 bottom-0 z-50 rounded-t-4xl bg-page px-4 pb-6 pt-4 shadow-[0_-18px_40px_rgba(0,0,0,0.14)] lg:left-1/2 lg:right-auto lg:w-full lg:max-w-2xl lg:-translate-x-1/2">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-ink-2">
                  Saved posts
                </p>
                <h2 className="text-base font-semibold text-ink">
                  Choose a document for Ju Intelli
                </h2>
              </div>
              <button
                type="button"
                aria-label="Close"
                onClick={() => setIsPickerOpen(false)}
                className="transition-opacity hover:opacity-70 active:opacity-40"
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
                      onClick={() => handleSelectDocument(document.post.id)}
                      className={`flex w-full items-start gap-3 rounded-[20px] border px-3 py-3 text-left transition hover:opacity-80 active:opacity-60 ${
                        isSelected
                          ? "border-[#202020] bg-page"
                          : "border-edge bg-surface"
                      }`}
                    >
                      <div className="rounded-2xl bg-surface-high p-2 text-ink">
                        <DocumentText1 size={18} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="truncate text-sm font-semibold text-ink">
                            {title}
                          </p>
                          {isSelected && (
                            <span className="shrink-0 rounded-full bg-[#202020] px-2 py-1 text-[10px] font-medium text-white">
                              Selected
                            </span>
                          )}
                        </div>
                        <p className="mt-1 text-xs text-ink-2">
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
                <div className="rounded-[20px] bg-page px-4 py-5 text-sm text-ink-2">
                  No saved files yet. You can still open any file directly in Ju
                  Intelli from the rest of the app.
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {isHistoryOpen ? (
        <>
          <button
            type="button"
            aria-label="Close history"
            onClick={() => setIsHistoryOpen(false)}
            className="fixed inset-0 z-40 bg-black/30"
          />
          <div className="fixed inset-x-0 bottom-0 z-50 rounded-t-4xl bg-surface px-4 pb-6 pt-4 shadow-[0_-18px_40px_rgba(0,0,0,0.14)] lg:left-1/2 lg:right-auto lg:w-full lg:max-w-2xl lg:-translate-x-1/2">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-ink-2">
                  History
                </p>
                <h2 className="text-base font-semibold text-ink">
                  Recent Ju Intelli chats
                </h2>
              </div>
              <button
                type="button"
                aria-label="Close history"
                onClick={() => setIsHistoryOpen(false)}
                className="transition-opacity hover:opacity-70 active:opacity-40"
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
                    className="w-full rounded-[20px] border border-edge bg-surface px-3 py-3 text-left transition-colors hover:bg-surface-high active:opacity-70"
                  >
                    <p className="text-xs font-medium text-ink-2">
                      {entry.documentTitle}
                    </p>
                    <p className="mt-1 line-clamp-2 text-sm text-ink">
                      {entry.previewText}
                    </p>
                    <p className="mt-1 text-[11px] text-ink-3">
                      {formatHistoryTime(entry.updatedAt)}
                    </p>
                  </button>
                ))}
              </div>
            ) : (
              <div className="rounded-[20px] bg-page px-4 py-5 text-sm text-ink-2">
                No chat history yet. Your prompts will appear here once you
                start a conversation.
              </div>
            )}
          </div>
        </>
      ) : null}

      <header
        className={`fixed inset-x-0 top-0 z-30 border-b border-edge bg-surface px-4 backdrop-blur-sm transition-all duration-300 ${
          isHeaderVisible
            ? "translate-y-0 opacity-100"
            : "-translate-y-full opacity-0 pointer-events-none"
        }`}
      >
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 pb-3 pt-6">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-ink-2">
              Hub
            </p>
            <h1 className="text-lg font-medium text-ink">Ju Intelli</h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              aria-label="View history"
              onClick={() => setIsHistoryOpen(true)}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-edge-mid bg-surface transition-colors hover:bg-surface-high active:opacity-70"
            >
              <Clock size={18} color="var(--ink)" />
            </button>
            <button
              type="button"
              aria-label="Choose a saved document"
              onClick={() => setIsPickerOpen(true)}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-edge-mid bg-surface transition-colors hover:bg-surface-high active:opacity-70"
            >
              <Add size={18} color="var(--ink)" />
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
            That file couldn&apos;t be loaded directly. Tap{" "}
            <span className="font-semibold">+</span> to choose another document.
          </section>
        ) : null}

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden lg:rounded-2xl lg:border lg:border-edge lg:bg-surface lg:shadow-sm">
        <section className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="shrink-0 border-b border-edge px-4 py-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-medium text-ink">
                  {selectedDocument?.post.title?.trim() || "Choose a document"}
                </p>
                <p className="mt-1 text-xs text-ink-2">
                  {selectedDocument
                    ? `${selectedDocument.post.author?.displayName?.trim() || selectedDocument.post.author?.username?.trim() || "Unknown author"}${selectedDocument.folder?.name ? ` • ${selectedDocument.folder.name}` : selectedDocument.id === selectedDocument.post.id ? " • Opened from app" : " • Saved posts"}`
                    : "You can use any document opened from the app, and saved posts also appear here for quick access."}
                </p>
              </div>

              {selectedDocument && conversation.length > 0 ? (
                <button
                  type="button"
                  onClick={() => void handleClearChat()}
                  disabled={isClearingChat}
                  className="shrink-0 rounded-full border border-edge-mid bg-surface px-3 py-2 text-xs font-medium text-ink transition-colors hover:bg-surface-high active:opacity-70 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isClearingChat ? "Clearing..." : "Clear chat"}
                </button>
              ) : null}
            </div>
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
                            : "bg-surface-high text-ink"
                        }`}
                      >
                        {message.role === "assistant" ? (
                          renderMessageText(message.text)
                        ) : (
                          <p className="wrap-break-word whitespace-pre-wrap">
                            {message.text}
                          </p>
                        )}
                        <p
                          className={`mt-2 text-[11px] ${
                            message.role === "user"
                              ? "text-white/70"
                              : "text-ink-3"
                          }`}
                        >
                          {formatHistoryTime(message.createdAt)}
                        </p>
                      </div>
                    </div>
                  ))}
                  {isSending ? (
                    <div className="flex justify-start">
                      <div className="max-w-[85%] rounded-3xl bg-surface-high px-4 py-3 text-sm leading-6 text-ink">
                        {streamingMessage?.documentId ===
                          selectedDocument?.post.id &&
                        streamingMessage?.text ? (
                          <>
                            <p className="wrap-break-word whitespace-pre-wrap">
                              {streamingMessage.text}
                            </p>
                            <span className="ml-0.5 inline-block animate-pulse">
                              ▋
                            </span>
                          </>
                        ) : (
                          <span className="text-ink-2">
                            Ju Intelli is thinking…
                          </span>
                        )}
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : (
                <div className="flex min-h-full flex-col items-center justify-center px-4 py-8 text-center">
                  <div className="rounded-full bg-surface-high p-3">
                    <DocumentText1 size={20} color="var(--ink)" />
                  </div>
                  <h2 className="mt-4 text-lg font-medium text-ink">
                    Start a new chat
                  </h2>
                  <p className="mt-2 max-w-md text-sm leading-6 text-ink-2">
                    Ask Ju Intelli about this document. Only this message area
                    scrolls, and your chat is saved to your account history.
                  </p>
                  <div className="mt-4 flex flex-wrap justify-center gap-2">
                    {PROMPT_SUGGESTIONS.map((suggestion) => (
                      <button
                        key={suggestion}
                        type="button"
                        onClick={() => setPrompt(suggestion)}
                        className="rounded-full border border-edge-mid bg-surface px-3 py-2 text-xs text-ink transition-colors hover:bg-surface-high active:opacity-70"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </div>
              )
            ) : (
              <div className="flex min-h-full flex-col items-center justify-center px-4 py-8 text-center">
                <h2 className="text-lg font-medium text-ink">
                  Choose a document
                </h2>
                <p className="mt-2 max-w-md text-sm leading-6 text-ink-2">
                  Ju Intelli works with saved posts and with files opened
                  directly from elsewhere in the app.
                </p>
                <button
                  type="button"
                  onClick={() => setIsPickerOpen(true)}
                  className="mt-4 inline-flex items-center gap-2 rounded-full bg-[#202020] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#333333] active:opacity-80"
                >
                  <Add size={16} color="#ffffff" />
                  Pick from Saved
                </button>
              </div>
            )}
          </div>
        </section>

        <section className="mt-3 shrink-0 lg:mt-0 lg:border-t lg:border-edge">
          <div className="flex items-end gap-2 px-2 py-1">
            <textarea
              ref={promptTextareaRef}
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey && navigator.maxTouchPoints === 0) {
                  e.preventDefault();
                  void handleSendPrompt();
                }
              }}
              rows={1}
              placeholder="Message Ju Intelli about this document..."
              className="min-h-12 max-h-28 flex-1 resize-none rounded-3xl border border-edge bg-surface shadow-sm px-4 py-3 text-sm placeholder:text-sm text-ink outline-none lg:rounded-2xl lg:border-0 lg:shadow-none lg:bg-transparent"
            />
            <button
              type="button"
              aria-label="Send message"
              onClick={handleSendPrompt}
              disabled={isSending || !selectedDocument || !prompt.trim()}
              className="flex p-3 items-center justify-center rounded-full bg-[#202020] transition-colors hover:bg-[#333333] active:scale-95 disabled:cursor-not-allowed disabled:bg-[#c9c9c9]"
            >
              <ArrowRight2 size={18} color="#ffffff" />
            </button>
          </div>
        </section>
        </div>
      </main>

      <div
        className={`fixed inset-x-0 bottom-0 z-100 rounded-t-3xl bg-surface px-6 py-6 transition-all duration-300 ease-out lg:left-1/2 lg:right-auto lg:w-full lg:max-w-2xl lg:-translate-x-1/2 ${
          isLimitDrawerOpen
            ? "translate-y-0 opacity-100 pointer-events-auto"
            : "translate-y-[110%] opacity-0 pointer-events-none"
        }`}
      >
        <div className="space-y-5">
          <div className="flex justify-center items-center relative">
            <h1 className="text-lg text-ink font-medium">
              Usage Limit Reached
            </h1>
            <button
              type="button"
              aria-label="Close"
              onClick={() => setIsLimitDrawerOpen(false)}
              className="absolute right-0 transition-opacity hover:opacity-70 active:opacity-40"
            >
              <CloseCircle size={24} color="#959595" />
            </button>
          </div>

          {aiUsage ? (
            <div className="space-y-4">
              <div className="rounded-2xl bg-[#FFF8F2] border border-[#F5DFC8] px-4 py-4 space-y-3">
                <div className="flex items-center gap-2">
                  <InfoCircle size={18} color="#A95A13" variant="Bold" />
                  <p className="text-sm font-medium text-[#A95A13]">
                    {aiUsage.dailyTokensUsed >= aiUsage.dailyTokenLimit
                      ? "Daily limit reached"
                      : "Monthly limit reached"}
                  </p>
                </div>
                <p className="text-xs leading-5 text-[#7A5A3A]">
                  {aiUsage.dailyTokensUsed >= aiUsage.dailyTokenLimit
                    ? `You've used all ${formatTokenCount(aiUsage.dailyTokenLimit)} daily tokens. Your limit resets ${formatResetTime(aiUsage.dailyResetsAt)}.`
                    : `You've used all ${formatTokenCount(aiUsage.monthlyTokenLimit)} monthly tokens. Your limit resets ${formatResetTime(aiUsage.monthlyResetsAt)}.`}
                </p>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-medium text-ink-3 uppercase tracking-wider">
                  Your usage
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-2xl border border-edge bg-surface-high px-4 py-3">
                    <p className="text-xs text-ink-3">Today</p>
                    <p className="mt-1 text-base font-semibold text-ink">
                      {formatTokenCount(aiUsage.dailyTokensUsed)}{" "}
                      <span className="text-xs font-normal text-ink-3">
                        / {formatTokenCount(aiUsage.dailyTokenLimit)}
                      </span>
                    </p>
                    <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-[#E8E8E8]">
                      <div
                        className="h-full rounded-full bg-[#E1761F] transition-all duration-500"
                        style={{
                          width: `${Math.min(100, (aiUsage.dailyTokensUsed / aiUsage.dailyTokenLimit) * 100)}%`,
                        }}
                      />
                    </div>
                    <p className="mt-1.5 text-[11px] text-ink-3">
                      Resets {formatResetTime(aiUsage.dailyResetsAt)}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-edge bg-surface-high px-4 py-3">
                    <p className="text-xs text-ink-3">This month</p>
                    <p className="mt-1 text-base font-semibold text-ink">
                      {formatTokenCount(aiUsage.monthlyTokensUsed)}{" "}
                      <span className="text-xs font-normal text-ink-3">
                        / {formatTokenCount(aiUsage.monthlyTokenLimit)}
                      </span>
                    </p>
                    <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-[#E8E8E8]">
                      <div
                        className="h-full rounded-full bg-[#E1761F] transition-all duration-500"
                        style={{
                          width: `${Math.min(100, (aiUsage.monthlyTokensUsed / aiUsage.monthlyTokenLimit) * 100)}%`,
                        }}
                      />
                    </div>
                    <p className="mt-1.5 text-[11px] text-ink-3">
                      Resets {formatResetTime(aiUsage.monthlyResetsAt)}
                    </p>
                  </div>
                </div>
              </div>

              {aiUsage.plan === "free" || aiUsage.plan === "pro" ? (
                <button
                  type="button"
                  onClick={() => {
                    setIsLimitDrawerOpen(false);
                    router.push("/plans");
                  }}
                  className="w-full rounded-2xl bg-[#E1761F] py-3 text-sm font-medium text-white transition hover:bg-[#C96818] active:opacity-80"
                >
                  {aiUsage.plan === "free"
                    ? "Upgrade to Pro"
                    : "Upgrade to Premium"}
                </button>
              ) : null}

              <div className="rounded-2xl border border-edge bg-surface-high px-4 py-3">
                <p className="text-xs font-medium text-ink-3 uppercase tracking-wider">
                  Token limits by plan
                </p>
                <div className="mt-2 space-y-2">
                  {[
                    {
                      plan: "Free",
                      daily: "1k",
                      monthly: "10k",
                      active: aiUsage.plan === "free",
                    },
                    {
                      plan: "Pro",
                      daily: "25k",
                      monthly: "500k",
                      active: aiUsage.plan === "pro",
                    },
                    {
                      plan: "Premium",
                      daily: "75k",
                      monthly: "2M",
                      active: aiUsage.plan === "premium",
                    },
                  ].map((tier) => (
                    <div
                      key={tier.plan}
                      className={`flex items-center justify-between rounded-xl px-3 py-2 text-xs ${
                        tier.active
                          ? "bg-[#FFF1DE] text-[#A95A13] font-medium"
                          : "text-ink-2"
                      }`}
                    >
                      <span>
                        {tier.plan}
                        {tier.active ? " (current)" : ""}
                      </span>
                      <span>
                        {tier.daily}/day · {tier.monthly}/mo
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
