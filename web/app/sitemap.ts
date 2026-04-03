import type { MetadataRoute } from "next";
import { getBaseUrl, getPublicRoutes } from "./lib/site-url";

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
