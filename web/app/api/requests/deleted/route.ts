import { NextResponse } from "next/server";
import { cookies } from "next/headers";

const GRAPHQL_ENDPOINT =
  process.env.GRAPHQL_ENDPOINT ?? "http://localhost:4000/graphql";

const DELETED_QUERY = `
  query RecentlyDeletedRequests($limit: Int, $offset: Int) {
    recentlyDeletedRequests(limit: $limit, offset: $offset) {
      id
      title
      description
      categories
      bounty
      deletedAt
    }
  }
`;

export async function GET(req: Request) {
  const cookieStore = await cookies();
  const token = cookieStore.get("mc_session")?.value;
  if (!token) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "50", 10), 100);
  const offset = Math.max(parseInt(searchParams.get("offset") ?? "0", 10), 0);

  const res = await fetch(GRAPHQL_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ query: DELETED_QUERY, variables: { limit, offset } }),
  });

  const body = await res.json().catch(() => ({}));
  if (!res.ok || body?.errors?.length) {
    return NextResponse.json(
      { error: body?.errors?.[0]?.message || "Failed to fetch deleted requests" },
      { status: 400 },
    );
  }

  return NextResponse.json({ requests: body?.data?.recentlyDeletedRequests ?? [] });
}
