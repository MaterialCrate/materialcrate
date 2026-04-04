import { cookies } from "next/headers";
import { NextResponse } from "next/server";

const GRAPHQL_ENDPOINT =
  process.env.GRAPHQL_ENDPOINT ?? "http://localhost:4000/graphql";
const BILLING_API_BASE = GRAPHQL_ENDPOINT.replace(/\/graphql\/?$/, "");

export async function POST() {
  const cookieStore = await cookies();
  const token = cookieStore.get("mc_session")?.value;

  if (!token) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    const response = await fetch(`${BILLING_API_BASE}/billing/portal`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    });

    const body = await response.json().catch(() => ({}));
    const url = typeof body?.url === "string" ? body.url.trim() : "";

    if (!response.ok) {
      return NextResponse.json(
        { error: body?.error || "Failed to open billing portal" },
        { status: response.status || 500 },
      );
    }

    if (!/^https?:\/\//i.test(url)) {
      return NextResponse.json(
        { error: "Billing portal URL is invalid" },
        { status: 502 },
      );
    }

    return NextResponse.json({ url });
  } catch (error) {
    console.error("Failed to create Paddle portal session", error);
    return NextResponse.json(
      { error: "Failed to open billing portal" },
      { status: 500 },
    );
  }
}
