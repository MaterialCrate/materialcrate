import { NextResponse } from "next/server";
import { cookies } from "next/headers";

const GRAPHQL_ENDPOINT =
  process.env.GRAPHQL_ENDPOINT ?? "http://localhost:4000/graphql";

const CHANGE_PASSWORD_MUTATION = `
  mutation ChangePassword($currentPassword: String!, $newPassword: String!) {
    changePassword(
      currentPassword: $currentPassword
      newPassword: $newPassword
    )
  }
`;

type ChangePasswordBody = {
  currentPassword?: string;
  newPassword?: string;
};

const getErrorStatus = (message: string, fallbackStatus?: number) => {
  if (message === "Not authenticated" || message === "Current password is incorrect") {
    return 401;
  }

  if (
    message === "Current password and new password are required" ||
    message === "New password must be at least 8 characters" ||
    message === "New password must be different from your current password"
  ) {
    return 400;
  }

  if (message === "User not found") {
    return 404;
  }

  if (fallbackStatus && fallbackStatus >= 400) {
    return fallbackStatus >= 500 ? fallbackStatus : 400;
  }

  return 500;
};

export async function POST(req: Request) {
  let body: ChangePasswordBody;

  try {
    body = (await req.json()) as ChangePasswordBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const currentPassword = body.currentPassword ?? "";
  const newPassword = body.newPassword ?? "";

  if (!currentPassword || !newPassword) {
    return NextResponse.json(
      { error: "Current password and new password are required" },
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
      query: CHANGE_PASSWORD_MUTATION,
      variables: { currentPassword, newPassword },
    }),
  });

  const graphqlBody = await graphqlResponse.json().catch(() => ({}));

  if (!graphqlResponse.ok || graphqlBody?.errors?.length) {
    const errorMessage =
      graphqlBody?.errors?.[0]?.message || "Failed to change password";

    console.error("[auth/change-password] GraphQL request failed", {
      graphqlStatus: graphqlResponse.status,
      graphqlErrors: graphqlBody?.errors ?? null,
    });

    return NextResponse.json(
      {
        error: errorMessage,
        details: graphqlBody?.errors ?? null,
        status: graphqlResponse.status,
      },
      { status: getErrorStatus(errorMessage, graphqlResponse.status) },
    );
  }

  return NextResponse.json({ ok: true });
}
