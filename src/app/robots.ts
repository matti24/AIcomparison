import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/server-catalog";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/api/", "/go/", "/favorites", "/watchlist", "/sign-in"],
    },
    sitemap: `${siteUrl()}/sitemap.xml`,
  };
}
