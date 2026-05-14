import { NextResponse } from "next/server";
import { cookies } from "next/headers";

const GRAPHQL_ENDPOINT =
  process.env.GRAPHQL_ENDPOINT ?? "http://localhost:4000/graphql";

const PERM_DELETE_MUTATION = `
  mutation PermanentlyDeleteDocumentRequest($id: ID!) {
    permanentlyDeleteDocumentRequest(id: $id)
  }
`;

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const cookieStore = await cookies();
  const token = cookieStore.get("mc_session")?.value;
  if (!token) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { id } = await params;

  const res = await fetch(GRAPHQL_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ query: PERM_DELETE_MUTATION, variables: { id } }),
  });

  const body = await res.json().catch(() => ({}));
  if (!res.ok || body?.errors?.length) {
    return NextResponse.json(
      { error: body?.errors?.[0]?.message || "Failed to permanently delete request" },
      { status: 400 },
    );
  }
  return NextResponse.json({ success: true });
}
