import { NextResponse } from "next/server";
import { cookies } from "next/headers";

const GRAPHQL_ENDPOINT =
  process.env.GRAPHQL_ENDPOINT ?? "http://localhost:4000/graphql";

const TOGGLE_COMMENT_LIKE_MUTATION = `
  mutation ToggleCommentLike($commentId: ID!) {
    toggleCommentLike(commentId: $commentId) {
      id
      likeCount
      viewerHasLiked
    }
  }
`;

type LikeBody = {
  commentId?: string;
};

export async function POST(req: Request) {
  const cookieStore = await cookies();
  const token = cookieStore.get("mc_session")?.value;
  if (!token) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  let body: LikeBody;
  try {
    body = (await req.json()) as LikeBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const commentId = body.commentId?.trim();
  if (!commentId) {
    return NextResponse.json({ error: "commentId is required" }, { status: 400 });
  }

  const graphqlResponse = await fetch(GRAPHQL_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      query: TOGGLE_COMMENT_LIKE_MUTATION,
      variables: { commentId },
    }),
  });

  const graphqlBody = await graphqlResponse.json().catch(() => ({}));
  if (!graphqlResponse.ok || graphqlBody?.errors?.length) {
    return NextResponse.json(
      {
        error: graphqlBody?.errors?.[0]?.message || "Failed to toggle comment like",
        details: graphqlBody?.errors ?? null,
      },
      { status: 400 },
    );
  }

  return NextResponse.json({
    ok: true,
    comment: graphqlBody?.data?.toggleCommentLike ?? null,
  });
}
