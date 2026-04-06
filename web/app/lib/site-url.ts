const INDEXNOW_KEY = "8552190ddbba414994b59d7f2711d708";

export const getBaseUrl = () => {
  const configuredBaseUrl =
    process.env.APP_BASE_URL?.trim() ||
    (process.env.NODE_ENV === "production"
      ? "https://materialcrate.com"
      : "http://localhost:3000");

  return configuredBaseUrl.endsWith("/")
    ? configuredBaseUrl.slice(0, -1)
    : configuredBaseUrl;
};

export const getPublicRoutes = () => [
  "/",
  "/feed",
  "/login",
  "/register",
  "/settings/legal/privacy-policy",
  "/settings/legal/terms-of-service",
  "/settings/support/guidelines",
];

export const getIndexNowKey = () => INDEXNOW_KEY;

export const getIndexNowKeyLocation = () =>
  `${getBaseUrl()}/${getIndexNowKey()}.txt`;

export const toAbsoluteUrl = (route: string) =>
  new URL(route, `${getBaseUrl()}/`).toString();

export const getIndexNowUrlList = (routes = getPublicRoutes()) =>
  Array.from(
    new Set([...routes, "/sitemap.xml"].map((route) => toAbsoluteUrl(route))),
  );
