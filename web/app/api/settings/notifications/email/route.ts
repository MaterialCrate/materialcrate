import { NextResponse } from "next/server";
import { cookies } from "next/headers";

const GRAPHQL_ENDPOINT =
  process.env.GRAPHQL_ENDPOINT ?? "http://localhost:4000/graphql";

const UPDATE_EMAIL_NOTIFICATION_SETTINGS_MUTATION = `
  mutation UpdateEmailNotificationSettings(
    $emailNotificationsAccountActivity: Boolean!
    $emailNotificationsWeeklySummary: Boolean!
    $emailNotificationsProductUpdates: Boolean!
    $emailNotificationsMarketing: Boolean!
    $emailNotificationsUploadReminder: Boolean!
  ) {
    updateEmailNotificationSettings(
      emailNotificationsAccountActivity: $emailNotificationsAccountActivity
      emailNotificationsWeeklySummary: $emailNotificationsWeeklySummary
      emailNotificationsProductUpdates: $emailNotificationsProductUpdates
      emailNotificationsMarketing: $emailNotificationsMarketing
      emailNotificationsUploadReminder: $emailNotificationsUploadReminder
    ) {
      id
      emailNotificationsAccountActivity
      emailNotificationsWeeklySummary
      emailNotificationsProductUpdates
      emailNotificationsMarketing
      emailNotificationsUploadReminder
    }
  }
`;

type UpdateEmailNotificationSettingsBody = {
  emailNotificationsAccountActivity?: boolean;
  emailNotificationsWeeklySummary?: boolean;
  emailNotificationsProductUpdates?: boolean;
  emailNotificationsMarketing?: boolean;
  emailNotificationsUploadReminder?: boolean;
};

export async function POST(req: Request) {
  let body: UpdateEmailNotificationSettingsBody = {};

  try {
    body = (await req.json()) as UpdateEmailNotificationSettingsBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (
    typeof body.emailNotificationsAccountActivity !== "boolean" ||
    typeof body.emailNotificationsWeeklySummary !== "boolean" ||
    typeof body.emailNotificationsProductUpdates !== "boolean" ||
    typeof body.emailNotificationsMarketing !== "boolean" ||
    typeof body.emailNotificationsUploadReminder !== "boolean"
  ) {
    return NextResponse.json(
      {
        error:
          "emailNotificationsAccountActivity, emailNotificationsWeeklySummary, emailNotificationsProductUpdates, emailNotificationsMarketing, and emailNotificationsUploadReminder are required booleans",
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
      query: UPDATE_EMAIL_NOTIFICATION_SETTINGS_MUTATION,
      variables: {
        emailNotificationsAccountActivity:
          body.emailNotificationsAccountActivity,
        emailNotificationsWeeklySummary: body.emailNotificationsWeeklySummary,
        emailNotificationsProductUpdates: body.emailNotificationsProductUpdates,
        emailNotificationsMarketing: body.emailNotificationsMarketing,
        emailNotificationsUploadReminder: body.emailNotificationsUploadReminder,
      },
    }),
  });

  const graphqlBody = await graphqlResponse.json().catch(() => ({}));

  if (!graphqlResponse.ok || graphqlBody?.errors?.length) {
    return NextResponse.json(
      {
        error:
          graphqlBody?.errors?.[0]?.message ||
          "Failed to update email notification settings",
      },
      { status: 400 },
    );
  }

  return NextResponse.json({
    ok: true,
    emailNotifications:
      graphqlBody?.data?.updateEmailNotificationSettings ?? null,
  });
}
