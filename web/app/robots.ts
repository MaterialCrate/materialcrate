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

export default function robots(): MetadataRoute.Robots {
  const baseUrl = getBaseUrl();

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/"],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl,
  };
}
