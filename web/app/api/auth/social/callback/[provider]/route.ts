import { NextRequest, NextResponse } from "next/server";
import { getBaseUrl } from "../../../../../lib/site-url";
import {
  RESTORE_SESSION_COOKIE_NAME,
  SESSION_COOKIE_NAME,
  SESSION_COOKIE_OPTIONS,
  SESSION_MAX_AGE_SECONDS,
} from "../../../cookies";

const GRAPHQL_ENDPOINT =
  process.env.GRAPHQL_ENDPOINT ?? "http://localhost:4000/graphql";

const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_USERINFO_URL = "https://openidconnect.googleapis.com/v1/userinfo";

const SOCIAL_AUTH_MUTATION = `
  mutation SocialAuth(
    $provider: String!
    $providerUserId: String!
    $email: String!
    $displayName: String
  ) {
    socialAuth(
      provider: $provider
      providerUserId: $providerUserId
      email: $email
      displayName: $displayName
    ) {
      token
      restoreRequired
      restoreDeadline
      user {
        id
        email
        username
        displayName
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
  displayName?: string | null;
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

const getRequestOrigin = (req: NextRequest) => {
  const forwardedHost = req.headers
    .get("x-forwarded-host")
    ?.split(",")[0]
    ?.trim();
  const forwardedProto = req.headers
    .get("x-forwarded-proto")
    ?.split(",")[0]
    ?.trim();

  if (forwardedHost) {
    const protocol =
      forwardedProto ||
      (forwardedHost.startsWith("localhost") ||
      forwardedHost.startsWith("127.0.0.1")
        ? "http"
        : "https");
    return `${protocol}://${forwardedHost}`;
  }

  const origin = req.nextUrl.origin;
  if (
    process.env.NODE_ENV === "production" &&
    /:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin)
  ) {
    return getBaseUrl();
  }

  return origin;
};

const readMode = (req: NextRequest, provider: string) => {
  const value = req.cookies.get(`mc_oauth_mode_${provider}`)?.value;
  return value === "register" ? "register" : "login";
};

const readNextPath = (req: NextRequest, provider: string) =>
  req.cookies.get(`mc_oauth_next_${provider}`)?.value || "/";

const clearSocialCookies = (response: NextResponse, provider: string) => {
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
  const normalized = String(email || "")
    .trim()
    .toLowerCase();
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
    displayName:
      (profileBody.name ??
        [profileBody.given_name, profileBody.family_name]
          .filter(Boolean)
          .join(" ")) ||
      null,
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
  throw new Error("Unsupported social provider");
};

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ provider: string }> },
) {
  const resolvedParams = await params;
  const provider = String(resolvedParams.provider || "")
    .trim()
    .toLowerCase();
  const mode = readMode(req, provider);
  const origin = getRequestOrigin(req);
  const error = req.nextUrl.searchParams.get("error");
  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");
  const savedState = req.cookies.get(`mc_oauth_state_${provider}`)?.value;

  if (error) {
    const response = NextResponse.redirect(
      buildErrorRedirect(
        origin,
        mode,
        provider,
        "Social sign-in was cancelled",
      ),
    );
    clearSocialCookies(response, provider);
    return response;
  }

  if (!code || !state || !savedState || state !== savedState) {
    const response = NextResponse.redirect(
      buildErrorRedirect(
        origin,
        mode,
        provider,
        "Invalid social sign-in state",
      ),
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
          displayName: identity.displayName,
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
    const sessionToken = token as string;

    const restoreRequired = Boolean(
      graphqlBody?.data?.socialAuth?.restoreRequired,
    );
    const restoreDeadline =
      typeof graphqlBody?.data?.socialAuth?.restoreDeadline === "string"
        ? graphqlBody.data.socialAuth.restoreDeadline
        : null;
    const hasCompletedProfile = Boolean(
      graphqlBody?.data?.socialAuth?.user?.username,
    );
    // Regardless of which page they started from (login or register):
    // - if the account is complete (has a username) → go home
    // - if not (brand new account) → go through registration steps
    const destination = restoreRequired
      ? `/login?restore=1${
          restoreDeadline
            ? `&restoreDeadline=${encodeURIComponent(restoreDeadline)}`
            : ""
        }`
      : hasCompletedProfile
        ? "/"
        : "/register?social=1";
    const response = NextResponse.redirect(new URL(destination, origin));
    response.cookies.set(
      restoreRequired ? RESTORE_SESSION_COOKIE_NAME : SESSION_COOKIE_NAME,
      sessionToken,
      {
        ...SESSION_COOKIE_OPTIONS,
        maxAge: SESSION_MAX_AGE_SECONDS,
      },
    );
    if (restoreRequired) {
      response.cookies.set(SESSION_COOKIE_NAME, "", {
        ...SESSION_COOKIE_OPTIONS,
        maxAge: 0,
      });
    } else {
      response.cookies.set(RESTORE_SESSION_COOKIE_NAME, "", {
        ...SESSION_COOKIE_OPTIONS,
        maxAge: 0,
      });
    }
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
