import { NextResponse } from "next/server";
import { cookies } from "next/headers";

const GRAPHQL_ENDPOINT =
  process.env.GRAPHQL_ENDPOINT ?? "http://localhost:4000/graphql";

const USER_BY_USERNAME_QUERY = `
  query UserByUsername($username: String!) {
    me {
      username
    }
    userByUsername(username: $username) {
      id
      username
      displayName
      profilePicture
      profileBackground
      visibilityPublicProfile
      followersCount
      followingCount
      subscriptionPlan
      institution
      institutionVisibility
      program
      programVisibility
      createdAt
      followers {
        username
      }
      following {
        username
      }
    }
    pendingFollowRequestId(username: $username)
  }
`;

const LEGACY_USER_BY_USERNAME_QUERY = `
  query UserByUsername($username: String!) {
    me {
      username
    }
    userByUsername(username: $username) {
      id
      username
      displayName
      profilePicture
      profileBackground
      visibilityPublicProfile
      followersCount
      followingCount
      subscriptionPlan
      institution
      program
      createdAt
      followers {
        username
      }
      following {
        username
      }
    }
    pendingFollowRequestId(username: $username)
  }
`;

type RouteContext = {
  params: Promise<{
    username: string;
  }>;
};

const fetchUserProfile = async (
  token: string | undefined,
  query: string,
  username: string,
) => {
  const graphqlResponse = await fetch(GRAPHQL_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({
      query,
      variables: { username },
    }),
  });

  const graphqlBody = await graphqlResponse.json().catch(() => ({}));
  return { graphqlResponse, graphqlBody };
};

export async function GET(_: Request, context: RouteContext) {
  const { username } = await context.params;
  const normalizedUsername = decodeURIComponent(username || "").trim();

  if (!normalizedUsername) {
    return NextResponse.json(
      { error: "Username is required" },
      { status: 400 },
    );
  }

  const cookieStore = await cookies();
  const token = cookieStore.get("mc_session")?.value;

  let { graphqlResponse, graphqlBody } = await fetchUserProfile(
    token,
    USER_BY_USERNAME_QUERY,
    normalizedUsername,
  );

  const hasVisibilitySchemaDrift = Array.isArray(graphqlBody?.errors)
    ? graphqlBody.errors.some((error: { message?: string }) =>
        /(institutionVisibility|programVisibility)/i.test(error?.message ?? ""),
      )
    : false;

  if (
    (!graphqlResponse.ok || graphqlBody?.errors?.length) &&
    hasVisibilitySchemaDrift
  ) {
    const legacyResult = await fetchUserProfile(
      token,
      LEGACY_USER_BY_USERNAME_QUERY,
      normalizedUsername,
    );
    graphqlResponse = legacyResult.graphqlResponse;
    graphqlBody = legacyResult.graphqlBody;
  }

  if (!graphqlResponse.ok || graphqlBody?.errors?.length) {
    return NextResponse.json(
      {
        error: graphqlBody?.errors?.[0]?.message || "Failed to fetch profile",
      },
      { status: 400 },
    );
  }

  const user = graphqlBody?.data?.userByUsername ?? null;
  if (!user) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  const viewerUsername = String(graphqlBody?.data?.me?.username || "")
    .trim()
    .toLowerCase();
  const followers = Array.isArray(user.followers) ? user.followers : [];
  const following = Array.isArray(user.following) ? user.following : [];
  const isFollowedByCurrentUser = viewerUsername
    ? followers.some(
        (entry: { username?: string | null }) =>
          entry.username?.trim().toLowerCase() === viewerUsername,
      )
    : false;
  const isFollowingCurrentUser = viewerUsername
    ? following.some(
        (entry: { username?: string | null }) =>
          entry.username?.trim().toLowerCase() === viewerUsername,
      )
    : false;

  const pendingFollowRequestId =
    graphqlBody?.data?.pendingFollowRequestId ?? null;

  return NextResponse.json({
    user: {
      ...user,
      isFollowedByCurrentUser,
      isFollowingCurrentUser,
      hasPendingFollowRequest: Boolean(pendingFollowRequestId),
      pendingFollowRequestId,
    },
  });
}
