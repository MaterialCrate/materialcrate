import { NextResponse } from "next/server";
import { cookies } from "next/headers";

const GRAPHQL_ENDPOINT =
  process.env.GRAPHQL_ENDPOINT ?? "http://localhost:4000/graphql";

const ACCEPT_FOLLOW_REQUEST_MUTATION = `
  mutation AcceptFollowRequest($requestId: ID!) {
    acceptFollowRequest(requestId: $requestId)
  }
`;

const DECLINE_FOLLOW_REQUEST_MUTATION = `
  mutation DeclineFollowRequest($requestId: ID!) {
    declineFollowRequest(requestId: $requestId)
  }
`;

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

async function mutateFollowRequest(requestId: string, query: string) {
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
      variables: { requestId },
    }),
  });

  const graphqlBody = await graphqlResponse.json().catch(() => ({}));

  if (!graphqlResponse.ok || graphqlBody?.errors?.length) {
    return NextResponse.json(
      {
        error:
          graphqlBody?.errors?.[0]?.message ||
          "Failed to update follow request",
      },
      { status: 400 },
    );
  }

  return NextResponse.json({ ok: true });
}

// POST = accept
export async function POST(_: Request, context: RouteContext) {
  const { id } = await context.params;
  const normalizedId = decodeURIComponent(id || "").trim();

  if (!normalizedId) {
    return NextResponse.json(
      { error: "Request ID is required" },
      { status: 400 },
    );
  }

  return mutateFollowRequest(normalizedId, ACCEPT_FOLLOW_REQUEST_MUTATION);
}

// DELETE = decline
export async function DELETE(_: Request, context: RouteContext) {
  const { id } = await context.params;
  const normalizedId = decodeURIComponent(id || "").trim();

  if (!normalizedId) {
    return NextResponse.json(
      { error: "Request ID is required" },
      { status: 400 },
    );
  }

  return mutateFollowRequest(normalizedId, DECLINE_FOLLOW_REQUEST_MUTATION);
}
