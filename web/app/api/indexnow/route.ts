import { NextRequest, NextResponse } from "next/server";
import {
  getBaseUrl,
  getIndexNowKey,
  getIndexNowKeyLocation,
  getIndexNowUrlList,
} from "@/app/lib/site-url";

export const runtime = "nodejs";

const INDEXNOW_ENDPOINT = "https://api.indexnow.org/IndexNow";
const MAX_URLS_PER_REQUEST = 10_000;

type IndexNowBody = {
  urlList?: string[];
};

const normalizeUrlList = (incomingUrls?: string[]) => {
  const baseUrl = getBaseUrl();
  const base = new URL(`${baseUrl}/`);
  const fallbackUrls = getIndexNowUrlList();
  const candidates =
    Array.isArray(incomingUrls) && incomingUrls.length > 0
      ? incomingUrls
      : fallbackUrls;

  return Array.from(
    new Set(
      candidates.flatMap((value) => {
        if (typeof value !== "string") {
          return [] as string[];
        }

        const trimmed = value.trim();
        if (!trimmed) {
          return [] as string[];
        }

        try {
          const resolved =
            trimmed.startsWith("http://") || trimmed.startsWith("https://")
              ? new URL(trimmed)
              : new URL(trimmed, base);

          if (resolved.host !== base.host) {
            return [] as string[];
          }

          resolved.hash = "";
          return [resolved.toString()];
        } catch {
          return [] as string[];
        }
      }),
    ),
  ).slice(0, MAX_URLS_PER_REQUEST);
};

const buildPayload = (incomingUrls?: string[]) => {
  const baseUrl = getBaseUrl();
  const host = new URL(baseUrl).host;
  const urlList = normalizeUrlList(incomingUrls);

  return {
    host,
    key: getIndexNowKey(),
    keyLocation: getIndexNowKeyLocation(),
    urlList,
  };
};

export async function GET() {
  return NextResponse.json({
    ok: true,
    endpoint: INDEXNOW_ENDPOINT,
    payload: buildPayload(),
  });
}

export async function POST(request: NextRequest) {
  let body: IndexNowBody = {};

  try {
    body = (await request.json()) as IndexNowBody;
  } catch {
    body = {};
  }

  const payload = buildPayload(body.urlList);

  if (payload.urlList.length === 0) {
    return NextResponse.json(
      { error: "No valid same-host URLs were provided for IndexNow." },
      { status: 400 },
    );
  }

  const response = await fetch(INDEXNOW_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json; charset=utf-8",
    },
    cache: "no-store",
    body: JSON.stringify(payload),
  });

  const responseText = await response.text().catch(() => "");

  return NextResponse.json(
    {
      ok: response.ok,
      submittedCount: payload.urlList.length,
      payload,
      responseText: responseText || null,
    },
    { status: response.ok ? 200 : response.status || 400 },
  );
}
