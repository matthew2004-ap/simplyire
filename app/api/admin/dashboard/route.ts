import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  try {
    // Check whether the user is logged in
    const session = await getSession();

    if (!session) {
      return NextResponse.json(
        {
          success: false,
          message: "You must be logged in.",
        },
        { status: 401 }
      );
    }

    // Check whether the user is an admin
    if (session.role !== "ADMIN") {
      return NextResponse.json(
        {
          success: false,
          message: "Admin access required.",
        },
        { status: 403 }
      );
    }

    // Run independent database queries together
    const [
      revenueResult,
      totalOrders,
      totalCustomers,
      totalProducts,
      pendingOrders,
      recentOrders,
      lowStockProducts,
    ] = await Promise.all([
      // Revenue from PAID orders only
      db.order.aggregate({
        _sum: {
          total: true,
        },
        where: {
          status: "PAID",
        },
      }),

      // Total orders
      db.order.count(),

      // Registered customers only
      db.user.count({
        where: {
          role: "CUSTOMER",
        },
      }),

      // Total products
      db.product.count(),

      // Pending orders
      db.order.count({
        where: {
          status: "PENDING",
        },
      }),

      // Most recent 10 orders
      db.order.findMany({
        orderBy: {
          createdAt: "desc",
        },
        take: 10,
        select: {
          id: true,
          customer: true,
          email: true,
          total: true,
          status: true,
          createdAt: true,
        },
      }),

      // Products with 5 or fewer items remaining
      db.product.findMany({
        where: {
          stock: {
            lte: 5,
          },
        },
        orderBy: {
          stock: "asc",
        },
        take: 10,
        select: {
          id: true,
          name: true,
          stock: true,
          price: true,
          image: true,
        },
      }),
    ]);

    const revenue = revenueResult._sum.total ?? 0;

    return NextResponse.json({
      success: true,

      stats: {
        revenue,
        totalOrders,
        totalCustomers,
        totalProducts,
        pendingOrders,
      },

      recentOrders,

      lowStockProducts,
    });
  } catch (error) {
    console.error("Admin dashboard error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to load admin dashboard.",
      },
      { status: 500 }
    );
  }
}