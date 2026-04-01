import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export const runtime = "nodejs";

const GRAPHQL_ENDPOINT =
  process.env.GRAPHQL_ENDPOINT ?? "http://localhost:4000/graphql";

const SEND_SUPPORT_MESSAGE_MUTATION = `
  mutation SendSupportMessage(
    $topic: String!
    $subject: String!
    $message: String!
  ) {
    sendSupportMessage(
      topic: $topic
      subject: $subject
      message: $message
    ) {
      success
    }
  }
`;

export async function POST(req: Request) {
  const contentType = req.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    return NextResponse.json(
      { error: "application/json required" },
      { status: 400 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { topic, subject, message } = body as Record<string, unknown>;

  if (
    typeof topic !== "string" ||
    typeof subject !== "string" ||
    typeof message !== "string"
  ) {
    return NextResponse.json(
      { error: "topic, subject, and message are required" },
      { status: 400 },
    );
  }

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
      query: SEND_SUPPORT_MESSAGE_MUTATION,
      variables: { topic, subject, message },
    }),
  });

  const graphqlBody = await graphqlResponse.json().catch(() => ({}));

  if (!graphqlResponse.ok || graphqlBody?.errors?.length) {
    return NextResponse.json(
      {
        error: graphqlBody?.errors?.[0]?.message || "Failed to send message.",
      },
      { status: graphqlResponse.ok ? 400 : graphqlResponse.status },
    );
  }

  return NextResponse.json({ success: true });
}
