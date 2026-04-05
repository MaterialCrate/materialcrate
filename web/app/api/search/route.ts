import { NextResponse } from "next/server";
import { cookies } from "next/headers";

const GRAPHQL_ENDPOINT =
  process.env.GRAPHQL_ENDPOINT ?? "http://localhost:4000/graphql";

const SEARCH_QUERY = `
  query Search($query: String!, $limit: Int!) {
    searchUsers(query: $query, limit: $limit) {
      id
      username
      displayName
      profilePicture
      followersCount
      followingCount
      subscriptionPlan
      institution
      program
    }
    searchPosts(query: $query, limit: $limit) {
      id
      fileUrl
      thumbnailUrl
      title
      categories
      description
      year
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

const AUTHENTICATED_SEARCH_QUERY = `
  query Search($query: String!, $limit: Int!) {
    me {
      blockedUserIds
      following {
        username
      }
      mutedUsers {
        username
      }
    }
    searchUsers(query: $query, limit: $limit) {
      id
      username
      displayName
      profilePicture
      followersCount
      followingCount
      subscriptionPlan
      institution
      program
    }
    searchPosts(query: $query, limit: $limit) {
      id
      fileUrl
      thumbnailUrl
      title
      categories
      description
      year
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

const TRACK_FEED_INTERACTION_MUTATION = `
  mutation TrackFeedInteraction($input: FeedInteractionInput!) {
    trackFeedInteraction(input: $input)
  }
`;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q")?.trim() ?? "";
  const limitInput = Number.parseInt(searchParams.get("limit") || "", 10);
  const limit = Number.isFinite(limitInput)
    ? Math.max(1, Math.min(limitInput, 25))
    : 12;

  if (!query) {
    return NextResponse.json({ users: [], documents: [] });
  }

  const cookieStore = await cookies();
  const token = cookieStore.get("mc_session")?.value;

  const graphqlResponse = await fetch(GRAPHQL_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({
      query: token ? AUTHENTICATED_SEARCH_QUERY : SEARCH_QUERY,
      variables: {
        query,
        limit,
      },
    }),
  });

  const graphqlBody = await graphqlResponse.json().catch(() => ({}));

  if (!graphqlResponse.ok || graphqlBody?.errors?.length) {
    return NextResponse.json(
      {
        error: graphqlBody?.errors?.[0]?.message || "Failed to search",
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
  const viewerMutedUsernames = new Set(
    (Array.isArray(graphqlBody?.data?.me?.mutedUsers)
      ? graphqlBody.data.me.mutedUsers
      : []
    )
      .map((entry: { username?: string | null }) =>
        entry.username?.trim().toLowerCase(),
      )
      .filter(Boolean),
  );
  const viewerBlockedUserIds = new Set(
    (Array.isArray(graphqlBody?.data?.me?.blockedUserIds)
      ? graphqlBody.data.me.blockedUserIds
      : []
    ).filter(Boolean),
  );

  if (token && query.length >= 2) {
    await fetch(GRAPHQL_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
      body: JSON.stringify({
        query: TRACK_FEED_INTERACTION_MUTATION,
        variables: {
          input: {
            interactionType: "SEARCH",
            signalKind: "positive",
            searchTerm: query,
            metadata: JSON.stringify({ source: "search-route", limit }),
          },
        },
      }),
    }).catch(() => null);
  }

  const documents = (
    Array.isArray(graphqlBody?.data?.searchPosts)
      ? graphqlBody.data.searchPosts
      : []
  ).map((post: Record<string, unknown>) => {
    const author = (post.author ?? null) as {
      id?: string | null;
      username?: string | null;
    } | null;
    const authorUsername = author?.username?.trim().toLowerCase();

    return {
      ...post,
      isAuthorFollowedByCurrentUser: authorUsername
        ? viewerFollowingUsernames.has(authorUsername)
        : false,
      isAuthorMutedByCurrentUser: authorUsername
        ? viewerMutedUsernames.has(authorUsername)
        : false,
      isAuthorBlockedByCurrentUser: author?.id
        ? viewerBlockedUserIds.has(author.id)
        : false,
    };
  });

  return NextResponse.json({
    users: graphqlBody?.data?.searchUsers ?? [],
    documents,
  });
}
