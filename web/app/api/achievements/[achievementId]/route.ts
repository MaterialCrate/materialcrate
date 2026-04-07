import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

const GRAPHQL_ENDPOINT =
  process.env.GRAPHQL_ENDPOINT ?? "http://localhost:4000/graphql";

const ACHIEVEMENT_QUERY = `
  query Achievement($id: String!) {
    achievement(id: $id) {
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
  { params }: { params: Promise<{ achievementId: string }> },
) {
  const { achievementId } = await params;
  const normalizedId = achievementId?.trim();

  if (!normalizedId) {
    return NextResponse.json({ error: "achievementId is required" }, { status: 400 });
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
      query: ACHIEVEMENT_QUERY,
      variables: { id: normalizedId },
    }),
  });

  const graphqlBody = await graphqlResponse.json().catch(() => ({}));

  if (!graphqlResponse.ok || graphqlBody?.errors?.length) {
    return NextResponse.json(
      { error: graphqlBody?.errors?.[0]?.message || "Failed to fetch achievement" },
      { status: 400 },
    );
  }

  const achievement = graphqlBody?.data?.achievement ?? null;
  if (!achievement) {
    return NextResponse.json({ error: "Achievement not found" }, { status: 404 });
  }

  return NextResponse.json({ achievement });
}
