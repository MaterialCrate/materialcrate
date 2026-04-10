import { NextResponse } from "next/server";
import {
  RESTORE_SESSION_COOKIE_NAME,
  SESSION_COOKIE_NAME,
  SESSION_COOKIE_OPTIONS,
  SESSION_MAX_AGE_SECONDS,
} from "../cookies";

const GRAPHQL_ENDPOINT =
  process.env.GRAPHQL_ENDPOINT ?? "http://localhost:4000/graphql";

const LOGIN_MUTATION = `
  mutation Login($email: String!, $password: String!) {
    login(email: $email, password: $password) {
      token
      restoreRequired
      restoreDeadline
      user {
        id
        email
        username
        displayName
        institution
        program
      }
    }
  }
`;

type LoginBody = {
  email?: string;
  password?: string;
};

export async function POST(req: Request) {
  let body: LoginBody;

  try {
    body = (await req.json()) as LoginBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { email, password } = body;

  if (!email || !password) {
    return NextResponse.json(
      { error: "Email and password are required" },
      { status: 400 },
    );
  }

  const graphqlResponse = await fetch(GRAPHQL_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      query: LOGIN_MUTATION,
      variables: { email, password },
    }),
  });

  const graphqlBody = await graphqlResponse.json().catch(() => ({}));

  if (!graphqlResponse.ok || graphqlBody?.errors?.length) {
    const firstError = graphqlBody?.errors?.[0];

    if (firstError?.extensions?.code === "EMAIL_NOT_VERIFIED") {
      return NextResponse.json(
        {
          verificationRequired: true,
          verificationDeadline: firstError.extensions.verificationDeadline ?? null,
        },
        { status: 403 },
      );
    }

    console.error("[auth/login] GraphQL request failed", {
      email,
      graphqlStatus: graphqlResponse.status,
      graphqlErrors: graphqlBody?.errors ?? null,
    });

    return NextResponse.json(
      {
        error: firstError?.message || "Login failed",
        details: graphqlBody?.errors ?? null,
        status: graphqlResponse.status,
      },
      { status: 401 },
    );
  }

  const token = graphqlBody?.data?.login?.token as string | undefined;
  if (!token) {
    return NextResponse.json({ error: "Login failed" }, { status: 502 });
  }
  const sessionToken = token as string;
  const user = graphqlBody?.data?.login?.user;
  const restoreRequired = Boolean(graphqlBody?.data?.login?.restoreRequired);
  const restoreDeadline =
    typeof graphqlBody?.data?.login?.restoreDeadline === "string"
      ? graphqlBody.data.login.restoreDeadline
      : null;

  if (!token) {
    return NextResponse.json(
      { error: "Login failed to return token" },
      { status: 502 },
    );
  }

  const response = NextResponse.json({
    ok: true,
    user,
    restoreRequired,
    restoreDeadline,
  });
  response.cookies.set(
    restoreRequired ? RESTORE_SESSION_COOKIE_NAME : SESSION_COOKIE_NAME,
    sessionToken,
    {
      ...SESSION_COOKIE_OPTIONS,
      maxAge: SESSION_MAX_AGE_SECONDS,
    },
  );
  if (restoreRequired) {
    response.cookies.set(SESSION_COOKIE_NAME, "", {
      ...SESSION_COOKIE_OPTIONS,
      maxAge: 0,
    });
  } else {
    response.cookies.set(RESTORE_SESSION_COOKIE_NAME, "", {
      ...SESSION_COOKIE_OPTIONS,
      maxAge: 0,
    });
  }

  return response;
}
