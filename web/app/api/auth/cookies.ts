export const SESSION_COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
};

export const SESSION_COOKIE_NAME = "mc_session";
export const RESTORE_SESSION_COOKIE_NAME = "mc_restore_session";
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;
