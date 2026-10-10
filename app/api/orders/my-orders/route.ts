import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  try {
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

    const orders = await db.order.findMany({
      where: {
        userId: session.userId,
      },
      orderBy: {
        createdAt: "desc",
      },
      select: {
        id: true,
        customer: true,
        email: true,
        phone: true,
        address: true,
        status: true,
        fulfillmentStatus: true,
        total: true,
        paymentReference: true,
        paymentChannel: true,
        paidAt: true,
        createdAt: true,
        updatedAt: true,
        orderItems: {
          select: {
            id: true,
            quantity: true,
            price: true,
            product: {
              select: {
                id: true,
                name: true,
                image: true,
              },
            },
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      orders,
    });
  } catch (error) {
    console.error(
      "Customer orders error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message: "Failed to load your orders.",
      },
      { status: 500 }
    );
  }
}