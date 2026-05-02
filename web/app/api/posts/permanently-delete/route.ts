import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export const runtime = "nodejs";

const GRAPHQL_ENDPOINT =
  process.env.GRAPHQL_ENDPOINT ?? "http://localhost:4000/graphql";

const PERMANENTLY_DELETE_POST_MUTATION = `
  mutation PermanentlyDeletePost($postId: ID!) {
    permanentlyDeletePost(postId: $postId)
  }
`;

export async function POST(req: Request) {
  const cookieStore = await cookies();
  const token = cookieStore.get("mc_session")?.value;
  if (!token) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const postId = typeof body?.postId === "string" ? body.postId.trim() : "";

  if (!postId) {
    return NextResponse.json({ error: "Post id is required" }, { status: 400 });
  }

  const graphqlResponse = await fetch(GRAPHQL_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      query: PERMANENTLY_DELETE_POST_MUTATION,
      variables: { postId },
    }),
  });

  const graphqlBody = await graphqlResponse.json().catch(() => ({}));

  if (!graphqlResponse.ok || graphqlBody?.errors?.length) {
    return NextResponse.json(
      {
        error:
          graphqlBody?.errors?.[0]?.message ?? "Failed to permanently delete post",
      },
      { status: 400 },
    );
  }

  return NextResponse.json({
    ok: Boolean(graphqlBody?.data?.permanentlyDeletePost),
  });
}
