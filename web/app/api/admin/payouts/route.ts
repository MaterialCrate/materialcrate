import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ADMIN_COOKIE_NAME, verifyAdminToken } from "@/app/lib/admin-auth";

const GRAPHQL_ENDPOINT =
  process.env.GRAPHQL_ENDPOINT ?? "http://localhost:4000/graphql";
const ADMIN_SECRET = process.env.ADMIN_SECRET ?? "";

async function requireAdmin() {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_COOKIE_NAME)?.value;
  return token ? verifyAdminToken(token) : false;
}

const LIST_QUERY = `
  query AdminListCashoutRequests($status: String, $limit: Int, $offset: Int) {
    adminListCashoutRequests(status: $status, limit: $limit, offset: $offset) {
      id
      userId
      tokensAmount
      cashAmount
      status
      payoutMethod
      payoutDetails
      adminNote
      reviewedAt
      createdAt
      user {
        id
        username
        displayName
        email
        tokenBalance
        tokensEarned
      }
    }
  }
`;

const REVIEW_MUTATION = `
  mutation AdminReviewCashoutRequest($id: ID!, $status: String!, $adminNote: String) {
    adminReviewCashoutRequest(id: $id, status: $status, adminNote: $adminNote)
  }
`;

export async function GET(req: Request) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Not authorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") ?? undefined;
  const limit = Math.min(Number(searchParams.get("limit") ?? "50"), 200);
  const offset = Math.max(Number(searchParams.get("offset") ?? "0"), 0);

  const res = await fetch(GRAPHQL_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-admin-secret": ADMIN_SECRET,
    },
    body: JSON.stringify({
      query: LIST_QUERY,
      variables: { status: status || null, limit, offset },
    }),
    cache: "no-store",
  });

  const body = await res.json().catch(() => ({}));

  if (!res.ok || body?.errors?.length) {
    return NextResponse.json(
      { error: body?.errors?.[0]?.message || "Failed to list payout requests" },
      { status: 400 },
    );
  }

  return NextResponse.json({
    requests: body?.data?.adminListCashoutRequests ?? [],
  });
}

export async function PATCH(req: Request) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Not authorized" }, { status: 401 });
  }

  let input: { id?: string; status?: string; adminNote?: string };
  try {
    input = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const id = input.id?.trim();
  const status = input.status?.trim().toLowerCase();

  if (!id || !status) {
    return NextResponse.json(
      { error: "id and status are required" },
      { status: 400 },
    );
  }

  const VALID = ["approved", "paid", "rejected", "pending"];
  if (!VALID.includes(status)) {
    return NextResponse.json(
      { error: `status must be one of: ${VALID.join(", ")}` },
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
      query: REVIEW_MUTATION,
      variables: {
        id,
        status,
        adminNote: input.adminNote?.trim() || null,
      },
    }),
  });

  const body = await res.json().catch(() => ({}));

  if (!res.ok || body?.errors?.length) {
    return NextResponse.json(
      { error: body?.errors?.[0]?.message || "Failed to update request" },
      { status: 400 },
    );
  }

  return NextResponse.json({ success: true });
}
