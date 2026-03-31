import { NextResponse } from "next/server";
import { cookies } from "next/headers";

const GRAPHQL_ENDPOINT =
  process.env.GRAPHQL_ENDPOINT ?? "http://localhost:4000/graphql";

const UPDATE_PUSH_NOTIFICATION_SETTINGS_MUTATION = `
  mutation UpdatePushNotificationSettings(
    $pushNotificationsLikes: Boolean!
    $pushNotificationsComments: Boolean!
    $pushNotificationsFollows: Boolean!
    $pushNotificationsMentions: Boolean!
  ) {
    updatePushNotificationSettings(
      pushNotificationsLikes: $pushNotificationsLikes
      pushNotificationsComments: $pushNotificationsComments
      pushNotificationsFollows: $pushNotificationsFollows
      pushNotificationsMentions: $pushNotificationsMentions
    ) {
      id
      pushNotificationsLikes
      pushNotificationsComments
      pushNotificationsFollows
      pushNotificationsMentions
    }
  }
`;

type UpdatePushNotificationSettingsBody = {
  pushNotificationsLikes?: boolean;
  pushNotificationsComments?: boolean;
  pushNotificationsFollows?: boolean;
  pushNotificationsMentions?: boolean;
};

export async function POST(req: Request) {
  let body: UpdatePushNotificationSettingsBody = {};

  try {
    body = (await req.json()) as UpdatePushNotificationSettingsBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (
    typeof body.pushNotificationsLikes !== "boolean" ||
    typeof body.pushNotificationsComments !== "boolean" ||
    typeof body.pushNotificationsFollows !== "boolean" ||
    typeof body.pushNotificationsMentions !== "boolean"
  ) {
    return NextResponse.json(
      {
        error:
          "pushNotificationsLikes, pushNotificationsComments, pushNotificationsFollows, and pushNotificationsMentions are required booleans",
      },
      { status: 400 },
    );
  }

  const cookieStore = await cookies();
  const token = cookieStore.get("mc_session")?.value;

  if (!token) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const graphqlResponse = await fetch(GRAPHQL_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      query: UPDATE_PUSH_NOTIFICATION_SETTINGS_MUTATION,
      variables: {
        pushNotificationsLikes: body.pushNotificationsLikes,
        pushNotificationsComments: body.pushNotificationsComments,
        pushNotificationsFollows: body.pushNotificationsFollows,
        pushNotificationsMentions: body.pushNotificationsMentions,
      },
    }),
  });

  const graphqlBody = await graphqlResponse.json().catch(() => ({}));

  if (!graphqlResponse.ok || graphqlBody?.errors?.length) {
    return NextResponse.json(
      {
        error:
          graphqlBody?.errors?.[0]?.message ||
          "Failed to update push notification settings",
      },
      { status: 400 },
    );
  }

  return NextResponse.json({
    ok: true,
    pushNotifications:
      graphqlBody?.data?.updatePushNotificationSettings ?? null,
  });
}
