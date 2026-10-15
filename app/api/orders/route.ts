import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { maybeProcessExpiredReservations } from "@/lib/expired-reservations";

type OrderItemInput = {
  productId: string;
  quantity: number;
};

type OrderRequest = {
  customer: string;
  email: string;
  phone: string;
  address: string;
  city?: string;
  state?: string;
  items: OrderItemInput[];
};

export async function POST(request: Request) {
  try {
    // --------------------------------------------------
    // 1. PARSE AND VALIDATE REQUEST BODY
    // --------------------------------------------------

    let parsedBody: unknown;

    try {
      parsedBody = await request.json();
    } catch {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid request body.",
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
          message: "Invalid order information.",
        },
        { status: 400 }
      );
    }

    const body = parsedBody as OrderRequest;

    const {
      customer,
      email,
      phone,
      address,
      city,
      state,
      items,
    } = body;

    // --------------------------------------------------
    // 2. VALIDATE CUSTOMER INFORMATION
    // --------------------------------------------------

    if (
      typeof customer !== "string" ||
      !customer.trim() ||
      typeof email !== "string" ||
      !email.trim() ||
      typeof phone !== "string" ||
      !phone.trim() ||
      typeof address !== "string" ||
      !address.trim()
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Please provide your name, email, phone number, and delivery address.",
        },
        { status: 400 }
      );
    }

    const normalizedEmail = email
      .trim()
      .toLowerCase();

    const validEmail =
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
        normalizedEmail
      );

    if (!validEmail) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Please provide a valid email address.",
        },
        { status: 400 }
      );
    }

    if (
      (city !== undefined &&
        typeof city !== "string") ||
      (state !== undefined &&
        typeof state !== "string")
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "City and state must be valid text values.",
        },
        { status: 400 }
      );
    }

    // --------------------------------------------------
    // 3. VALIDATE CART ITEMS
    // --------------------------------------------------

    if (
      !Array.isArray(items) ||
      items.length === 0
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Your cart is empty. Add products before checking out.",
        },
        { status: 400 }
      );
    }

    const validatedItems: OrderItemInput[] = [];

    for (const item of items) {
      if (
        !item ||
        typeof item.productId !== "string" ||
        !item.productId.trim() ||
        !Number.isSafeInteger(item.quantity) ||
        item.quantity <= 0
      ) {
        return NextResponse.json(
          {
            success: false,
            message:
              "One or more cart items have invalid product IDs or quantities.",
          },
          { status: 400 }
        );
      }

      validatedItems.push({
        productId: item.productId.trim(),
        quantity: item.quantity,
      });
    }

    // --------------------------------------------------
    // 4. PREVENT DUPLICATE PRODUCTS
    // --------------------------------------------------

    const productIds = validatedItems.map(
      (item) => item.productId
    );

    const uniqueProductIds = new Set(
      productIds
    );

    if (
      uniqueProductIds.size !==
      productIds.length
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Duplicate products were found in your cart. Please update your cart and try again.",
        },
        { status: 400 }
      );
    }

    // --------------------------------------------------
    // 5. PROCESS EXPIRED RESERVATIONS
    // --------------------------------------------------

    /*
     * Attempt to reconcile expired reservations before
     * creating another order.
     *
     * If cleanup fails, continue safely. The atomic
     * stock-reservation checks below still prevent
     * overselling, though unreconciled reservations may
     * temporarily make some stock unavailable.
     */
    try {
      await maybeProcessExpiredReservations(10);
    } catch (cleanupError) {
      console.error(
        "On-demand reservation cleanup failed:",
        cleanupError
      );
    }

    // --------------------------------------------------
    // 6. GET CUSTOMER SESSION
    // --------------------------------------------------

    const session = await getSession();

    /*
     * Logged-in customers are associated with their
     * authenticated user ID. Guest checkout remains
     * supported.
     */

    // --------------------------------------------------
    // 7. PREPARE ADDRESS AND RESERVATION EXPIRY
    // --------------------------------------------------

    const fullAddress = [
      address.trim(),
      city?.trim(),
      state?.trim(),
    ]
      .filter(
        (part): part is string =>
          Boolean(part)
      )
      .join(", ");

    const reservationExpiresAt = new Date(
      Date.now() + 30 * 60 * 1000
    );

    // --------------------------------------------------
    // 8. CREATE ORDER AND RESERVE STOCK
    // --------------------------------------------------

    const order = await db.$transaction(
      async (tx) => {
        /*
         * Read authoritative product information
         * from PostgreSQL, not the browser.
         */
        const products =
          await tx.product.findMany({
            where: {
              id: {
                in: productIds,
              },
            },
          });

        if (
          products.length !==
          productIds.length
        ) {
          throw new Error(
            "One or more products are no longer available."
          );
        }

        const productMap = new Map(
          products.map((product) => [
            product.id,
            product,
          ])
        );

        let subtotal = 0;

        // ----------------------------------------------
        // BUILD ORDER ITEMS USING DATABASE PRICES
        // ----------------------------------------------

        const orderItems = validatedItems.map(
          (item) => {
            const product =
              productMap.get(
                item.productId
              );

            if (!product) {
              throw new Error(
                "A product could not be found."
              );
            }

            /*
             * Physical stock includes reserved stock
             * until the reservation is committed.
             *
             * Therefore:
             * Available = stock - reservedStock
             */
            const availableStock =
              Math.max(
                0,
                product.stock -
                  product.reservedStock
              );

            if (
              availableStock <
              item.quantity
            ) {
              throw new Error(
                `${product.name} does not have enough available stock. Only ${availableStock} is currently available.`
              );
            }

            subtotal +=
              product.price *
              item.quantity;

            return {
              productId: product.id,
              quantity: item.quantity,
              price: product.price,
            };
          }
        );

        // ----------------------------------------------
        // CALCULATE DELIVERY
        // ----------------------------------------------

        const deliveryFee =
          subtotal >= 50000
            ? 0
            : 2500;

        const total =
          subtotal + deliveryFee;

        // ----------------------------------------------
        // CREATE THE ORDER
        // ----------------------------------------------

        const createdOrder =
          await tx.order.create({
            data: {
              customer:
                customer.trim(),

              email:
                normalizedEmail,

              phone:
                phone.trim(),

              address:
                fullAddress,

              status: "PENDING",

              fulfillmentStatus:
                "PENDING",

              total,

              userId:
                session?.userId ?? null,

              inventoryStatus:
                "RESERVED",

              reservationExpiresAt,

              orderItems: {
                create: orderItems,
              },
            },

            include: {
              orderItems: true,
            },
          });

        // ----------------------------------------------
        // RESERVE STOCK ATOMICALLY
        // ----------------------------------------------

        /*
         * Recheck available stock in PostgreSQL when
         * reserving each product.
         *
         * This protects against another order reserving
         * the same product after the initial stock read.
         *
         * If any reservation fails, throwing an error
         * rolls back both the order and its reservations.
         */
        for (const item of validatedItems) {
          const result =
            await tx.$executeRaw`
              UPDATE "Product"
              SET
                "reservedStock" =
                  "reservedStock" +
                  ${item.quantity},

                "updatedAt" = NOW()

              WHERE
                "id" = ${item.productId}

                AND
                "stock" - "reservedStock"
                  >= ${item.quantity}
            `;

          if (result !== 1) {
            throw new Error(
              "Stock availability changed while placing your order. Please try again."
            );
          }
        }

        return createdOrder;
      },
      {
        maxWait: 20000,
        timeout: 30000,
      }
    );

    // --------------------------------------------------
    // 9. RETURN SUCCESS RESPONSE
    // --------------------------------------------------

    return NextResponse.json(
      {
        success: true,

        message:
          "Order created and inventory reserved successfully.",

        order: {
          id: order.id,
          total: order.total,
          status: order.status,

          fulfillmentStatus:
            order.fulfillmentStatus,

          inventoryStatus:
            order.inventoryStatus,

          reservationExpiresAt:
            order.reservationExpiresAt,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error(
      "Order creation error:",
      error
    );

    const message =
      error instanceof Error
        ? error.message
        : "Failed to create order.";

    const status =
      message.includes(
        "available stock"
      ) ||
      message.includes(
        "availability changed"
      ) ||
      message.includes(
        "no longer available"
      )
        ? 409
        : 500;

    return NextResponse.json(
      {
        success: false,
        message,
      },
      { status }
    );
  }
}