import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export const runtime = "nodejs";

const GRAPHQL_ENDPOINT =
  process.env.GRAPHQL_ENDPOINT ?? "http://localhost:4000/graphql";
const GEMINI_API_BASE_URL =
  "https://generativelanguage.googleapis.com/v1beta/models";
const ALLOWED_HOST_SUFFIX = ".amazonaws.com";
const MAX_INLINE_DOCUMENT_BYTES = 45 * 1024 * 1024;

const MY_ARCHIVE_QUERY = `
  query JuIntelliArchive {
    myArchive {
      savedPosts {
        id
        postId
        post {
          id
          title
          description
          categories
          year
          fileUrl
          author {
            displayName
            username
          }
        }
        folder {
          id
          name
        }
      }
    }
  }
`;

type HubChatBody = {
  savedPostId?: string;
  prompt?: string;
  history?: Array<{
    role?: "user" | "assistant";
    text?: string;
  }>;
};

type ArchiveSavedPostRecord = {
  id?: string;
  postId?: string;
  post?: {
    id?: string;
    title?: string | null;
    description?: string | null;
    categories?: string[] | null;
    year?: number | null;
    fileUrl?: string | null;
    author?: {
      displayName?: string | null;
      username?: string | null;
    } | null;
  } | null;
  folder?: {
    id?: string;
    name?: string | null;
  } | null;
};

type GeminiResponseBody = {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
      }>;
    };
  }>;
  error?: {
    message?: string;
  };
};

const isAllowedFileUrl = (value: string) => {
  try {
    const parsed = new URL(value);
    return (
      parsed.protocol === "https:" &&
      parsed.hostname.endsWith(ALLOWED_HOST_SUFFIX) &&
      parsed.pathname.startsWith("/documents/")
    );
  } catch {
    return false;
  }
};

const extractReplyText = (body: GeminiResponseBody) => {
  const parts = body?.candidates?.[0]?.content?.parts;
  if (!Array.isArray(parts)) {
    return "";
  }

  return parts
    .map((part) => (typeof part?.text === "string" ? part.text : ""))
    .filter(Boolean)
    .join("\n")
    .trim();
};

const sanitizeHistory = (history: HubChatBody["history"]) => {
  if (!Array.isArray(history)) {
    return [] as Array<{ role: "user" | "assistant"; text: string }>;
  }

  return history
    .flatMap((message) => {
      const text = message?.text?.trim();
      if (!text) {
        return [];
      }

      return [
        {
          role: message?.role === "assistant" ? "assistant" : "user",
          text,
        },
      ];
    })
    .slice(-10);
};

export async function POST(req: Request) {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  const model = process.env.GEMINI_MODEL?.trim() || "gemini-2.5-flash-lite";

  if (!apiKey) {
    return NextResponse.json(
      { error: "Missing GEMINI_API_KEY configuration" },
      { status: 500 },
    );
  }

  const cookieStore = await cookies();
  const token = cookieStore.get("mc_session")?.value;

  if (!token) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  let body: HubChatBody;
  try {
    body = (await req.json()) as HubChatBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const savedPostId = body.savedPostId?.trim() ?? "";
  const prompt = body.prompt?.trim() ?? "";
  const priorHistory = sanitizeHistory(body.history);

  if (!savedPostId) {
    return NextResponse.json(
      { error: "savedPostId is required" },
      { status: 400 },
    );
  }

  if (!prompt) {
    return NextResponse.json({ error: "prompt is required" }, { status: 400 });
  }

  const graphqlResponse = await fetch(GRAPHQL_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    cache: "no-store",
    body: JSON.stringify({ query: MY_ARCHIVE_QUERY }),
  });

  const graphqlBody = await graphqlResponse.json().catch(() => ({}));

  if (!graphqlResponse.ok || graphqlBody?.errors?.length) {
    return NextResponse.json(
      {
        error:
          graphqlBody?.errors?.[0]?.message ||
          "Failed to load saved document for AI",
        details: graphqlBody?.errors ?? null,
      },
      { status: 400 },
    );
  }

  const savedPosts: ArchiveSavedPostRecord[] = Array.isArray(
    graphqlBody?.data?.myArchive?.savedPosts,
  )
    ? (graphqlBody.data.myArchive.savedPosts as ArchiveSavedPostRecord[])
    : [];

  const savedPost = savedPosts.find(
    (entry) =>
      entry?.id === savedPostId ||
      entry?.postId === savedPostId ||
      entry?.post?.id === savedPostId,
  );

  if (!savedPost?.post?.id) {
    return NextResponse.json(
      { error: "Saved document not found" },
      { status: 404 },
    );
  }

  const documentTitle = savedPost.post.title?.trim() || "Untitled document";
  const documentAuthor =
    savedPost.post.author?.displayName?.trim() ||
    savedPost.post.author?.username?.trim() ||
    "Unknown author";
  const documentDescription =
    savedPost.post.description?.trim() || "No description provided.";
  const documentCategories = Array.isArray(savedPost.post.categories)
    ? savedPost.post.categories.filter(Boolean).join(", ") || "Uncategorized"
    : "Uncategorized";
  const documentFolder = savedPost.folder?.name?.trim() || "Saved posts";

  const parts: Array<Record<string, unknown>> = [
    {
      text:
        `Selected Material Crate document:\n` +
        `Title: ${documentTitle}\n` +
        `Author: ${documentAuthor}\n` +
        `Folder: ${documentFolder}\n` +
        `Categories: ${documentCategories}\n` +
        `Description: ${documentDescription}`,
    },
  ];

  const fileUrl = savedPost.post.fileUrl?.trim?.() ?? "";
  if (fileUrl && isAllowedFileUrl(fileUrl)) {
    try {
      const fileResponse = await fetch(fileUrl, {
        method: "GET",
        cache: "no-store",
      });

      if (fileResponse.ok) {
        const contentType =
          fileResponse.headers.get("content-type")?.split(";")[0]?.trim() ||
          "application/pdf";
        const arrayBuffer = await fileResponse.arrayBuffer();

        if (arrayBuffer.byteLength <= MAX_INLINE_DOCUMENT_BYTES) {
          parts.push({
            inlineData: {
              mimeType: contentType,
              data: Buffer.from(arrayBuffer).toString("base64"),
            },
          });
        } else {
          parts.push({
            text: `The original file is too large to attach inline (${Math.round(
              arrayBuffer.byteLength / (1024 * 1024),
            )}MB). Answer using the available document metadata and the user request.`,
          });
        }
      }
    } catch {
      parts.push({
        text: "The original file could not be attached inline. Use the document metadata and conversation context to help the user.",
      });
    }
  }

  if (priorHistory.length > 0) {
    parts.push({
      text: `Conversation so far:\n${priorHistory
        .map(
          (message) =>
            `${message.role === "assistant" ? "Ju Intelli" : "User"}: ${message.text}`,
        )
        .join("\n")}`,
    });
  }

  parts.push({
    text: `User request:\n${prompt}`,
  });

  const geminiResponse = await fetch(
    `${GEMINI_API_BASE_URL}/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      cache: "no-store",
      body: JSON.stringify({
        systemInstruction: {
          parts: [
            {
              text:
                "You are Ju Intelli, the in-app study assistant for Material Crate. " +
                "Answer clearly and concisely using the selected saved document and the conversation context. " +
                "If the document does not contain enough information, say that directly instead of inventing details. " +
                "Do not mention Gemini, API keys, or internal implementation details.",
            },
          ],
        },
        contents: [
          {
            role: "user",
            parts,
          },
        ],
        generationConfig: {
          maxOutputTokens: 1024,
          temperature: 0.7,
        },
      }),
    },
  );

  const geminiBody = await geminiResponse.json().catch(() => ({}));
  const reply = extractReplyText(geminiBody);

  if (!geminiResponse.ok || !reply) {
    return NextResponse.json(
      {
        error: geminiBody?.error?.message || "Failed to generate AI response",
        details: geminiBody?.error ?? geminiBody ?? null,
      },
      { status: 400 },
    );
  }

  return NextResponse.json({
    ok: true,
    reply,
    model,
    documentTitle,
  });
}
