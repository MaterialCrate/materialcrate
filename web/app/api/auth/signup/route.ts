import { NextResponse } from "next/server";

const GRAPHQL_ENDPOINT =
  process.env.GRAPHQL_ENDPOINT ?? "http://localhost:4000/graphql";

const SIGNUP_MUTATION = `
  mutation Signup(
    $email: String!
    $password: String!
    $username: String!
    $fullName: String!
    $institution: String
    $program: String
  ) {
    signup(
      email: $email
      password: $password
      username: $username
      fullName: $fullName
      institution: $institution
      program: $program
    ) {
      token
      user {
        id
        email
        username
        fullName
        institution
        program
      }
    }
  }
`;

type SignupBody = {
  email?: string;
  password?: string;
  username?: string;
  fullName?: string;
  institution?: string;
  program?: string;
};

export async function POST(req: Request) {
  let body: SignupBody;

  try {
    body = (await req.json()) as SignupBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { email, password, username, fullName, institution, program } = body;

  if (!email || !password || !username || !fullName) {
    return NextResponse.json(
      { error: "Email, password, username, and full name are required" },
      { status: 400 },
    );
  }

  const graphqlResponse = await fetch(GRAPHQL_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      query: SIGNUP_MUTATION,
      variables: { email, password, username, fullName, institution, program },
    }),
  });

  const graphqlBody = await graphqlResponse.json().catch(() => ({}));

  if (!graphqlResponse.ok || graphqlBody?.errors?.length) {
    return NextResponse.json(
      {
        error:
          graphqlBody?.errors?.[0]?.message || "Signup failed",
        details: graphqlBody?.errors ?? null,
        status: graphqlResponse.status,
      },
      { status: 400 },
    );
  }

  const token = graphqlBody?.data?.signup?.token as string | undefined;
  const user = graphqlBody?.data?.signup?.user;

  if (!token) {
    return NextResponse.json(
      { error: "Signup failed to return token" },
      { status: 502 },
    );
  }

  const response = NextResponse.json({ ok: true, user });
  response.cookies.set("mc_session", token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });

  return response;
}
