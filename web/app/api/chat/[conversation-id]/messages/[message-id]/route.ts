import { NextResponse } from "next/server";
import { cookies } from "next/headers";

const GRAPHQL_ENDPOINT =
  process.env.GRAPHQL_ENDPOINT ?? "http://localhost:4000/graphql";

const UNSEND_MESSAGE_MUTATION = `
  mutation UnsendMessage($messageId: ID!) {
    unsendMessage(messageId: $messageId)
  }
`;

const getAuthToken = async () => {
  const cookieStore = await cookies();
  return cookieStore.get("mc_session")?.value ?? null;
};

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ "conversation-id": string; "message-id": string }> },
) {
  const token = await getAuthToken();
  if (!token) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { "message-id": messageId } = await params;

  const res = await fetch(GRAPHQL_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      query: UNSEND_MESSAGE_MUTATION,
      variables: { messageId },
    }),
  });
  const body = await res.json().catch(() => ({}));

  if (!res.ok || body?.errors?.length) {
    return NextResponse.json(
      { error: body?.errors?.[0]?.message || "Failed to unsend message" },
      { status: 400 },
    );
  }

  return NextResponse.json({ ok: true });
}
