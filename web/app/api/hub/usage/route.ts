import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export const runtime = "nodejs";

const GRAPHQL_ENDPOINT =
  process.env.GRAPHQL_ENDPOINT ?? "http://localhost:4000/graphql";

const MY_AI_USAGE_QUERY = `
  query MyAiUsage {
    myAiUsage {
      dailyTokensUsed
      monthlyTokensUsed
      dailyTokenLimit
      monthlyTokenLimit
      dailyResetsAt
      monthlyResetsAt
      plan
    }
  }
`;

export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get("mc_session")?.value;

  if (!token) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const response = await fetch(GRAPHQL_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    cache: "no-store",
    body: JSON.stringify({ query: MY_AI_USAGE_QUERY }),
  });

  const body = await response.json().catch(() => ({}));

  if (!response.ok || body?.errors?.length) {
    return NextResponse.json(
      { error: body?.errors?.[0]?.message || "Failed to fetch AI usage" },
      { status: 502 },
    );
  }

  return NextResponse.json({ usage: body?.data?.myAiUsage ?? null });
}
