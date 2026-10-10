import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const base = (process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL || "https://simplyire-essentials.vercel.app").replace(/\/$/, "");
  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/shop/", "/about", "/services", "/blog", "/contact", "/faq", "/shipping", "/returns", "/privacy", "/terms"],
      disallow: ["/admin", "/api/", "/dashboard", "/checkout", "/payment/callback"],
    },
    sitemap: `${base}/sitemap.xml`,
  };
}
