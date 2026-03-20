import { NextResponse } from "next/server";
import { cookies } from "next/headers";

const GRAPHQL_ENDPOINT =
  process.env.GRAPHQL_ENDPOINT ?? "http://localhost:4000/graphql";

const USER_CONNECTIONS_QUERY = `
  query UserConnections($username: String!) {
    me {
      username
      followers {
        username
      }
      following {
        username
      }
    }
    userByUsername(username: $username) {
      followers {
        id
        username
        displayName
        profilePicture
        subscriptionPlan
      }
      following {
        id
        username
        displayName
        profilePicture
        subscriptionPlan
      }
    }
  }
`;

type RouteContext = {
  params: Promise<{
    username: string;
  }>;
};

type GraphUser = {
  id: string;
  username: string;
  displayName: string;
  profilePicture?: string | null;
  subscriptionPlan?: string | null;
};

type UsernameEntry = {
  username?: string | null;
};

const normalizeUsername = (value?: string | null) =>
  String(value || "").trim().toLowerCase();

export async function GET(_: Request, context: RouteContext) {
  const { username } = await context.params;
  const normalizedUsername = decodeURIComponent(username || "").trim();

  if (!normalizedUsername) {
    return NextResponse.json({ error: "Username is required" }, { status: 400 });
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
      query: USER_CONNECTIONS_QUERY,
      variables: { username: normalizedUsername },
    }),
  });

  const graphqlBody = await graphqlResponse.json().catch(() => ({}));

  if (!graphqlResponse.ok || graphqlBody?.errors?.length) {
    return NextResponse.json(
      {
        error:
          graphqlBody?.errors?.[0]?.message || "Failed to fetch user connections",
      },
      { status: 400 },
    );
  }

  const user = graphqlBody?.data?.userByUsername ?? null;
  if (!user) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  const me = graphqlBody?.data?.me ?? null;
  const viewerUsername = normalizeUsername(me?.username);
  const viewerFollowers = new Set(
    (Array.isArray(me?.followers) ? me.followers : [])
      .map((entry: UsernameEntry) => normalizeUsername(entry?.username))
      .filter(Boolean),
  );
  const viewerFollowing = new Set(
    (Array.isArray(me?.following) ? me.following : [])
      .map((entry: UsernameEntry) => normalizeUsername(entry?.username))
      .filter(Boolean),
  );

  const mapConnection = (entry: GraphUser) => {
    const entryUsername = normalizeUsername(entry?.username);
    const isCurrentUser = viewerUsername !== "" && entryUsername === viewerUsername;
    const isFollowedByCurrentUser =
      !isCurrentUser && viewerFollowing.has(entryUsername);
    const isFollowingCurrentUser =
      !isCurrentUser && viewerFollowers.has(entryUsername);

    return {
      id: entry.id,
      username: entry.username,
      displayName: entry.displayName,
      profilePicture: entry.profilePicture ?? null,
      subscriptionPlan: entry.subscriptionPlan ?? null,
      isCurrentUser,
      isFollowedByCurrentUser,
      isFollowingCurrentUser,
      followActionLabel: isCurrentUser
        ? null
        : isFollowedByCurrentUser
          ? "Unfollow"
          : isFollowingCurrentUser
            ? "Follow back"
            : "Follow",
    };
  };

  return NextResponse.json({
    followers: (Array.isArray(user.followers) ? user.followers : []).map(mapConnection),
    following: (Array.isArray(user.following) ? user.following : []).map(mapConnection),
  });
}
