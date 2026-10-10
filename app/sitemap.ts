import type { MetadataRoute } from "next";
import { db } from "@/lib/db";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = (process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL || "https://simplyire-essentials.vercel.app").replace(/\/$/, "");
  const staticRoutes = ["", "/shop", "/about", "/services", "/blog", "/contact", "/faq", "/shipping", "/returns", "/privacy", "/terms"];
  const routes: MetadataRoute.Sitemap = staticRoutes.map((route) => ({
    url: `${base}${route}`,
    lastModified: new Date(),
    changeFrequency: route === "/shop" ? "daily" : "monthly",
    priority: route === "" ? 1 : route === "/shop" ? 0.9 : 0.6,
  }));
  try {
    const products = await db.product.findMany({ select: { slug: true, updatedAt: true }, orderBy: { updatedAt: "desc" }, take: 500 });
    routes.push(...products.map((product) => ({
      url: `${base}/shop/${product.slug}`,
      lastModified: product.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })));
  } catch (error) {
    console.error("Sitemap product lookup failed:", error);
  }
  return routes;
}
