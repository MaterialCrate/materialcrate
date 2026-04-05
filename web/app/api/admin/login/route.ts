import { NextResponse } from "next/server";
import {
  ADMIN_EMAIL,
  ADMIN_COOKIE_NAME,
  ADMIN_COOKIE_MAX_AGE,
  verifyAdminPassword,
  createAdminToken,
} from "@/app/lib/admin-auth";

export async function POST(req: Request) {
  let body: { email?: string; password?: string };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { email, password } = body;

  if (!email || !password) {
    return NextResponse.json(
      { error: "Email and password are required" },
      { status: 400 },
    );
  }

  if (
    email.toLowerCase() !== ADMIN_EMAIL.toLowerCase() ||
    !verifyAdminPassword(password)
  ) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  const token = createAdminToken();

  const response = NextResponse.json({ ok: true });
  response.cookies.set(ADMIN_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: ADMIN_COOKIE_MAX_AGE,
  });

  return response;
}
