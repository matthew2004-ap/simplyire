import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { maybeProcessExpiredReservations } from "@/lib/expired-reservations";

export async function GET() {
  try {
    await maybeProcessExpiredReservations(5);
    const products = await db.product.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        slug: true,
        name: true,
        category: true,
        description: true,
        price: true,
        image: true,
        featured: true,
        stock: true,
        reservedStock: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({
      success: true,
      products: products.map(({ reservedStock, ...product }) => ({
        ...product,
        stock: Math.max(0, product.stock - reservedStock),
      })),
    });
  } catch (error) {
    console.error("Failed to fetch products:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch products." },
      { status: 500 }
    );
  }
}
