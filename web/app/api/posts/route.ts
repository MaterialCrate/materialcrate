import { NextResponse } from "next/server";
import { cookies } from "next/headers";

const GRAPHQL_ENDPOINT =
  process.env.GRAPHQL_ENDPOINT ?? "http://localhost:4000/graphql";

const POSTS_QUERY = `
  query Posts($authorUsername: String) {
    posts(authorUsername: $authorUsername) {
      id
      fileUrl
      thumbnailUrl
      title
      courseCode
      description
      year
      pinned
      commentsDisabled
      likeCount
      commentCount
      viewerHasLiked
      createdAt
      author {
        id
        displayName
        username
        profilePicture
        subscriptionPlan
      }
    }
  }
`;

const AUTHENTICATED_POSTS_QUERY = `
  query Posts($authorUsername: String) {
    me {
      username
      following {
        username
      }
    }
    posts(authorUsername: $authorUsername) {
      id
      fileUrl
      thumbnailUrl
      title
      courseCode
      description
      year
      pinned
      commentsDisabled
      likeCount
      commentCount
      viewerHasLiked
      createdAt
      author {
        id
        displayName
        username
        profilePicture
        subscriptionPlan
      }
    }
  }
`;

export async function GET(request: Request) {
  const cookieStore = await cookies();
  const token = cookieStore.get("mc_session")?.value;
  const { searchParams } = new URL(request.url);
  const authorUsername = searchParams.get("author")?.trim() || null;

  const graphqlResponse = await fetch(GRAPHQL_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({
      query: token ? AUTHENTICATED_POSTS_QUERY : POSTS_QUERY,
      variables: { authorUsername },
    }),
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

  const viewerFollowingUsernames = new Set(
    (Array.isArray(graphqlBody?.data?.me?.following)
      ? graphqlBody.data.me.following
      : []
    )
      .map((entry: { username?: string | null }) =>
        entry.username?.trim().toLowerCase(),
      )
      .filter(Boolean),
  );

  const posts = (Array.isArray(graphqlBody?.data?.posts)
    ? graphqlBody.data.posts
    : []
  ).map((post: Record<string, unknown>) => {
    const author = (post.author ?? null) as { username?: string | null } | null;
    const authorUsername = author?.username?.trim().toLowerCase();

    return {
      ...post,
      isAuthorFollowedByCurrentUser: authorUsername
        ? viewerFollowingUsernames.has(authorUsername)
        : false,
    };
  });

  return NextResponse.json({ posts });
}
