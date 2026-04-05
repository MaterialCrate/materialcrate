import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ADMIN_COOKIE_NAME, verifyAdminToken } from "@/app/lib/admin-auth";

const GRAPHQL_ENDPOINT =
  process.env.GRAPHQL_ENDPOINT ?? "http://localhost:4000/graphql";
const ADMIN_SECRET = process.env.ADMIN_SECRET ?? "";

async function requireAdmin() {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_COOKIE_NAME)?.value;
  if (!token || !verifyAdminToken(token)) {
    return false;
  }
  return true;
}

const LIST_BOTS_QUERY = `
  query AdminListBots {
    adminListBots {
      id
      username
      displayName
      profilePicture
      institution
      program
      isBot
      createdAt
    }
  }
`;

const CREATE_BOT_MUTATION = `
  mutation AdminCreateBot(
    $username: String!
    $displayName: String!
    $institution: String
    $program: String
    $profilePicture: String
  ) {
    adminCreateBot(
      username: $username
      displayName: $displayName
      institution: $institution
      program: $program
      profilePicture: $profilePicture
    ) {
      id
      username
      displayName
      profilePicture
      institution
      program
      isBot
      createdAt
    }
  }
`;

export async function GET() {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Not authorized" }, { status: 401 });
  }

  const res = await fetch(GRAPHQL_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-admin-secret": ADMIN_SECRET,
    },
    body: JSON.stringify({ query: LIST_BOTS_QUERY }),
  });

  const body = await res.json().catch(() => ({}));

  if (!res.ok || body?.errors?.length) {
    return NextResponse.json(
      { error: body?.errors?.[0]?.message || "Failed to list bots" },
      { status: 400 },
    );
  }

  return NextResponse.json({ bots: body?.data?.adminListBots ?? [] });
}

export async function POST(req: Request) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Not authorized" }, { status: 401 });
  }

  let input: {
    username?: string;
    displayName?: string;
    institution?: string;
    program?: string;
    profilePicture?: string;
  };

  try {
    input = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!input.username || !input.displayName) {
    return NextResponse.json(
      { error: "Username and display name are required" },
      { status: 400 },
    );
  }

  const res = await fetch(GRAPHQL_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-admin-secret": ADMIN_SECRET,
    },
    body: JSON.stringify({
      query: CREATE_BOT_MUTATION,
      variables: {
        username: input.username,
        displayName: input.displayName,
        institution: input.institution || null,
        program: input.program || null,
        profilePicture: input.profilePicture || null,
      },
    }),
  });

  const body = await res.json().catch(() => ({}));

  if (!res.ok || body?.errors?.length) {
    return NextResponse.json(
      { error: body?.errors?.[0]?.message || "Failed to create bot" },
      { status: 400 },
    );
  }

  return NextResponse.json({ bot: body?.data?.adminCreateBot });
}
