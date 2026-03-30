import { NextResponse } from "next/server";
import { cookies } from "next/headers";

const GRAPHQL_ENDPOINT =
  process.env.GRAPHQL_ENDPOINT ?? "http://localhost:4000/graphql";

const UPDATE_VISIBILITY_SETTINGS_MUTATION = `
  mutation UpdateVisibilitySettings(
    $visibilityPublicProfile: Boolean!
    $visibilityPublicPosts: Boolean!
    $visibilityPublicComments: Boolean!
    $visibilityOnlineStatus: Boolean!
  ) {
    updateVisibilitySettings(
      visibilityPublicProfile: $visibilityPublicProfile
      visibilityPublicPosts: $visibilityPublicPosts
      visibilityPublicComments: $visibilityPublicComments
      visibilityOnlineStatus: $visibilityOnlineStatus
    ) {
      id
      visibilityPublicProfile
      visibilityPublicPosts
      visibilityPublicComments
      visibilityOnlineStatus
    }
  }
`;

type UpdateVisibilitySettingsBody = {
  visibilityPublicProfile?: boolean;
  visibilityPublicPosts?: boolean;
  visibilityPublicComments?: boolean;
  visibilityOnlineStatus?: boolean;
};

export async function POST(req: Request) {
  let body: UpdateVisibilitySettingsBody = {};

  try {
    body = (await req.json()) as UpdateVisibilitySettingsBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (
    typeof body.visibilityPublicProfile !== "boolean" ||
    typeof body.visibilityPublicPosts !== "boolean" ||
    typeof body.visibilityPublicComments !== "boolean" ||
    typeof body.visibilityOnlineStatus !== "boolean"
  ) {
    return NextResponse.json(
      {
        error:
          "visibilityPublicProfile, visibilityPublicPosts, visibilityPublicComments, and visibilityOnlineStatus are required booleans",
      },
      { status: 400 },
    );
  }

  const cookieStore = await cookies();
  const token = cookieStore.get("mc_session")?.value;

  if (!token) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const normalizedVisibilityPublicPosts = body.visibilityPublicProfile
    ? body.visibilityPublicPosts
    : false;

  const graphqlResponse = await fetch(GRAPHQL_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      query: UPDATE_VISIBILITY_SETTINGS_MUTATION,
      variables: {
        visibilityPublicProfile: body.visibilityPublicProfile,
        visibilityPublicPosts: normalizedVisibilityPublicPosts,
        visibilityPublicComments: body.visibilityPublicComments,
        visibilityOnlineStatus: body.visibilityOnlineStatus,
      },
    }),
  });

  const graphqlBody = await graphqlResponse.json().catch(() => ({}));

  if (!graphqlResponse.ok || graphqlBody?.errors?.length) {
    return NextResponse.json(
      {
        error:
          graphqlBody?.errors?.[0]?.message ||
          "Failed to update visibility settings",
      },
      { status: 400 },
    );
  }

  return NextResponse.json({
    ok: true,
    visibility: graphqlBody?.data?.updateVisibilitySettings ?? null,
  });
}
