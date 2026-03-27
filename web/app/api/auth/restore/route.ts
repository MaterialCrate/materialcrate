import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  RESTORE_SESSION_COOKIE_NAME,
  SESSION_COOKIE_NAME,
  SESSION_COOKIE_OPTIONS,
  SESSION_MAX_AGE_SECONDS,
} from "../cookies";

const GRAPHQL_ENDPOINT =
  process.env.GRAPHQL_ENDPOINT ?? "http://localhost:4000/graphql";

const RESTORE_ACCOUNT_MUTATION = `
  mutation RestoreDeletedAccount {
    restoreDeletedAccount {
      id
      email
      username
      displayName
      institution
      program
      linkedSEOs
    }
  }
`;

export async function POST() {
  const cookieStore = await cookies();
  const restoreToken = cookieStore.get(RESTORE_SESSION_COOKIE_NAME)?.value;
  if (!restoreToken) {
    return NextResponse.json(
      { error: "Restore session expired" },
      { status: 401 },
    );
  }

  const graphqlResponse = await fetch(GRAPHQL_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${restoreToken}`,
    },
    body: JSON.stringify({ query: RESTORE_ACCOUNT_MUTATION }),
  });

  const graphqlBody = await graphqlResponse.json().catch(() => ({}));

  if (!graphqlResponse.ok || graphqlBody?.errors?.length) {
    return NextResponse.json(
      {
        error: graphqlBody?.errors?.[0]?.message || "Failed to restore account",
      },
      { status: 400 },
    );
  }

  const response = NextResponse.json({
    ok: true,
    user: graphqlBody?.data?.restoreDeletedAccount ?? null,
  });
  response.cookies.set(SESSION_COOKIE_NAME, restoreToken, {
    ...SESSION_COOKIE_OPTIONS,
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
  response.cookies.set(RESTORE_SESSION_COOKIE_NAME, "", {
    ...SESSION_COOKIE_OPTIONS,
    maxAge: 0,
  });
  return response;
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(RESTORE_SESSION_COOKIE_NAME, "", {
    ...SESSION_COOKIE_OPTIONS,
    maxAge: 0,
  });
  return response;
}
