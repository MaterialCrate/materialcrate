import { NextResponse } from "next/server";
import { cookies } from "next/headers";

const GRAPHQL_ENDPOINT =
  process.env.GRAPHQL_ENDPOINT ?? "http://localhost:4000/graphql";

const CASHOUT_MUTATION = `
  mutation RequestTokenCashout($tokensAmount: Int!, $payoutMethod: String!, $payoutDetails: String!) {
    requestTokenCashout(tokensAmount: $tokensAmount, payoutMethod: $payoutMethod, payoutDetails: $payoutDetails)
  }
`;

export async function POST(req: Request) {
  const cookieStore = await cookies();
  const token = cookieStore.get("mc_session")?.value;
  if (!token) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  let body: {
    tokensAmount?: number;
    payoutMethod?: string;
    payoutDetails?: Record<string, unknown>;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const tokensAmount = Math.floor(Number(body.tokensAmount));
  if (!Number.isFinite(tokensAmount) || tokensAmount < 5000) {
    return NextResponse.json(
      { error: "Minimum cashout is 5,000 tokens" },
      { status: 400 },
    );
  }

  const VALID_METHODS = ["paypal", "mobile_money", "bank_transfer"];
  const payoutMethod = body.payoutMethod?.trim().toLowerCase() ?? "";
  if (!VALID_METHODS.includes(payoutMethod)) {
    return NextResponse.json(
      { error: "Invalid payout method" },
      { status: 400 },
    );
  }

  if (
    !body.payoutDetails ||
    typeof body.payoutDetails !== "object" ||
    Array.isArray(body.payoutDetails)
  ) {
    return NextResponse.json(
      { error: "Payout details are required" },
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
      query: CASHOUT_MUTATION,
      variables: {
        tokensAmount,
        payoutMethod,
        payoutDetails: JSON.stringify(body.payoutDetails),
      },
    }),
  });

  const gqlBody = await gqlResponse.json().catch(() => ({}));

  if (!gqlResponse.ok || gqlBody?.errors?.length) {
    return NextResponse.json(
      { error: gqlBody?.errors?.[0]?.message || "Cashout request failed" },
      { status: 400 },
    );
  }

  return NextResponse.json({ success: true });
}
