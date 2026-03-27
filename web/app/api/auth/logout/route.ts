import { NextResponse } from "next/server";
import {
  RESTORE_SESSION_COOKIE_NAME,
  SESSION_COOKIE_NAME,
  SESSION_COOKIE_OPTIONS,
} from "../cookies";

export async function POST() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE_NAME, "", {
    ...SESSION_COOKIE_OPTIONS,
    maxAge: 0,
  });
  response.cookies.set(RESTORE_SESSION_COOKIE_NAME, "", {
    ...SESSION_COOKIE_OPTIONS,
    maxAge: 0,
  });
  return response;
}
