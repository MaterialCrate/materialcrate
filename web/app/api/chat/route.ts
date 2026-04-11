import { NextResponse } from "next/server";
import { cookies } from "next/headers";

const GRAPHQL_ENDPOINT =
  process.env.GRAPHQL_ENDPOINT ?? "http://localhost:4000/graphql";

const CONVERSATIONS_QUERY = `
  query Conversations {
    conversations {
      id
      participant {
        id
        name
        username
        avatar
        isOnline
      }
      lastMessage
      lastMessageTime
      lastMessageSentByMe
      lastMessageIsRead
      unreadCount
      updatedAt
    }
  }
`;

const START_CONVERSATION_MUTATION = `
  mutation StartConversation($userId: ID!) {
    startConversation(userId: $userId) {
      id
      participant {
        id
        name
        username
        avatar
        isOnline
      }
      lastMessage
      lastMessageTime
      lastMessageSentByMe
      lastMessageIsRead
      unreadCount
      updatedAt
    }
  }
`;

const getAuthToken = async () => {
  const cookieStore = await cookies();
  return cookieStore.get("mc_session")?.value ?? null;
};

const runGraphQL = async ({
  query,
  variables,
  token,
}: {
  query: string;
  variables?: Record<string, unknown>;
  token: string;
}) => {
  const res = await fetch(GRAPHQL_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ query, variables }),
  });
  const body = await res.json().catch(() => ({}));
  return { res, body };
};

export async function GET() {
  const token = await getAuthToken();
  if (!token) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { res, body } = await runGraphQL({
    query: CONVERSATIONS_QUERY,
    token,
  });

  if (!res.ok || body?.errors?.length) {
    return NextResponse.json(
      { error: body?.errors?.[0]?.message || "Failed to fetch conversations" },
      { status: 400 },
    );
  }

  return NextResponse.json({
    conversations: body?.data?.conversations ?? [],
  });
}

export async function POST(request: Request) {
  const token = await getAuthToken();
  if (!token) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  let body: { userId?: string };
  try {
    body = (await request.json()) as { userId?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const userId = body.userId?.trim();
  if (!userId) {
    return NextResponse.json({ error: "userId is required" }, { status: 400 });
  }

  const { res, body: gqlBody } = await runGraphQL({
    query: START_CONVERSATION_MUTATION,
    variables: { userId },
    token,
  });

  if (!res.ok || gqlBody?.errors?.length) {
    return NextResponse.json(
      {
        error:
          gqlBody?.errors?.[0]?.message || "Failed to start conversation",
      },
      { status: 400 },
    );
  }

  return NextResponse.json({
    conversation: gqlBody?.data?.startConversation ?? null,
  });
}
