import type { MetadataRoute } from "next";

function resolveSiteUrl(): string {
  const raw =
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : "https://fackapi.studio");

  if (!raw.startsWith("http://") && !raw.startsWith("https://")) {
    return `https://${raw}`;
  }
  return raw.replace(/\/+$/, "");
}

export default function robots(): MetadataRoute.Robots {
  const baseUrl = resolveSiteUrl();

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/api",
        "/api/",
        "/dashboard",
        "/dashboard/",
        "/projects",
        "/projects/",
        "/sign-in",
        "/sign-in/",
        "/sign-up",
        "/sign-up/",
        "/settings",
        "/settings/",
        "/analytics",
        "/analytics/",
        "/activity",
        "/activity/",
        "/domains",
        "/domains/",
        "/keys",
        "/keys/",
        "/cli",
        "/cli/",
      ],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
