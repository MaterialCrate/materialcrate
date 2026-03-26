import { NextResponse } from "next/server";
import { cookies } from "next/headers";

const GRAPHQL_ENDPOINT =
  process.env.GRAPHQL_ENDPOINT ?? "http://localhost:4000/graphql";

const REQUEST_EMAIL_CHANGE_MUTATION = `
  mutation RequestEmailChange($newEmail: String!) {
    requestEmailChange(newEmail: $newEmail)
  }
`;

type RequestEmailChangeBody = {
  email?: string;
};

const getErrorStatus = (message: string, fallbackStatus?: number) => {
  if (message === "Not authenticated") {
    return 401;
  }

  if (message === "User not found") {
    return 404;
  }

  if (
    message === "Email is required" ||
    message === "Enter a different email address"
  ) {
    return 400;
  }

  if (message === "Email already in use") {
    return 409;
  }

  if (fallbackStatus && fallbackStatus >= 400) {
    return fallbackStatus >= 500 ? fallbackStatus : 400;
  }

  return 500;
};

export async function POST(req: Request) {
  let body: RequestEmailChangeBody;

  try {
    body = (await req.json()) as RequestEmailChangeBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const nextEmail = body.email?.trim().toLowerCase();

  if (!nextEmail) {
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
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
      query: REQUEST_EMAIL_CHANGE_MUTATION,
      variables: { newEmail: nextEmail },
    }),
  });

  const graphqlBody = await graphqlResponse.json().catch(() => ({}));

  if (!graphqlResponse.ok || graphqlBody?.errors?.length) {
    const errorMessage =
      graphqlBody?.errors?.[0]?.message || "Failed to start email change";

    console.error("[email-change/request] GraphQL request failed", {
      nextEmail,
      graphqlStatus: graphqlResponse.status,
      graphqlErrors: graphqlBody?.errors ?? null,
      graphqlBody,
    });

    return NextResponse.json(
      {
        error: errorMessage,
        details: graphqlBody?.errors ?? null,
        status: graphqlResponse.status,
      },
      { status: getErrorStatus(errorMessage, graphqlResponse.status) },
    );
  }

  console.info("[email-change/request] Request started", {
    nextEmail,
    graphqlStatus: graphqlResponse.status,
  });

  return NextResponse.json({ ok: true, pendingEmail: nextEmail });
}
