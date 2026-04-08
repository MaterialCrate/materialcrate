import { NextResponse } from "next/server";
import { cookies } from "next/headers";

const GRAPHQL_ENDPOINT =
  process.env.GRAPHQL_ENDPOINT ?? "http://localhost:4000/graphql";

const HISTORY_QUERY = `
  query MyTokenHistory($limit: Int, $offset: Int) {
    myTokenTransactions(limit: $limit, offset: $offset) {
      id
      type
      amount
      description
      postId
      createdAt
    }
    myTokenCashoutRequests {
      id
      tokensAmount
      cashAmount
      status
      payoutMethod
      payoutDetails
      adminNote
      createdAt
    }
  }
`;

export async function GET(req: Request) {
  const cookieStore = await cookies();
  const token = cookieStore.get("mc_session")?.value;
  if (!token) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const limit = Math.min(Number(searchParams.get("limit") ?? "20"), 50);
  const offset = Math.max(Number(searchParams.get("offset") ?? "0"), 0);

  const gqlResponse = await fetch(GRAPHQL_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      query: HISTORY_QUERY,
      variables: { limit, offset },
    }),
    cache: "no-store",
  });

  const gqlBody = await gqlResponse.json().catch(() => ({}));

  if (!gqlResponse.ok || gqlBody?.errors?.length) {
    return NextResponse.json(
      { error: gqlBody?.errors?.[0]?.message || "Failed to fetch token history" },
      { status: 400 },
    );
  }

  return NextResponse.json({
    transactions: gqlBody?.data?.myTokenTransactions ?? [],
    cashoutRequests: gqlBody?.data?.myTokenCashoutRequests ?? [],
  });
}
