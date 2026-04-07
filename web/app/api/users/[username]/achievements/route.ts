import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

const GRAPHQL_ENDPOINT =
  process.env.GRAPHQL_ENDPOINT ?? "http://localhost:4000/graphql";

const USER_ACHIEVEMENTS_QUERY = `
  query UserAchievements($username: String!) {
    userAchievements(username: $username) {
      id
      title
      description
      icon
      rarity
      unlockedAt
      holderPercentage
    }
  }
`;

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ username: string }> },
) {
  const { username } = await params;
  const normalizedUsername = username?.trim();

  if (!normalizedUsername) {
    return NextResponse.json({ error: "username is required" }, { status: 400 });
  }

  const cookieStore = await cookies();
  const token = cookieStore.get("mc_session")?.value ?? null;

  const graphqlResponse = await fetch(GRAPHQL_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({
      query: USER_ACHIEVEMENTS_QUERY,
      variables: { username: normalizedUsername },
    }),
  });

  const graphqlBody = await graphqlResponse.json().catch(() => ({}));

  if (!graphqlResponse.ok || graphqlBody?.errors?.length) {
    return NextResponse.json(
      { error: graphqlBody?.errors?.[0]?.message || "Failed to fetch achievements" },
      { status: 400 },
    );
  }

  const achievements = Array.isArray(graphqlBody?.data?.userAchievements)
    ? graphqlBody.data.userAchievements
    : [];

  return NextResponse.json({ achievements });
}
