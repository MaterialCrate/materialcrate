import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";

const GOOGLE_OAUTH_AUTHORIZE_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const FACEBOOK_OAUTH_AUTHORIZE_URL = "https://www.facebook.com/v22.0/dialog/oauth";

const SUPPORTED_PROVIDERS = new Set(["google", "facebook"]);

const buildCallbackPath = (provider: string) =>
  `/api/auth/social/callback/${provider}`;

const buildErrorRedirect = (origin: string, mode: string, message: string) => {
  const destination = mode === "register" ? "/register" : "/login";
  const url = new URL(destination, origin);
  url.searchParams.set("error", message);
  return url;
};

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ provider: string }> },
) {
  const resolvedParams = await params;
  const provider = String(resolvedParams.provider || "").trim().toLowerCase();
  const mode = req.nextUrl.searchParams.get("mode") === "register" ? "register" : "login";
  const fallbackNextPath = mode === "register" ? "/register?social=1" : "/";
  const nextPath = req.nextUrl.searchParams.get("next") || fallbackNextPath;
  const origin = req.nextUrl.origin;

  if (!SUPPORTED_PROVIDERS.has(provider)) {
    return NextResponse.redirect(
      buildErrorRedirect(origin, mode, "Unsupported social provider"),
    );
  }

  const state = randomUUID();
  const redirectUri = `${origin}${buildCallbackPath(provider)}`;
  let oauthUrl: URL;

  if (provider === "google") {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    if (!clientId) {
      return NextResponse.redirect(
        buildErrorRedirect(origin, mode, "Google auth is not configured"),
      );
    }

    oauthUrl = new URL(GOOGLE_OAUTH_AUTHORIZE_URL);
    oauthUrl.searchParams.set("client_id", clientId);
    oauthUrl.searchParams.set("redirect_uri", redirectUri);
    oauthUrl.searchParams.set("response_type", "code");
    oauthUrl.searchParams.set("scope", "openid email profile");
    oauthUrl.searchParams.set("state", state);
    oauthUrl.searchParams.set("prompt", "select_account");
  } else {
    const appId = process.env.FACEBOOK_APP_ID;
    if (!appId) {
      return NextResponse.redirect(
        buildErrorRedirect(origin, mode, "Facebook auth is not configured"),
      );
    }

    oauthUrl = new URL(FACEBOOK_OAUTH_AUTHORIZE_URL);
    oauthUrl.searchParams.set("client_id", appId);
    oauthUrl.searchParams.set("redirect_uri", redirectUri);
    oauthUrl.searchParams.set("response_type", "code");
    oauthUrl.searchParams.set("scope", "email,public_profile");
    oauthUrl.searchParams.set("state", state);
  }

  const response = NextResponse.redirect(oauthUrl.toString());
  response.cookies.set(`mc_oauth_state_${provider}`, state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 10,
  });
  response.cookies.set(`mc_oauth_mode_${provider}`, mode, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 10,
  });
  response.cookies.set(`mc_oauth_next_${provider}`, nextPath, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 10,
  });

  return response;
}
