import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export const runtime = "nodejs";

const ALLOWED_HOST_SUFFIX = ".amazonaws.com";
const GRAPHQL_ENDPOINT =
  process.env.GRAPHQL_ENDPOINT ?? "http://localhost:4000/graphql";
const PROTECTED_PDF_REQUEST_HEADER = "x-materialcrate-pdf-request";
const BLOCKED_FETCH_DESTINATIONS = new Set([
  "document",
  "embed",
  "frame",
  "iframe",
  "object",
]);
const FILE_URL_QUERY = `
  query PostFileUrl($id: ID!) {
    post(id: $id) {
      id
      fileUrl
    }
  }
`;

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

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const postId = searchParams.get("postId")?.trim() ?? "";
  const requestHeaders = new Headers(req.headers);
  const requestIntent = requestHeaders
    .get(PROTECTED_PDF_REQUEST_HEADER)
    ?.trim()
    .toLowerCase();
  const fetchDestination = requestHeaders
    .get("sec-fetch-dest")
    ?.trim()
    .toLowerCase();

  if (!postId) {
    return NextResponse.json({ error: "Post id is required" }, { status: 400 });
  }

  const isViewerRequest = requestIntent === "viewer";
  const isDownloadRequest = requestIntent === "download";

  if (
    (!isViewerRequest && !isDownloadRequest) ||
    (fetchDestination && BLOCKED_FETCH_DESTINATIONS.has(fetchDestination))
  ) {
    return NextResponse.json(
      { error: "Direct file access is not allowed" },
      { status: 403 },
    );
  }

  const cookieStore = await cookies();
  const token = cookieStore.get("mc_session")?.value;

  if (!token) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const graphqlResponse = await fetch(GRAPHQL_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    cache: "no-store",
    body: JSON.stringify({
      query: FILE_URL_QUERY,
      variables: { id: postId },
    }),
  });

  const graphqlBody = await graphqlResponse.json().catch(() => ({}));
  const fileUrl = graphqlBody?.data?.post?.fileUrl?.trim?.() ?? "";

  if (!fileUrl || !isAllowedFileUrl(fileUrl)) {
    return NextResponse.json({ error: "Invalid file URL" }, { status: 400 });
  }

  const upstreamResponse = await fetch(fileUrl, {
    method: "GET",
    cache: "no-store",
    headers: {
      Accept: "application/pdf,*/*",
    },
  });

  if (!upstreamResponse.ok || !upstreamResponse.body) {
    return NextResponse.json(
      { error: "Failed to fetch file" },
      { status: upstreamResponse.status || 502 },
    );
  }

  return new NextResponse(upstreamResponse.body, {
    status: 200,
    headers: {
      "Content-Type":
        upstreamResponse.headers.get("content-type") ?? "application/pdf",
      "Content-Disposition": isDownloadRequest
        ? 'attachment; filename="materialcrate-document.pdf"'
        : 'inline; filename="protected-document.pdf"',
      "Cache-Control": "private, no-store, no-cache, must-revalidate",
      Pragma: "no-cache",
      Expires: "0",
      "Accept-Ranges": "none",
      "Referrer-Policy": "no-referrer",
      "X-Content-Type-Options": "nosniff",
      "X-Frame-Options": "SAMEORIGIN",
      "Cross-Origin-Resource-Policy": "same-origin",
      "Cross-Origin-Opener-Policy": "same-origin",
      "Content-Security-Policy": "default-src 'none'; frame-ancestors 'self'; sandbox",
    },
  });
}
