import { NextResponse } from "next/server";
import { cookies } from "next/headers";

const GRAPHQL_ENDPOINT =
  process.env.GRAPHQL_ENDPOINT ?? "http://localhost:4000/graphql";

const GET_CONVERSATION_QUERY = `
  query GetConversation($conversationId: ID!, $limit: Int) {
    conversation(id: $conversationId) {
      id
      participant {
        id
        name
        username
        avatar
        isOnline
      }
    }
    messages(conversationId: $conversationId, limit: $limit) {
      id
      text
      sentByMe
      timestamp
      status
      isUnsent
      editedAt
      attachments {
        id
        type
        url
        fileName
        fileSize
      }
    }
  }
`;

const SEND_MESSAGE_MUTATION = `
  mutation SendMessage($conversationId: ID!, $text: String) {
    sendMessage(conversationId: $conversationId, text: $text) {
      id
      text
      sentByMe
      timestamp
      status
      isUnsent
      editedAt
      attachments {
        id
        type
        url
        fileName
        fileSize
      }
    }
  }
`;

const MARK_READ_MUTATION = `
  mutation MarkRead($conversationId: ID!) {
    markMessagesRead(conversationId: $conversationId)
  }
`;

const DELETE_CONVERSATION_MUTATION = `
  mutation DeleteConversation($conversationId: ID!) {
    deleteConversation(conversationId: $conversationId)
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

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ "conversation-id": string }> },
) {
  const token = await getAuthToken();
  if (!token) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { "conversation-id": conversationId } = await params;

  const { res, body } = await runGraphQL({
    query: GET_CONVERSATION_QUERY,
    variables: { conversationId, limit: 50 },
    token,
  });

  if (!res.ok || body?.errors?.length) {
    return NextResponse.json(
      { error: body?.errors?.[0]?.message || "Failed to load conversation" },
      { status: 400 },
    );
  }

  if (!body?.data?.conversation) {
    return NextResponse.json(
      { error: "Conversation not found" },
      { status: 404 },
    );
  }

  return NextResponse.json({
    participant: body.data.conversation.participant,
    messages: body.data.messages ?? [],
  });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ "conversation-id": string }> },
) {
  const token = await getAuthToken();
  if (!token) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { "conversation-id": conversationId } = await params;

  let reqBody: { text?: string };
  try {
    reqBody = (await request.json()) as { text?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const text = reqBody.text?.trim();
  if (!text) {
    return NextResponse.json({ error: "text is required" }, { status: 400 });
  }

  const { res, body } = await runGraphQL({
    query: SEND_MESSAGE_MUTATION,
    variables: { conversationId, text },
    token,
  });

  if (!res.ok || body?.errors?.length) {
    return NextResponse.json(
      { error: body?.errors?.[0]?.message || "Failed to send message" },
      { status: 400 },
    );
  }

  return NextResponse.json({ message: body?.data?.sendMessage ?? null });
}

export async function PATCH(
  _request: Request,
  { params }: { params: Promise<{ "conversation-id": string }> },
) {
  const token = await getAuthToken();
  if (!token) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { "conversation-id": conversationId } = await params;

  const { res, body } = await runGraphQL({
    query: MARK_READ_MUTATION,
    variables: { conversationId },
    token,
  });

  if (!res.ok || body?.errors?.length) {
    return NextResponse.json(
      { error: body?.errors?.[0]?.message || "Failed to mark as read" },
      { status: 400 },
    );
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ "conversation-id": string }> },
) {
  const token = await getAuthToken();
  if (!token) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { "conversation-id": conversationId } = await params;

  const { res, body } = await runGraphQL({
    query: DELETE_CONVERSATION_MUTATION,
    variables: { conversationId },
    token,
  });

  if (!res.ok || body?.errors?.length) {
    return NextResponse.json(
      { error: body?.errors?.[0]?.message || "Failed to delete conversation" },
      { status: 400 },
    );
  }

  return NextResponse.json({ ok: true });
}
