import { NextResponse } from "next/server";

export const runtime = "nodejs";

const ALLOWED_HOST_SUFFIX = ".amazonaws.com";

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
  const fileUrl = searchParams.get("url")?.trim() ?? "";

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
