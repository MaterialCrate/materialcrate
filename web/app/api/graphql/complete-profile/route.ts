import { NextResponse } from "next/server";
import { cookies } from "next/headers";

type CompleteProfileBody = {
  username?: string;
  firstName?: string;
  surname?: string;
  institution?: string;
  program?: string;
  profilePicture?: string | null;
  email?: string;
};

const GRAPHQL_ENDPOINT =
  process.env.GRAPHQL_ENDPOINT ?? "http://localhost:4000/graphql";

const COMPLETE_PROFILE_MUTATION = `
  mutation CompleteProfile(
    $username: String!
    $firstName: String!
    $surname: String!
    $institution: String!
    $program: String
    $profilePicture: String
  ) {
    completeProfile(
      username: $username
      firstName: $firstName
      surname: $surname
      institution: $institution
      program: $program
      profilePicture: $profilePicture
    ) {
      email
      username
      firstName
      surname
      institution
      program
      profilePicture
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

  if (!body.username || !body.firstName || !body.surname || !body.institution) {
    return NextResponse.json(
      {
        error:
          "Username, first name, surname, and institution are required",
      },
      { status: 400 },
    );
  }

  const cookieStore = await cookies();
  const token = cookieStore.get("mc_session")?.value;
  if (!token) {
    return NextResponse.json(
      { error: "Authentication required to complete profile" },
      { status: 401 },
    );
  }

  const graphqlResponse = await fetch(GRAPHQL_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      query: COMPLETE_PROFILE_MUTATION,
      variables: {
        username: body.username,
        firstName: body.firstName,
        surname: body.surname,
        institution: body.institution,
        program: body.program,
        profilePicture:
          typeof body.profilePicture === "string"
            ? body.profilePicture.trim() || null
            : undefined,
      },
    }),
  });

  const graphqlBody = await graphqlResponse.json().catch(() => ({}));

  if (!graphqlResponse.ok || graphqlBody?.errors?.length) {
    return NextResponse.json(
      {
        error:
          graphqlBody?.errors?.[0]?.message || "GraphQL completeProfile failed",
        details: graphqlBody?.errors ?? null,
        status: graphqlResponse.status,
      },
      { status: 502 },
    );
  }

  return NextResponse.json({
    ok: true,
    user: graphqlBody.data?.completeProfile,
  });
}
