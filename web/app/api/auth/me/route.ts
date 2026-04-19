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
      pendingSubscriptionPlan
      pendingSubscriptionAction
      pendingSubscriptionEffectiveAt
      createdAt
      followersCount
      followingCount
      institution
      institutionVisibility
      program
      programVisibility
      emailNotificationsAccountActivity
      emailNotificationsWeeklySummary
      emailNotificationsProductUpdates
      emailNotificationsMarketing
      pushNotificationsLikes
      pushNotificationsComments
      pushNotificationsFollows
      pushNotificationsMentions
      theme
      tokenBalance
      tokensEarned
      tokensRedeemed
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

  if (!primary.response.ok || primary.body?.errors?.length) {
    console.error("[auth/me] Query failed", {
      status: primary.response.status,
      errors: primary.body?.errors ?? null,
    });
    return NextResponse.json({ user: null }, { status: 401 });
  }

  return NextResponse.json({ user: primary.body?.data?.me ?? null });
}
