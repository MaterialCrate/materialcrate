import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

const GRAPHQL_ENDPOINT =
  process.env.GRAPHQL_ENDPOINT ?? "http://localhost:4000/graphql";

const COMMENTS_QUERY = `
  query Comments($postId: ID!, $parentCommentId: ID, $limit: Int!, $offset: Int!) {
    comments(
      postId: $postId
      parentCommentId: $parentCommentId
      limit: $limit
      offset: $offset
    ) {
      id
      postId
      parentId
      content
      replyCount
      likeCount
      viewerHasLiked
      createdAt
      author {
        id
        firstName
        surname
        username
      }
    }
  }
`;

const CREATE_COMMENT_MUTATION = `
  mutation CreateComment($postId: ID!, $content: String!, $parentCommentId: ID) {
    createComment(postId: $postId, content: $content, parentCommentId: $parentCommentId) {
      id
      postId
      parentId
      content
      replyCount
      likeCount
      viewerHasLiked
      createdAt
      author {
        id
        firstName
        surname
        username
      }
    }
  }
`;

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const postId = searchParams.get("postId")?.trim();
  const parentCommentId = searchParams.get("parentCommentId")?.trim() || null;
  const limitInput = Number.parseInt(searchParams.get("limit") || "", 10);
  const offsetInput = Number.parseInt(searchParams.get("offset") || "", 10);
  const limit = Number.isFinite(limitInput)
    ? Math.min(Math.max(limitInput, 1), MAX_LIMIT)
    : DEFAULT_LIMIT;
  const offset = Number.isFinite(offsetInput) ? Math.max(offsetInput, 0) : 0;

  if (!postId) {
    return NextResponse.json({ error: "postId is required" }, { status: 400 });
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
      query: COMMENTS_QUERY,
      variables: { postId, parentCommentId, limit, offset },
    }),
  });

  const graphqlBody = await graphqlResponse.json().catch(() => ({}));
  if (!graphqlResponse.ok || graphqlBody?.errors?.length) {
    return NextResponse.json(
      {
        error: graphqlBody?.errors?.[0]?.message || "Failed to fetch comments",
        details: graphqlBody?.errors ?? null,
      },
      { status: 400 },
    );
  }

  return NextResponse.json({ comments: graphqlBody?.data?.comments ?? [] });
}

type CreateCommentBody = {
  postId?: string;
  content?: string;
  parentCommentId?: string | null;
};

export async function POST(req: Request) {
  const cookieStore = await cookies();
  const token = cookieStore.get("mc_session")?.value;
  if (!token) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  let body: CreateCommentBody;
  try {
    body = (await req.json()) as CreateCommentBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const postId = body.postId?.trim();
  const content = body.content?.trim();
  const parentCommentId = body.parentCommentId?.trim() || null;

  if (!postId) {
    return NextResponse.json({ error: "postId is required" }, { status: 400 });
  }
  if (!content) {
    return NextResponse.json({ error: "content is required" }, { status: 400 });
  }

  const graphqlResponse = await fetch(GRAPHQL_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      query: CREATE_COMMENT_MUTATION,
      variables: { postId, content, parentCommentId },
    }),
  });

  const graphqlBody = await graphqlResponse.json().catch(() => ({}));
  if (!graphqlResponse.ok || graphqlBody?.errors?.length) {
    return NextResponse.json(
      {
        error: graphqlBody?.errors?.[0]?.message || "Failed to create comment",
        details: graphqlBody?.errors ?? null,
      },
      { status: 400 },
    );
  }

  return NextResponse.json({
    ok: true,
    comment: graphqlBody?.data?.createComment ?? null,
  });
}
