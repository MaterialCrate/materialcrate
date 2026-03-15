import { NextResponse } from "next/server";
import { cookies } from "next/headers";

const GRAPHQL_ENDPOINT =
  process.env.GRAPHQL_ENDPOINT ?? "http://localhost:4000/graphql";

const FOLLOW_USER_MUTATION = `
  mutation FollowUser($username: String!) {
    followUser(username: $username)
  }
`;

const UNFOLLOW_USER_MUTATION = `
  mutation UnfollowUser($username: String!) {
    unfollowUser(username: $username)
  }
`;

type RouteContext = {
  params: Promise<{
    username: string;
  }>;
};

async function mutateFollow(username: string, query: string) {
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
    body: JSON.stringify({
      query,
      variables: { username },
    }),
  });

  const graphqlBody = await graphqlResponse.json().catch(() => ({}));

  if (!graphqlResponse.ok || graphqlBody?.errors?.length) {
    return NextResponse.json(
      {
        error: graphqlBody?.errors?.[0]?.message || "Failed to update follow state",
      },
      { status: 400 },
    );
  }

  return NextResponse.json({ ok: true });
}

export async function POST(_: Request, context: RouteContext) {
  const { username } = await context.params;
  const normalizedUsername = decodeURIComponent(username || "").trim();

  if (!normalizedUsername) {
    return NextResponse.json({ error: "Username is required" }, { status: 400 });
  }

  return mutateFollow(normalizedUsername, FOLLOW_USER_MUTATION);
}

export async function DELETE(_: Request, context: RouteContext) {
  const { username } = await context.params;
  const normalizedUsername = decodeURIComponent(username || "").trim();

  if (!normalizedUsername) {
    return NextResponse.json({ error: "Username is required" }, { status: 400 });
  }

  return mutateFollow(normalizedUsername, UNFOLLOW_USER_MUTATION);
}
