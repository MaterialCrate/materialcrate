import { NextResponse } from "next/server";
import { auth0 } from "@/app/lib/auth0";

type CompleteProfileBody = {
  username?: string;
  institution?: string;
  program?: string;
  email?: string;
};

const GRAPHQL_ENDPOINT =
  process.env.GRAPHQL_ENDPOINT ?? "http://localhost:4000/graphql";

const COMPLETE_PROFILE_MUTATION = `
  mutation CompleteProfile($username: String, $institution: String, $program: String) {
    completeProfile(username: $username, institution: $institution, program: $program) {
      _id
      email
      username
      institution
      program
    }
  }
`;

export async function POST(req: Request) {
  let body: CompleteProfileBody;

  try {
    body = (await req.json()) as CompleteProfileBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  let accessToken: string;
  try {
    const tokenResponse = await auth0.getAccessToken();
    accessToken = tokenResponse.token;
    console.log("Auth0 access token:", accessToken);
  } catch {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const graphqlResponse = await fetch(GRAPHQL_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      query: COMPLETE_PROFILE_MUTATION,
      variables: {
        username: body.username,
        institution: body.institution,
        program: body.program,
      },
    }),
  });

  const graphqlBody = await graphqlResponse.json().catch(() => ({}));

  if (!graphqlResponse.ok || graphqlBody?.errors?.length) {
    return NextResponse.json(
      {
        error:
          graphqlBody?.errors?.[0]?.message || "GraphQL completeProfile failed",
      },
      { status: 502 },
    );
  }

  return NextResponse.json({
    ok: true,
    user: graphqlBody.data?.completeProfile,
  });
}
