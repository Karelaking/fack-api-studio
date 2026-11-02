import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : "https://fackapi.studio");

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/api/",
        "/dashboard/",
        "/projects/",
        "/sign-in/",
        "/sign-up/",
        "/settings/",
        "/analytics/",
        "/activity/",
        "/domains/",
        "/keys/",
      ],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
