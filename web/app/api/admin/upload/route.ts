import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ADMIN_COOKIE_NAME, verifyAdminToken } from "@/app/lib/admin-auth";

export const runtime = "nodejs";

const GRAPHQL_ENDPOINT =
  process.env.GRAPHQL_ENDPOINT ?? "http://localhost:4000/graphql";
const ADMIN_SECRET = process.env.ADMIN_SECRET ?? "";
const MAX_UPLOAD_FILE_BYTES = 20 * 1024 * 1024;

const ADMIN_CREATE_POST_MUTATION = `
  mutation AdminCreatePostAsBot(
    $botId: ID!
    $fileBase64: String!
    $thumbnailBase64: String
    $fileName: String!
    $mimeType: String!
    $title: String!
    $categories: [String!]!
    $description: String
    $year: Int
  ) {
    adminCreatePostAsBot(
      botId: $botId
      fileBase64: $fileBase64
      thumbnailBase64: $thumbnailBase64
      fileName: $fileName
      mimeType: $mimeType
      title: $title
      categories: $categories
      description: $description
      year: $year
    ) {
      id
      fileUrl
      thumbnailUrl
      title
      categories
      description
      year
      createdAt
      author {
        id
        displayName
        username
        profilePicture
        isBot
      }
    }
  }
`;

export async function POST(req: Request) {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_COOKIE_NAME)?.value;
  if (!token || !verifyAdminToken(token)) {
    return NextResponse.json({ error: "Not authorized" }, { status: 401 });
  }

  const formData = await req.formData();
  const botId = formData.get("botId");
  const file = formData.get("file");
  const title = formData.get("title");
  const rawCategories = formData.getAll("categories");
  const description = formData.get("description");
  const thumbnailBase64 = formData.get("thumbnailBase64");
  const yearValue = formData.get("year");

  if (typeof botId !== "string" || !botId.trim()) {
    return NextResponse.json(
      { error: "Bot selection is required" },
      { status: 400 },
    );
  }

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "File is required" }, { status: 400 });
  }

  if (file.size > MAX_UPLOAD_FILE_BYTES) {
    return NextResponse.json(
      { error: "File size exceeds 20MB limit" },
      { status: 400 },
    );
  }

  if (typeof title !== "string" || title.trim().length < 3) {
    return NextResponse.json(
      { error: "Title must be at least 3 characters" },
      { status: 400 },
    );
  }

  const categories = rawCategories
    .map((c) => (typeof c === "string" ? c.trim() : ""))
    .filter(Boolean);

  if (categories.length === 0 || categories.length > 3) {
    return NextResponse.json(
      { error: "Select between 1 and 3 categories" },
      { status: 400 },
    );
  }

  const arrayBuffer = await file.arrayBuffer();
  const fileBase64 = Buffer.from(arrayBuffer).toString("base64");

  let parsedYear: number | null = null;
  if (typeof yearValue === "string" && yearValue.trim().length) {
    const trimmed = yearValue.trim();
    if (/^\d{4}$/.test(trimmed)) {
      parsedYear = Number.parseInt(trimmed, 10);
    }
  }

  const res = await fetch(GRAPHQL_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-admin-secret": ADMIN_SECRET,
    },
    body: JSON.stringify({
      query: ADMIN_CREATE_POST_MUTATION,
      variables: {
        botId: botId.trim(),
        fileBase64,
        thumbnailBase64:
          typeof thumbnailBase64 === "string" && thumbnailBase64.trim()
            ? thumbnailBase64.trim()
            : null,
        fileName: file.name,
        mimeType: file.type || "application/pdf",
        title: title.trim(),
        categories,
        description:
          typeof description === "string" ? description.trim() : null,
        year: Number.isFinite(parsedYear) ? parsedYear : null,
      },
    }),
  });

  const body = await res.json().catch(() => ({}));

  if (!res.ok || body?.errors?.length) {
    return NextResponse.json(
      { error: body?.errors?.[0]?.message || "Failed to upload post" },
      { status: 400 },
    );
  }

  return NextResponse.json({
    ok: true,
    post: body?.data?.adminCreatePostAsBot,
  });
}
