import { NextResponse } from "next/server";

const GRAPHQL_ENDPOINT =
  process.env.GRAPHQL_ENDPOINT ?? "http://localhost:4000/graphql";

const EMAIL_AVAILABLE_QUERY = `
  query EmailAvailable($email: String!) {
    emailAvailable(email: $email)
  }
`;

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const email = searchParams.get("email")?.trim() ?? "";

  if (!email) {
    return NextResponse.json(
      { error: "email query parameter is required" },
      { status: 400 },
    );
  }

  try {
    const graphqlResponse = await fetch(GRAPHQL_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: EMAIL_AVAILABLE_QUERY,
        variables: { email },
      }),
    });

    const graphqlBody = await graphqlResponse.json().catch(() => ({}));

    if (!graphqlResponse.ok || graphqlBody?.errors?.length) {
      return NextResponse.json(
        {
          error:
            graphqlBody?.errors?.[0]?.message ||
            `Email check failed (upstream status ${graphqlResponse.status})`,
          details: graphqlBody?.errors ?? null,
        },
        { status: 502 },
      );
    }

    return NextResponse.json({
      available: Boolean(graphqlBody?.data?.emailAvailable),
    });
  } catch {
    return NextResponse.json(
      {
        error: "Email check failed because the GraphQL service is unreachable.",
      },
      { status: 503 },
    );
  }
}
