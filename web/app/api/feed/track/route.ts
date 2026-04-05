import { NextResponse } from "next/server";
import { cookies } from "next/headers";

const GRAPHQL_ENDPOINT =
  process.env.GRAPHQL_ENDPOINT ?? "http://localhost:4000/graphql";

const TRACK_FEED_INTERACTION_MUTATION = `
  mutation TrackFeedInteraction($input: FeedInteractionInput!) {
    trackFeedInteraction(input: $input)
  }
`;

type RequestBody = {
  postId?: string | null;
  interactionType?: string;
  signalKind?: string | null;
  category?: string | null;
  searchTerm?: string | null;
  durationMs?: number | null;
  metadata?: string | null;
};

export async function POST(request: Request) {
  const cookieStore = await cookies();
  const token = cookieStore.get("mc_session")?.value;

  if (!token) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  let body: RequestBody;
  try {
    body = (await request.json()) as RequestBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const interactionType = body?.interactionType?.trim();
  if (!interactionType) {
    return NextResponse.json(
      { error: "Interaction type is required" },
      { status: 400 },
    );
  }

  const graphqlResponse = await fetch(GRAPHQL_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    cache: "no-store",
    body: JSON.stringify({
      query: TRACK_FEED_INTERACTION_MUTATION,
      variables: {
        input: {
          postId: body.postId?.trim() || null,
          interactionType,
          signalKind: body.signalKind?.trim() || null,
          category: body.category?.trim() || null,
          searchTerm: body.searchTerm?.trim() || null,
          durationMs:
            typeof body.durationMs === "number" &&
            Number.isFinite(body.durationMs)
              ? body.durationMs
              : null,
          metadata: body.metadata?.trim() || null,
        },
      },
    }),
  });

  const graphqlBody = await graphqlResponse.json().catch(() => ({}));

  if (!graphqlResponse.ok || graphqlBody?.errors?.length) {
    return NextResponse.json(
      {
        error:
          graphqlBody?.errors?.[0]?.message ||
          "Failed to track feed interaction",
      },
      { status: 400 },
    );
  }

  return NextResponse.json({
    ok: Boolean(graphqlBody?.data?.trackFeedInteraction),
  });
}
