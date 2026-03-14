import { NextResponse } from "next/server";
import { cookies } from "next/headers";

const GRAPHQL_ENDPOINT =
  process.env.GRAPHQL_ENDPOINT ?? "http://localhost:4000/graphql";

const USER_BY_USERNAME_QUERY = `
  query UserByUsername($username: String!) {
    userByUsername(username: $username) {
      id
      username
      displayName
      profilePicture
      followersCount
      followingCount
      subscriptionPlan
      institution
      program
      createdAt
    }
  }
`;

type RouteContext = {
  params: Promise<{
    username: string;
  }>;
};

export async function GET(_: Request, context: RouteContext) {
  const { username } = await context.params;
  const normalizedUsername = decodeURIComponent(username || "").trim();

  if (!normalizedUsername) {
    return NextResponse.json({ error: "Username is required" }, { status: 400 });
  }

  const cookieStore = await cookies();
  const token = cookieStore.get("mc_session")?.value;

  const graphqlResponse = await fetch(GRAPHQL_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({
      query: USER_BY_USERNAME_QUERY,
      variables: { username: normalizedUsername },
    }),
  });

  const graphqlBody = await graphqlResponse.json().catch(() => ({}));

  if (!graphqlResponse.ok || graphqlBody?.errors?.length) {
    return NextResponse.json(
      {
        error: graphqlBody?.errors?.[0]?.message || "Failed to fetch profile",
      },
      { status: 400 },
    );
  }

  const user = graphqlBody?.data?.userByUsername ?? null;
  if (!user) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  return NextResponse.json({ user });
}
