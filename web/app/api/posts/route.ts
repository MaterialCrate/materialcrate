import { NextResponse } from "next/server";
import { cookies } from "next/headers";

const GRAPHQL_ENDPOINT =
  process.env.GRAPHQL_ENDPOINT ?? "http://localhost:4000/graphql";

const POSTS_QUERY = `
  query Posts {
    posts {
      id
      fileUrl
      title
      courseCode
      description
      year
      createdAt
      author {
        id
        fullName
        username
      }
    }
  }
`;

export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get("mc_session")?.value;

  const graphqlResponse = await fetch(GRAPHQL_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ query: POSTS_QUERY }),
  });

  const graphqlBody = await graphqlResponse.json().catch(() => ({}));

  if (!graphqlResponse.ok || graphqlBody?.errors?.length) {
    return NextResponse.json(
      {
        error: graphqlBody?.errors?.[0]?.message || "Failed to fetch posts",
      },
      { status: 400 },
    );
  }

  return NextResponse.json({ posts: graphqlBody?.data?.posts ?? [] });
}
