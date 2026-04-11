import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

const GRAPHQL_ENDPOINT =
  process.env.GRAPHQL_ENDPOINT ?? "http://localhost:4000/graphql";

const CHAT_USER_SUGGESTIONS_QUERY = `
  query ChatUserSuggestions($query: String) {
    chatUserSuggestions(query: $query) {
      id
      displayName
      username
      profilePicture
      followersCount
      isFollowing
      hasExistingConversation
    }
  }
`;

const getAuthToken = async () => {
  const cookieStore = await cookies();
  return cookieStore.get("mc_session")?.value ?? null;
};

export async function GET(request: NextRequest) {
  const token = await getAuthToken();
  if (!token) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const q = request.nextUrl.searchParams.get("q")?.trim() || null;

  const res = await fetch(GRAPHQL_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      query: CHAT_USER_SUGGESTIONS_QUERY,
      variables: { query: q },
    }),
  });

  const body = await res.json().catch(() => ({}));

  if (!res.ok || body?.errors?.length) {
    return NextResponse.json(
      { error: body?.errors?.[0]?.message || "Failed to fetch suggestions" },
      { status: 400 },
    );
  }

  return NextResponse.json({
    users: body?.data?.chatUserSuggestions ?? [],
  });
}
