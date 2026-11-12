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

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = resolveSiteUrl();
  const stableLastModified = new Date("2026-11-10T00:00:00.000Z");

  return [
    {
      url: baseUrl,
      lastModified: stableLastModified,
      changeFrequency: "weekly",
      priority: 1.0,
    },
    {
      url: `${baseUrl}/llms.txt`,
      lastModified: stableLastModified,
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: `${baseUrl}/llms-full.txt`,
      lastModified: stableLastModified,
      changeFrequency: "monthly",
      priority: 0.5,
    },
  ];
}
