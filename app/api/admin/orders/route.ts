import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  try {
    // ----------------------------------------
    // 1. Authentication
    // ----------------------------------------

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

    // ----------------------------------------
    // 2. Admin authorization
    // ----------------------------------------

    if (session.role !== "ADMIN") {
      return NextResponse.json(
        {
          success: false,
          message: "Admin access required.",
        },
        { status: 403 }
      );
    }

    // ----------------------------------------
    // 3. Get orders
    // ----------------------------------------

    const orders = await db.order.findMany({
      orderBy: {
        createdAt: "desc",
      },

      include: {
        orderItems: {
          include: {
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

    // ----------------------------------------
    // 4. Return orders
    // ----------------------------------------

    return NextResponse.json({
      success: true,
      orders,
    });
  } catch (error) {
    console.error(
      "Admin orders error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message: "Failed to load orders.",
      },
      { status: 500 }
    );
  }
}



export async function PATCH(request: Request) {
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

    if (session.role !== "ADMIN") {
      return NextResponse.json(
        {
          success: false,
          message: "Admin access required.",
        },
        { status: 403 }
      );
    }

    const body = await request.json();

    const {
      id,
      fulfillmentStatus,
    } = body;

    const allowedStatuses = [
      "PENDING",
      "PROCESSING",
      "SHIPPED",
      "DELIVERED",
      "CANCELLED",
    ];

    if (
      !id ||
      !allowedStatuses.includes(
        fulfillmentStatus
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "A valid order ID and fulfillment status are required.",
        },
        { status: 400 }
      );
    }

    const order = await db.order.findUnique({
      where: {
        id,
      },
      select: {
        id: true,
        status: true,
        fulfillmentStatus: true,
      },
    });

    if (!order) {
      return NextResponse.json(
        {
          success: false,
          message: "Order not found.",
        },
        { status: 404 }
      );
    }

    /*
      Paid orders cannot be cancelled through
      this control because refund handling has
      not been implemented yet.
    */
    if (
      order.status === "PAID" &&
      fulfillmentStatus === "CANCELLED"
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Paid orders cannot be cancelled here. Refund handling must be completed first.",
        },
        { status: 400 }
      );
    }

    /*
      Processing, shipped and delivered orders
      require successful payment.
    */
    if (
      ["PROCESSING", "SHIPPED", "DELIVERED"].includes(
        fulfillmentStatus
      ) &&
      order.status !== "PAID"
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "This order must be paid before fulfillment can continue.",
        },
        { status: 400 }
      );
    }

    /*
      Do not allow fulfillment to move backwards.
    */
    const fulfillmentRank: Record<
      string,
      number
    > = {
      PENDING: 0,
      PROCESSING: 1,
      SHIPPED: 2,
      DELIVERED: 3,
    };

    if (
      fulfillmentStatus !== "CANCELLED" &&
      order.fulfillmentStatus !== "CANCELLED" &&
      fulfillmentRank[
        fulfillmentStatus
      ] <
        fulfillmentRank[
          order.fulfillmentStatus
        ]
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Fulfillment status cannot move backwards.",
        },
        { status: 400 }
      );
    }

    const updatedOrder =
      await db.order.update({
        where: {
          id,
        },
        data: {
          fulfillmentStatus,
        },
        select: {
          id: true,
          status: true,
          fulfillmentStatus: true,
          updatedAt: true,
        },
      });

    return NextResponse.json({
      success: true,
      message:
        "Fulfillment status updated successfully.",
      order: updatedOrder,
    });
  } catch (error) {
    console.error(
      "Admin order fulfillment update error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Failed to update fulfillment status.",
      },
      { status: 500 }
    );
  }
}