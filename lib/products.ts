import "server-only";

import { db } from "@/lib/db";

function withAvailableStock<T extends { stock: number; reservedStock?: number }>(product: T) {
  return {
    ...product,
    stock: Math.max(0, product.stock - (product.reservedStock ?? 0)),
  };
}

export async function getProducts() {
  const products = await db.product.findMany({ orderBy: { createdAt: "desc" } });
  return products.map(withAvailableStock);
}

export async function getFeaturedProducts(limit = 4) {
  const products = await db.product.findMany({
    where: { featured: true },
    take: limit,
    orderBy: { createdAt: "desc" },
  });
  return products.map(withAvailableStock);
}

export async function getProduct(slug: string) {
  const product = await db.product.findUnique({ where: { slug } });
  return product ? withAvailableStock(product) : null;
}

export const categories = [
  "All",
  "Perfumes",
  "Beauty",
  "Skincare",
  "Bags & Accessories",
  "Self-Care",
  "Accessories",
];
