import { NextResponse } from "next/server";

const GRAPHQL_ENDPOINT =
  process.env.GRAPHQL_ENDPOINT ?? "http://localhost:4000/graphql";

const USERNAME_AVAILABLE_QUERY = `
  query UsernameAvailable($username: String!) {
    usernameAvailable(username: $username)
  }
`;

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const username = searchParams.get("username")?.trim() ?? "";

  if (!username) {
    return NextResponse.json(
      { error: "username query parameter is required" },
      { status: 400 },
    );
  }

  try {
    const graphqlResponse = await fetch(GRAPHQL_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: USERNAME_AVAILABLE_QUERY,
        variables: { username },
      }),
    });

    const graphqlBody = await graphqlResponse.json().catch(() => ({}));

    if (!graphqlResponse.ok || graphqlBody?.errors?.length) {
      return NextResponse.json(
        {
          error:
            graphqlBody?.errors?.[0]?.message ||
            `Username check failed (upstream status ${graphqlResponse.status})`,
          details: graphqlBody?.errors ?? null,
        },
        { status: 502 },
      );
    }

    return NextResponse.json({
      available: Boolean(graphqlBody?.data?.usernameAvailable),
    });
  } catch {
    return NextResponse.json(
      {
        error:
          "Username check failed because the GraphQL service is unreachable.",
      },
      { status: 503 },
    );
  }
}
