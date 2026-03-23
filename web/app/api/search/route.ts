import { NextResponse } from "next/server";
import { cookies } from "next/headers";

const GRAPHQL_ENDPOINT =
  process.env.GRAPHQL_ENDPOINT ?? "http://localhost:4000/graphql";

const SEARCH_QUERY = `
  query Search($query: String!, $limit: Int!) {
    searchUsers(query: $query, limit: $limit) {
      id
      username
      displayName
      profilePicture
      followersCount
      followingCount
      subscriptionPlan
      institution
      program
    }
    searchPosts(query: $query, limit: $limit) {
      id
      fileUrl
      thumbnailUrl
      title
      courseCode
      description
      year
      likeCount
      commentCount
      viewerHasLiked
      createdAt
      author {
        id
        displayName
        username
        profilePicture
        subscriptionPlan
      }
    }
  }
`;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q")?.trim() ?? "";
  const limitInput = Number.parseInt(searchParams.get("limit") || "", 10);
  const limit = Number.isFinite(limitInput)
    ? Math.max(1, Math.min(limitInput, 25))
    : 12;

  if (!query) {
    return NextResponse.json({ users: [], documents: [] });
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
      query: SEARCH_QUERY,
      variables: {
        query,
        limit,
      },
    }),
  });

  const graphqlBody = await graphqlResponse.json().catch(() => ({}));

  if (!graphqlResponse.ok || graphqlBody?.errors?.length) {
    return NextResponse.json(
      {
        error: graphqlBody?.errors?.[0]?.message || "Failed to search",
      },
      { status: 400 },
    );
  }

  return NextResponse.json({
    users: graphqlBody?.data?.searchUsers ?? [],
    documents: graphqlBody?.data?.searchPosts ?? [],
  });
}
