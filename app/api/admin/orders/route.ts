import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { sendOrderNotificationEmail } from "@/lib/order-notifications";

const ALLOWED_FULFILLMENT_STATUSES = [
  "PENDING",
  "PROCESSING",
  "SHIPPED",
  "DELIVERED",
  "CANCELLED",
] as const;

type FulfillmentStatus =
  (typeof ALLOWED_FULFILLMENT_STATUSES)[number];

type NotificationEvent =
  | "PROCESSING"
  | "SHIPPED"
  | "DELIVERED";

type FulfillmentNotification = {
  orderId: string;
  customerName: string;
  email: string;
  total: number;
  event: NotificationEvent;
};

const fulfillmentRank: Record<string, number> = {
  PENDING: 0,
  PROCESSING: 1,
  SHIPPED: 2,
  DELIVERED: 3,
};

class RouteError extends Error {
  statusCode: number;

  constructor(message: string, statusCode: number) {
    super(message);
    this.name = "RouteError";
    this.statusCode = statusCode;
  }
}

async function requireAdmin() {
  const session = await getSession();

  if (!session) {
    return {
      ok: false as const,
      response: NextResponse.json(
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
      ok: false as const,
      response: NextResponse.json(
        {
          success: false,
          message: "Admin access required.",
        },
        { status: 403 }
      ),
    };
  }

  return { ok: true as const };
}

// =============================================
// GET: LOAD ADMIN ORDERS
// =============================================

export async function GET() {
  try {
    const auth = await requireAdmin();

    if (!auth.ok) {
      return auth.response;
    }

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

    return NextResponse.json({
      success: true,
      orders,
    });
  } catch (error) {
    console.error("Admin orders GET error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to load orders.",
      },
      { status: 500 }
    );
  }
}

// =============================================
// PATCH: UPDATE FULFILLMENT STATUS
// =============================================

export async function PATCH(request: Request) {
  try {
    // -----------------------------------------
    // 1. Authenticate administrator
    // -----------------------------------------

    const auth = await requireAdmin();

    if (!auth.ok) {
      return auth.response;
    }

    // -----------------------------------------
    // 2. Validate request body
    // -----------------------------------------

    let parsedBody: unknown;

    try {
      parsedBody = await request.json();
    } catch {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid JSON request body.",
        },
        { status: 400 }
      );
    }

    if (
      !parsedBody ||
      typeof parsedBody !== "object" ||
      Array.isArray(parsedBody)
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid request body.",
        },
        { status: 400 }
      );
    }

    const body = parsedBody as Record<string, unknown>;

    const id = body.id;
    const requestedStatus = body.fulfillmentStatus;

    if (
      typeof id !== "string" ||
      !id.trim() ||
      typeof requestedStatus !== "string" ||
      !ALLOWED_FULFILLMENT_STATUSES.includes(
        requestedStatus as FulfillmentStatus
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

    const targetStatus =
      requestedStatus as FulfillmentStatus;

    const orderId = id.trim();

    // -----------------------------------------
    // 3. Update order and inventory atomically
    // -----------------------------------------

    const updateResult = await db.$transaction(
      async (tx) => {
        const order = await tx.order.findUnique({
          where: {
            id: orderId,
          },

          select: {
            id: true,
            customer: true,
            email: true,
            total: true,
            status: true,
            fulfillmentStatus: true,
            inventoryStatus: true,
            reservationExpiresAt: true,
            paymentReference: true,

            orderItems: {
              select: {
                productId: true,
                quantity: true,
              },
            },
          },
        });

        if (!order) {
          throw new RouteError(
            "Order not found.",
            404
          );
        }

        // ---------------------------------------
        // Repeated status: safe no-op
        // ---------------------------------------

        if (
          order.fulfillmentStatus === targetStatus
        ) {
          const unchanged =
            await tx.order.findUnique({
              where: {
                id: orderId,
              },

              select: {
                id: true,
                status: true,
                fulfillmentStatus: true,
                inventoryStatus: true,
                reservationExpiresAt: true,
                updatedAt: true,
              },
            });

          if (!unchanged) {
            throw new RouteError(
              "Order not found.",
              404
            );
          }

          // Do not send a second notification when
          // the administrator repeats the same status.
          return {
            order: unchanged,
            notification:
              null as FulfillmentNotification | null,
          };
        }

        // ---------------------------------------
        // Cancelled orders cannot be reopened
        // ---------------------------------------

        if (
          order.fulfillmentStatus === "CANCELLED"
        ) {
          throw new RouteError(
            "Cancelled orders cannot be reopened from this control.",
            409
          );
        }

        // ---------------------------------------
        // Handle cancellation
        // ---------------------------------------

        if (targetStatus === "CANCELLED") {
          if (order.status === "PAID") {
            throw new RouteError(
              "Paid orders cannot be cancelled here. Refund handling must be completed first.",
              400
            );
          }

          // Do not cancel while a payment attempt
          // is awaiting verification.
          if (
            order.status === "PENDING" &&
            order.paymentReference
          ) {
            throw new RouteError(
              "A payment attempt already exists. Verify its result before cancelling this order.",
              409
            );
          }

          if (
            order.inventoryStatus === "COMMITTED"
          ) {
            throw new RouteError(
              "Inventory is already committed for this order. Review the order before cancelling it.",
              409
            );
          }

          if (
            order.inventoryStatus === "RESERVED"
          ) {
            // Claim cancellation only if the order
            // has not changed since it was read.
            const claimed =
              await tx.order.updateMany({
                where: {
                  id: orderId,
                  status: {
                    not: "PAID",
                  },
                  fulfillmentStatus:
                    order.fulfillmentStatus,
                  inventoryStatus: "RESERVED",
                  paymentReference:
                    order.paymentReference,
                },

                data: {
                  fulfillmentStatus: "CANCELLED",
                  inventoryStatus: "RELEASED",
                  reservationExpiresAt: null,
                },
              });

            if (claimed.count !== 1) {
              throw new RouteError(
                "The order changed while you were cancelling it. Refresh the page and try again.",
                409
              );
            }

            // Release reserved stock without reducing
            // the product's physical stock quantity.
            for (const item of order.orderItems) {
              const released =
                await tx.product.updateMany({
                  where: {
                    id: item.productId,
                    reservedStock: {
                      gte: item.quantity,
                    },
                  },

                  data: {
                    reservedStock: {
                      decrement: item.quantity,
                    },
                  },
                });

              if (released.count !== 1) {
                throw new RouteError(
                  "The reserved inventory could not be reconciled. No changes were saved; inspect this order before trying again.",
                  409
                );
              }
            }
          } else {
            // Legacy orders may not have a reservation.
            // Preserve their existing payment status.
            const claimed =
              await tx.order.updateMany({
                where: {
                  id: orderId,
                  status: {
                    not: "PAID",
                  },
                  fulfillmentStatus:
                    order.fulfillmentStatus,
                  inventoryStatus:
                    order.inventoryStatus,
                  paymentReference:
                    order.paymentReference,
                },

                data: {
                  fulfillmentStatus: "CANCELLED",
                  reservationExpiresAt: null,
                },
              });

            if (claimed.count !== 1) {
              throw new RouteError(
                "The order changed while you were cancelling it. Refresh the page and try again.",
                409
              );
            }
          }
        } else {
          // -------------------------------------
          // Handle normal fulfillment transitions
          // -------------------------------------

          const nextRank =
            fulfillmentRank[targetStatus];

          const currentRank =
            fulfillmentRank[
              order.fulfillmentStatus
            ];

          if (
            nextRank === undefined ||
            currentRank === undefined
          ) {
            throw new RouteError(
              "This fulfillment transition is not supported.",
              400
            );
          }

          if (nextRank < currentRank) {
            throw new RouteError(
              "Fulfillment status cannot move backwards.",
              400
            );
          }

          // Fulfillment requires confirmed payment.
          if (
            [
              "PROCESSING",
              "SHIPPED",
              "DELIVERED",
            ].includes(targetStatus) &&
            order.status !== "PAID"
          ) {
            throw new RouteError(
              "This order must be paid before fulfillment can continue.",
              400
            );
          }

          // Do not proceed if payment and inventory
          // records disagree.
          if (
            order.status === "PAID" &&
            order.inventoryStatus === "RELEASED"
          ) {
            throw new RouteError(
              "This order is marked paid but its reservation was released. Verify its inventory before continuing fulfillment.",
              409
            );
          }

          const changed =
            await tx.order.updateMany({
              where: {
                id: orderId,
                status: order.status,
                fulfillmentStatus:
                  order.fulfillmentStatus,
                inventoryStatus:
                  order.inventoryStatus,
              },

              data: {
                fulfillmentStatus: targetStatus,
              },
            });

          if (changed.count !== 1) {
            throw new RouteError(
              "The order changed while you were updating it. Refresh the page and try again.",
              409
            );
          }
        }

        // ---------------------------------------
        // Read updated order
        // ---------------------------------------

        const result =
          await tx.order.findUnique({
            where: {
              id: orderId,
            },

            select: {
              id: true,
              status: true,
              fulfillmentStatus: true,
              inventoryStatus: true,
              reservationExpiresAt: true,
              updatedAt: true,
            },
          });

        if (!result) {
          throw new RouteError(
            "Order not found after update.",
            404
          );
        }

        // ---------------------------------------
        // Prepare notification
        // ---------------------------------------

        let notification:
          | FulfillmentNotification
          | null = null;

        if (
          targetStatus === "PROCESSING" ||
          targetStatus === "SHIPPED" ||
          targetStatus === "DELIVERED"
        ) {
          notification = {
            orderId: order.id,
            customerName: order.customer,
            email: order.email,
            total: order.total,
            event: targetStatus,
          };
        }

        return {
          order: result,
          notification,
        };
      },
      {
        maxWait: 10000,
        timeout: 20000,
      }
    );

    // -----------------------------------------
    // 4. Send email AFTER the transaction commits
    // -----------------------------------------

    if (updateResult.notification) {
      try {
        await sendOrderNotificationEmail(
          updateResult.notification
        );
      } catch (emailError) {
        // An email failure must not undo a successful
        // database update.
        console.error(
          "Order fulfillment notification failed:",
          emailError
        );
      }
    }

    // -----------------------------------------
    // 5. Return updated order
    // -----------------------------------------

    return NextResponse.json({
      success: true,
      message:
        "Fulfillment status updated successfully.",
      order: updateResult.order,
    });
  } catch (error) {
    if (error instanceof RouteError) {
      return NextResponse.json(
        {
          success: false,
          message: error.message,
        },
        {
          status: error.statusCode,
        }
      );
    }

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