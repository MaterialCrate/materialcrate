import type { MetadataRoute } from "next";

const getBaseUrl = () => {
  const configuredBaseUrl =
    process.env.APP_BASE_URL?.trim() ||
    (process.env.NODE_ENV === "production"
      ? "https://materialcrate.com"
      : "http://localhost:3000");

  return configuredBaseUrl.endsWith("/")
    ? configuredBaseUrl.slice(0, -1)
    : configuredBaseUrl;
};

const getPublicRoutes = () => [
  "/",
  "/feed",
  "/login",
  "/register",
  "/settings/legal/privacy-policy",
  "/settings/legal/terms-of-service",
  "/settings/support/guidelines",
];

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = getBaseUrl();
  const lastModified = new Date();

  return getPublicRoutes().map((route) => ({
    url: new URL(route, `${baseUrl}/`).toString(),
    lastModified,
    changeFrequency: route === "/" ? "daily" : "monthly",
    priority: route === "/" ? 1 : 0.6,
  }));
}
