import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";

async function requireAdmin() {
  const session = await getSession();

  if (!session) {
    return {
      error: NextResponse.json(
        {
          success: false,
          message: "You must be logged in.",
        },
        { status: 401 }
      ),
    };
  }

  if (session.role !== "ADMIN") {
    return {
      error: NextResponse.json(
        {
          success: false,
          message: "Admin access required.",
        },
        { status: 403 }
      ),
    };
  }

  return { session };
}

export async function GET(request: Request) {
  try {
    const auth = await requireAdmin();

    if (auth.error) {
      return auth.error;
    }

    const { searchParams } =
      new URL(request.url);

    const customerId =
      searchParams.get("id");

    /*
      CUSTOMER DETAILS
    */
    if (customerId) {
      const customer =
        await db.user.findUnique({
          where: {
            id: customerId,
          },
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            createdAt: true,
            updatedAt: true,
            orders: {
              orderBy: {
                createdAt: "desc",
              },
              select: {
                id: true,
                total: true,
                status: true,
                fulfillmentStatus: true,
                createdAt: true,
                paymentReference: true,
              },
            },
          },
        });

      if (!customer) {
        return NextResponse.json(
          {
            success: false,
            message: "Customer not found.",
          },
          { status: 404 }
        );
      }

      const paidOrders =
        customer.orders.filter(
          (order) =>
            order.status === "PAID"
        );

      const totalSpent =
        paidOrders.reduce(
          (sum, order) =>
            sum + order.total,
          0
        );

      return NextResponse.json({
        success: true,
        customer: {
          ...customer,
          orderCount:
            customer.orders.length,
          paidOrderCount:
            paidOrders.length,
          totalSpent,
        },
      });
    }

    /*
      CUSTOMER LIST
    */

    const customers =
      await db.user.findMany({
        where: {
          role: "CUSTOMER",
        },
        orderBy: {
          createdAt: "desc",
        },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          createdAt: true,
          updatedAt: true,

          orders: {
            orderBy: {
              createdAt: "desc",
            },
            select: {
              id: true,
              total: true,
              status: true,
              fulfillmentStatus: true,
              createdAt: true,
            },
          },
        },
      });

    const formattedCustomers =
      customers.map((customer) => {
        const paidOrders =
          customer.orders.filter(
            (order) =>
              order.status === "PAID"
          );

        const totalSpent =
          paidOrders.reduce(
            (sum, order) =>
              sum + order.total,
            0
          );

        const latestOrder =
          customer.orders[0] ?? null;

        return {
          id: customer.id,
          name: customer.name,
          email: customer.email,
          role: customer.role,
          createdAt: customer.createdAt,
          updatedAt: customer.updatedAt,
          orderCount:
            customer.orders.length,
          paidOrderCount:
            paidOrders.length,
          totalSpent,
          latestOrder,
        };
      });

    return NextResponse.json({
      success: true,
      customers:
        formattedCustomers,
    });
  } catch (error) {
    console.error(
      "Admin customers error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Failed to load customers.",
      },
      { status: 500 }
    );
  }
}