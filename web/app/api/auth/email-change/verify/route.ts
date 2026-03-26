import { NextResponse } from "next/server";
import { cookies } from "next/headers";

const GRAPHQL_ENDPOINT =
  process.env.GRAPHQL_ENDPOINT ?? "http://localhost:4000/graphql";

const VERIFY_PENDING_EMAIL_CHANGE_MUTATION = `
  mutation VerifyPendingEmailChange($code: String!) {
    verifyPendingEmailChange(code: $code) {
      id
      email
      pendingEmail
      emailVerified
      username
      displayName
      institution
      program
    }
  }
`;

type VerifyPendingEmailChangeBody = {
  code?: string;
};

export async function POST(req: Request) {
  let body: VerifyPendingEmailChangeBody;

  try {
    body = (await req.json()) as VerifyPendingEmailChangeBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const code = body.code?.trim();
  if (!code) {
    return NextResponse.json(
      { error: "Verification code is required" },
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
      query: VERIFY_PENDING_EMAIL_CHANGE_MUTATION,
      variables: { code },
    }),
  });

  const graphqlBody = await graphqlResponse.json().catch(() => ({}));

  if (!graphqlResponse.ok || graphqlBody?.errors?.length) {
    return NextResponse.json(
      {
        error:
          graphqlBody?.errors?.[0]?.message ||
          "Failed to verify pending email change",
        details: graphqlBody?.errors ?? null,
        status: graphqlResponse.status,
      },
      { status: 400 },
    );
  }

  return NextResponse.json({
    ok: true,
    user: graphqlBody?.data?.verifyPendingEmailChange ?? null,
  });
}
