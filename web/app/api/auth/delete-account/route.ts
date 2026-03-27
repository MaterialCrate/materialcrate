import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  RESTORE_SESSION_COOKIE_NAME,
  SESSION_COOKIE_NAME,
  SESSION_COOKIE_OPTIONS,
} from "../cookies";

const GRAPHQL_ENDPOINT =
  process.env.GRAPHQL_ENDPOINT ?? "http://localhost:4000/graphql";
const ACCOUNT_RESTORE_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;

const DELETE_ACCOUNT_MUTATION = `
  mutation DeleteMyAccount {
    deleteMyAccount
  }
`;

export async function POST() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const graphqlResponse = await fetch(GRAPHQL_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ query: DELETE_ACCOUNT_MUTATION }),
  });

  const graphqlBody = await graphqlResponse.json().catch(() => ({}));

  if (!graphqlResponse.ok || graphqlBody?.errors?.length) {
    return NextResponse.json(
      {
        error: graphqlBody?.errors?.[0]?.message || "Failed to delete account",
      },
      { status: 400 },
    );
  }

  const response = NextResponse.json({
    ok: true,
    restoreDeadline: new Date(
      Date.now() + ACCOUNT_RESTORE_WINDOW_MS,
    ).toISOString(),
  });
  response.cookies.set(SESSION_COOKIE_NAME, "", {
    ...SESSION_COOKIE_OPTIONS,
    maxAge: 0,
  });
  response.cookies.set(RESTORE_SESSION_COOKIE_NAME, "", {
    ...SESSION_COOKIE_OPTIONS,
    maxAge: 0,
  });
  return response;
}
