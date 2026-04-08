import { NextResponse } from "next/server";
import { cookies } from "next/headers";

const GRAPHQL_ENDPOINT =
  process.env.GRAPHQL_ENDPOINT ?? "http://localhost:4000/graphql";

const REDEEM_MUTATION = `
  mutation RedeemTokensForSubscription($plan: String!) {
    redeemTokensForSubscription(plan: $plan)
  }
`;

export async function POST(req: Request) {
  const cookieStore = await cookies();
  const token = cookieStore.get("mc_session")?.value;
  if (!token) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  let body: { plan?: string };
  try {
    body = (await req.json()) as { plan?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const plan = body.plan?.trim().toLowerCase();
  if (!plan || (plan !== "pro" && plan !== "premium")) {
    return NextResponse.json(
      { error: "plan must be 'pro' or 'premium'" },
      { status: 400 },
    );
  }

  const gqlResponse = await fetch(GRAPHQL_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      query: REDEEM_MUTATION,
      variables: { plan },
    }),
  });

  const gqlBody = await gqlResponse.json().catch(() => ({}));

  if (!gqlResponse.ok || gqlBody?.errors?.length) {
    return NextResponse.json(
      { error: gqlBody?.errors?.[0]?.message || "Redemption failed" },
      { status: 400 },
    );
  }

  return NextResponse.json({ success: true });
}
