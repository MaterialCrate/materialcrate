import { NextRequest, NextResponse } from "next/server";

const GRAPHQL_ENDPOINT =
  process.env.GRAPHQL_ENDPOINT ?? "http://localhost:4000/graphql";

const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_USERINFO_URL = "https://openidconnect.googleapis.com/v1/userinfo";
const FACEBOOK_TOKEN_URL = "https://graph.facebook.com/v22.0/oauth/access_token";
const FACEBOOK_PROFILE_URL = "https://graph.facebook.com/me";

const SOCIAL_AUTH_MUTATION = `
  mutation SocialAuth(
    $provider: String!
    $providerUserId: String!
    $email: String!
    $firstName: String
    $surname: String
  ) {
    socialAuth(
      provider: $provider
      providerUserId: $providerUserId
      email: $email
      firstName: $firstName
      surname: $surname
    ) {
      token
      user {
        id
        email
        username
        firstName
        surname
        institution
        program
        linkedSEOs
      }
    }
  }
`;

type SocialIdentity = {
  providerUserId: string;
  email: string;
  firstName?: string | null;
  surname?: string | null;
};

const buildErrorRedirect = (
  origin: string,
  mode: string,
  provider: string,
  message: string,
) => {
  const destination = mode === "register" ? "/register" : "/login";
  const url = new URL(destination, origin);
  url.searchParams.set("provider", provider);
  url.searchParams.set("error", message);
  return url;
};

const readMode = (req: NextRequest, provider: string) => {
  const value = req.cookies.get(`mc_oauth_mode_${provider}`)?.value;
  return value === "register" ? "register" : "login";
};

const readNextPath = (req: NextRequest, provider: string) =>
  req.cookies.get(`mc_oauth_next_${provider}`)?.value || "/";

const clearSocialCookies = (
  response: NextResponse,
  provider: string,
) => {
  response.cookies.set(`mc_oauth_state_${provider}`, "", {
    path: "/",
    maxAge: 0,
  });
  response.cookies.set(`mc_oauth_mode_${provider}`, "", {
    path: "/",
    maxAge: 0,
  });
  response.cookies.set(`mc_oauth_next_${provider}`, "", {
    path: "/",
    maxAge: 0,
  });
};

const ensureEmail = (email?: string | null) => {
  const normalized = String(email || "").trim().toLowerCase();
  if (!normalized) {
    throw new Error("No email was returned by the social provider");
  }
  return normalized;
};

const exchangeGoogleCodeForIdentity = async (
  code: string,
  redirectUri: string,
) => {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("Google auth is not configured");
  }

  const tokenResponse = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });
  const tokenBody = await tokenResponse.json().catch(() => ({}));
  if (!tokenResponse.ok || !tokenBody?.access_token) {
    throw new Error("Failed to exchange Google OAuth code");
  }

  const profileResponse = await fetch(GOOGLE_USERINFO_URL, {
    headers: {
      Authorization: `Bearer ${tokenBody.access_token}`,
    },
  });
  const profileBody = await profileResponse.json().catch(() => ({}));
  if (!profileResponse.ok || !profileBody?.sub) {
    throw new Error("Failed to fetch Google profile");
  }

  return {
    providerUserId: String(profileBody.sub),
    email: ensureEmail(profileBody.email),
    firstName: profileBody.given_name ?? null,
    surname: profileBody.family_name ?? null,
  } satisfies SocialIdentity;
};

const exchangeFacebookCodeForIdentity = async (
  code: string,
  redirectUri: string,
) => {
  const appId = process.env.FACEBOOK_APP_ID;
  const appSecret = process.env.FACEBOOK_APP_SECRET;
  if (!appId || !appSecret) {
    throw new Error("Facebook auth is not configured");
  }

  const tokenUrl = new URL(FACEBOOK_TOKEN_URL);
  tokenUrl.searchParams.set("client_id", appId);
  tokenUrl.searchParams.set("client_secret", appSecret);
  tokenUrl.searchParams.set("redirect_uri", redirectUri);
  tokenUrl.searchParams.set("code", code);

  const tokenResponse = await fetch(tokenUrl.toString());
  const tokenBody = await tokenResponse.json().catch(() => ({}));
  if (!tokenResponse.ok || !tokenBody?.access_token) {
    throw new Error("Failed to exchange Facebook OAuth code");
  }

  const profileUrl = new URL(FACEBOOK_PROFILE_URL);
  profileUrl.searchParams.set("fields", "id,email,first_name,last_name,name");
  profileUrl.searchParams.set("access_token", tokenBody.access_token);

  const profileResponse = await fetch(profileUrl.toString());
  const profileBody = await profileResponse.json().catch(() => ({}));
  if (!profileResponse.ok || !profileBody?.id) {
    throw new Error("Failed to fetch Facebook profile");
  }

  return {
    providerUserId: String(profileBody.id),
    email: ensureEmail(profileBody.email),
    firstName: profileBody.first_name ?? null,
    surname: profileBody.last_name ?? null,
  } satisfies SocialIdentity;
};

const exchangeCodeForIdentity = async (
  provider: string,
  code: string,
  redirectUri: string,
) => {
  if (provider === "google") {
    return exchangeGoogleCodeForIdentity(code, redirectUri);
  }
  if (provider === "facebook") {
    return exchangeFacebookCodeForIdentity(code, redirectUri);
  }
  throw new Error("Unsupported social provider");
};

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ provider: string }> },
) {
  const resolvedParams = await params;
  const provider = String(resolvedParams.provider || "").trim().toLowerCase();
  const mode = readMode(req, provider);
  const origin = req.nextUrl.origin;
  const error = req.nextUrl.searchParams.get("error");
  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");
  const savedState = req.cookies.get(`mc_oauth_state_${provider}`)?.value;

  if (error) {
    const response = NextResponse.redirect(
      buildErrorRedirect(origin, mode, provider, "Social sign-in was cancelled"),
    );
    clearSocialCookies(response, provider);
    return response;
  }

  if (!code || !state || !savedState || state !== savedState) {
    const response = NextResponse.redirect(
      buildErrorRedirect(origin, mode, provider, "Invalid social sign-in state"),
    );
    clearSocialCookies(response, provider);
    return response;
  }

  const redirectUri = `${origin}/api/auth/social/callback/${provider}`;

  try {
    const identity = await exchangeCodeForIdentity(provider, code, redirectUri);
    const graphqlResponse = await fetch(GRAPHQL_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: SOCIAL_AUTH_MUTATION,
        variables: {
          provider,
          providerUserId: identity.providerUserId,
          email: identity.email,
          firstName: identity.firstName,
          surname: identity.surname,
        },
      }),
    });
    const graphqlBody = await graphqlResponse.json().catch(() => ({}));

    if (!graphqlResponse.ok || graphqlBody?.errors?.length) {
      throw new Error(
        graphqlBody?.errors?.[0]?.message || "Social authentication failed",
      );
    }

    const token = graphqlBody?.data?.socialAuth?.token as string | undefined;
    if (!token) {
      throw new Error("Social authentication did not return a token");
    }

    const nextPath = readNextPath(req, provider);
    const destination = nextPath.startsWith("/") ? nextPath : "/";
    const response = NextResponse.redirect(new URL(destination, origin));
    response.cookies.set("mc_session", token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });
    clearSocialCookies(response, provider);
    return response;
  } catch (caughtError: unknown) {
    const message =
      caughtError instanceof Error
        ? caughtError.message
        : "Social sign-in failed";
    const response = NextResponse.redirect(
      buildErrorRedirect(origin, mode, provider, message),
    );
    clearSocialCookies(response, provider);
    return response;
  }
}
