import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export const runtime = "nodejs";

const ALLOWED_HOST_SUFFIX = ".amazonaws.com";
const GRAPHQL_ENDPOINT =
  process.env.GRAPHQL_ENDPOINT ?? "http://localhost:4000/graphql";
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
  let fileUrl = searchParams.get("url")?.trim() ?? "";

  if (postId) {
    const cookieStore = await cookies();
    const token = cookieStore.get("mc_session")?.value;

    const graphqlResponse = await fetch(GRAPHQL_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      cache: "no-store",
      body: JSON.stringify({
        query: FILE_URL_QUERY,
        variables: { id: postId },
      }),
    });

    const graphqlBody = await graphqlResponse.json().catch(() => ({}));
    fileUrl = graphqlBody?.data?.post?.fileUrl?.trim?.() ?? fileUrl;
  }

  if (!fileUrl || !isAllowedFileUrl(fileUrl)) {
    return NextResponse.json({ error: "Invalid file URL" }, { status: 400 });
  }

  const upstreamResponse = await fetch(fileUrl, {
    method: "GET",
    cache: "no-store",
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
      "Content-Disposition": 'inline; filename="document.pdf"',
      "Cache-Control": "no-store",
    },
  });
}
