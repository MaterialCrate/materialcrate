import { NextResponse } from "next/server";
import { cookies } from "next/headers";

const GRAPHQL_ENDPOINT =
  process.env.GRAPHQL_ENDPOINT ?? "http://localhost:4000/graphql";

const POST_QUERY = `
  query PostById($id: ID!) {
    post(id: $id) {
      id
      fileUrl
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

export async function GET(
  _: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const postId = id?.trim();
  if (!postId) {
    return NextResponse.json({ error: "Invalid post id" }, { status: 400 });
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
      query: POST_QUERY,
      variables: { id: postId },
    }),
    cache: "no-store",
  });
  const graphqlBody = await graphqlResponse.json().catch(() => ({}));

  if (!graphqlResponse.ok || graphqlBody?.errors?.length) {
    return NextResponse.json(
      {
        error: graphqlBody?.errors?.[0]?.message || "Failed to fetch post",
      },
      { status: 400 },
    );
  }

  return NextResponse.json({ post: graphqlBody?.data?.post ?? null });
}
