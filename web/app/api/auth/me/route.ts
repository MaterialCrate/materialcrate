import { NextResponse } from "next/server";
import { cookies } from "next/headers";

const GRAPHQL_ENDPOINT =
  process.env.GRAPHQL_ENDPOINT ?? "http://localhost:4000/graphql";

const ME_QUERY = `
  query Me {
    me {
      id
      email
      pendingEmail
      emailVerified
      username
      displayName
      profilePicture
      profileBackground
      visibilityPublicProfile
      visibilityPublicPosts
      visibilityPublicComments
      visibilityOnlineStatus
      linkedSEOs
      subscriptionPlan
      subscriptionStartedAt
      subscriptionEndsAt
      createdAt
      followersCount
      followingCount
      institution
      program
      emailNotificationsAccountActivity
      emailNotificationsWeeklySummary
      emailNotificationsProductUpdates
      emailNotificationsMarketing
      pushNotificationsLikes
      pushNotificationsComments
      pushNotificationsFollows
      pushNotificationsMentions
    }
  }
`;

const LEGACY_ME_QUERY = `
  query Me {
    me {
      id
      email
      username
      displayName
      profilePicture
      profileBackground
      visibilityPublicProfile
      visibilityPublicPosts
      visibilityPublicComments
      visibilityOnlineStatus
      emailNotificationsAccountActivity
      emailNotificationsWeeklySummary
      emailNotificationsProductUpdates
      emailNotificationsMarketing
      pushNotificationsLikes
      pushNotificationsComments
      pushNotificationsFollows
      pushNotificationsMentions
      linkedSEOs
      subscriptionPlan
      subscriptionStartedAt
      subscriptionEndsAt
      createdAt
      followersCount
      followingCount
      institution
      program
    }
  }
`;

const fetchMe = async (token: string, query: string) => {
  const response = await fetch(GRAPHQL_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ query }),
  });

  const body = await response.json().catch(() => ({}));
  return { response, body };
};

export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get("mc_session")?.value;
  if (!token) {
    return NextResponse.json({ user: null }, { status: 401 });
  }

  const primary = await fetchMe(token, ME_QUERY);
  const missingFieldError = Array.isArray(primary.body?.errors)
    ? primary.body.errors.some((error: { message?: string }) =>
        /Cannot query field "(pendingEmail|emailVerified|visibilityPublicProfile|visibilityPublicPosts|visibilityPublicComments|visibilityOnlineStatus|emailNotificationsAccountActivity|emailNotificationsWeeklySummary|emailNotificationsProductUpdates|emailNotificationsMarketing)"/.test(
          error?.message ?? "",
        ),
      )
    : false;

  if (
    (!primary.response.ok || primary.body?.errors?.length) &&
    missingFieldError
  ) {
    console.warn("[auth/me] Falling back to legacy query", {
      status: primary.response.status,
      errors: primary.body?.errors ?? null,
    });

    const legacy = await fetchMe(token, LEGACY_ME_QUERY);
    if (!legacy.response.ok || legacy.body?.errors?.length) {
      console.error("[auth/me] Legacy query failed", {
        status: legacy.response.status,
        errors: legacy.body?.errors ?? null,
      });
      return NextResponse.json({ user: null }, { status: 401 });
    }

    return NextResponse.json({
      user: {
        ...legacy.body?.data?.me,
        pendingEmail: null,
        emailVerified: true,
        visibilityPublicProfile: true,
        visibilityPublicPosts: true,
        visibilityPublicComments: true,
        visibilityOnlineStatus: true,
        emailNotificationsAccountActivity: true,
        emailNotificationsWeeklySummary: true,
        emailNotificationsProductUpdates: true,
        emailNotificationsMarketing: true,
        pushNotificationsLikes: true,
        pushNotificationsComments: true,
        pushNotificationsFollows: true,
        pushNotificationsMentions: true,
      },
    });
  }

  if (!primary.response.ok || primary.body?.errors?.length) {
    console.error("[auth/me] Query failed", {
      status: primary.response.status,
      errors: primary.body?.errors ?? null,
    });
    return NextResponse.json({ user: null }, { status: 401 });
  }

  return NextResponse.json({ user: primary.body?.data?.me ?? null });
}
