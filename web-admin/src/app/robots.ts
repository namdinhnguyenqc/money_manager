import type { MetadataRoute } from "next";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://trocare-production.vercel.app";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/tin-tuc", "/privacy", "/terms", "/delete-account"],
      disallow: [
        "/admin",
        "/owner",
        "/login",
        "/complete-profile",
        "/pending-approval",
        "/not-authorized",
      ],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
