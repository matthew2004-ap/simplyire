import type { MetadataRoute } from "next";
import { db } from "@/lib/db";

const baseUrl = (
  process.env.NEXT_PUBLIC_SITE_URL ||
  process.env.SITE_URL ||
  "https://simplyire.vercel.app"
).replace(/\/+$/, "");

const staticRoutes = [
  "/",
  "/shop",
  "/about",
  "/services",
  "/blog",
  "/contact",
  "/faq",
  "/shipping",
  "/returns",
  "/privacy",
  "/terms",
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticPages: MetadataRoute.Sitemap = staticRoutes.map((route) => ({
    url: `${baseUrl}${route}`,
    changeFrequency:
      route === "/" || route === "/shop" ? "daily" : "monthly",
    priority: route === "/" ? 1 : route === "/shop" ? 0.9 : 0.6,
  }));

  const products = await db.product.findMany({
    select: {
      slug: true,
      updatedAt: true,
    },
    orderBy: {
      updatedAt: "desc",
    },
  });

  const productPages: MetadataRoute.Sitemap = products.map((product) => ({
    url: `${baseUrl}/shop/product/${product.slug}`,
    lastModified: product.updatedAt,
    changeFrequency: "weekly",
    priority: 0.7,
  }));

  return [...staticPages, ...productPages];
}