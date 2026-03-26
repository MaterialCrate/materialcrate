import { NextResponse } from "next/server";
import { cookies } from "next/headers";

const GRAPHQL_ENDPOINT =
  process.env.GRAPHQL_ENDPOINT ?? "http://localhost:4000/graphql";

const RESEND_PENDING_EMAIL_CHANGE_MUTATION = `
  mutation ResendPendingEmailChange {
    resendPendingEmailChange
  }
`;

export async function POST() {
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
      query: RESEND_PENDING_EMAIL_CHANGE_MUTATION,
    }),
  });

  const graphqlBody = await graphqlResponse.json().catch(() => ({}));

  if (!graphqlResponse.ok || graphqlBody?.errors?.length) {
    return NextResponse.json(
      {
        error:
          graphqlBody?.errors?.[0]?.message ||
          "Failed to resend verification code",
        details: graphqlBody?.errors ?? null,
        status: graphqlResponse.status,
      },
      { status: 400 },
    );
  }

  return NextResponse.json({ ok: true });
}
