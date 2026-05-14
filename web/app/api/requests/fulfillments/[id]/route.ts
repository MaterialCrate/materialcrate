import { NextResponse } from "next/server";
import { cookies } from "next/headers";

const GRAPHQL_ENDPOINT =
  process.env.GRAPHQL_ENDPOINT ?? "http://localhost:4000/graphql";

const DELETE_FULFILLMENT_MUTATION = `
  mutation DeleteDocumentRequestFulfillment($fulfillmentId: ID!) {
    deleteDocumentRequestFulfillment(fulfillmentId: $fulfillmentId)
  }
`;

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const cookieStore = await cookies();
  const token = cookieStore.get("mc_session")?.value;
  if (!token) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { id: fulfillmentId } = await params;

  const res = await fetch(GRAPHQL_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ query: DELETE_FULFILLMENT_MUTATION, variables: { fulfillmentId } }),
  });

  const body = await res.json().catch(() => ({}));
  if (!res.ok || body?.errors?.length) {
    return NextResponse.json(
      { error: body?.errors?.[0]?.message || "Failed to delete response" },
      { status: 400 },
    );
  }
  return NextResponse.json({ success: true });
}
