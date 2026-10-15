import { db } from "@/lib/db";

type PaymentDetails = {
  reference: string;
  channel?: string | null;
  paidAt?: string | null;
};

type CleanupResult = {
  orderId: string;
  action: string;
};

type CleanupSummary = {
  scanned: number;
  released: number;
  committed: number;
  stillPending: number;
  failed: number;
  results: CleanupResult[];
};

/**
 * Confirms a payment and commits reserved inventory.
 *
 * This function is shared by the Paystack verification
 * route, webhook, and reservation cleanup.
 *
 * An order's reserved inventory can only be committed
 * once. The inventory transition and stock adjustments
 * occur in one database transaction.
 */
export async function settlePaidOrder(
  orderId: string,
  payment: PaymentDetails
) {
  return db.$transaction(
    async (tx) => {
      const order = await tx.order.findUnique({
        where: { id: orderId },
        include: { orderItems: true },
      });

      if (!order) {
        throw new Error("Order not found.");
      }

      if (order.inventoryStatus === "RELEASED") {
        throw new Error(
          "This order's inventory reservation has already been released."
        );
      }

      // The order has already been completely settled.
      if (
        order.status === "PAID" &&
        order.inventoryStatus === "COMMITTED"
      ) {
        return order;
      }

      /*
       * RESERVED -> COMMITTED
       *
       * Claim the transition first. Concurrent webhook,
       * callback, and cleanup requests cannot all claim
       * the same reservation.
       */
      if (order.inventoryStatus === "RESERVED") {
        const claim = await tx.order.updateMany({
          where: {
            id: order.id,
            inventoryStatus: "RESERVED",
          },
          data: {
            status: "PAID",
            inventoryStatus: "COMMITTED",
            paymentReference: payment.reference,
            paymentChannel: payment.channel ?? null,
            paidAt: payment.paidAt
              ? new Date(payment.paidAt)
              : new Date(),
            reservationExpiresAt: null,
          },
        });

        if (claim.count !== 1) {
          const latest = await tx.order.findUnique({
            where: { id: order.id },
          });

          if (
            latest?.status === "PAID" &&
            latest.inventoryStatus === "COMMITTED"
          ) {
            return latest;
          }

          throw new Error(
            "The inventory reservation changed before payment could be committed."
          );
        }

        /*
         * Reduce physical stock and reserved stock together.
         *
         * Example:
         * stock = 10, reservedStock = 2, quantity = 2
         * Result: stock = 8, reservedStock = 0
         */
        for (const item of order.orderItems) {
          const updated = await tx.$executeRaw`
            UPDATE "Product"
            SET
              "stock" = "stock" - ${item.quantity},
              "reservedStock" = "reservedStock" - ${item.quantity},
              "updatedAt" = NOW()
            WHERE
              "id" = ${item.productId}
              AND "stock" >= ${item.quantity}
              AND "reservedStock" >= ${item.quantity}
          `;

          if (updated !== 1) {
            throw new Error(
              "Inventory could not be committed. The transaction has been rolled back."
            );
          }
        }

        const committedOrder = await tx.order.findUnique({
          where: { id: order.id },
          include: { orderItems: true },
        });

        if (!committedOrder) {
          throw new Error(
            "Could not retrieve the committed order."
          );
        }

        return committedOrder;
      }

      /*
       * Legacy orders with inventoryStatus = NONE had
       * stock deducted by the previous implementation.
       * Do not deduct stock from those orders again.
       */
      if (order.status === "PAID") {
        return order;
      }

      return tx.order.update({
        where: { id: order.id },
        data: {
          status: "PAID",
          paymentReference: payment.reference,
          paymentChannel: payment.channel ?? null,
          paidAt: payment.paidAt
            ? new Date(payment.paidAt)
            : new Date(),
          reservationExpiresAt: null,
        },
        include: { orderItems: true },
      });
    },
    {
      maxWait: 20000,
      timeout: 30000,
    }
  );
}

/**
 * Releases an unpaid inventory reservation.
 *
 * RESERVED -> RELEASED
 *
 * This is idempotent: repeated requests cannot repeatedly
 * subtract the same reservation.
 */
export async function releaseOrderReservation(
  orderId: string
) {
  return db.$transaction(
    async (tx) => {
      const order = await tx.order.findUnique({
        where: { id: orderId },
        include: { orderItems: true },
      });

      if (!order) {
        throw new Error("Order not found.");
      }

      if (order.inventoryStatus !== "RESERVED") {
        return order;
      }

      // Never release inventory for a paid order.
      if (order.status === "PAID") {
        return order;
      }

      /*
       * Claim the release transition before changing
       * inventory. If payment settlement wins the race,
       * this update will not claim the order.
       */
      const claim = await tx.order.updateMany({
        where: {
          id: order.id,
          inventoryStatus: "RESERVED",
          status: { not: "PAID" },
        },
        data: {
          status: "FAILED",
          inventoryStatus: "RELEASED",
          reservationExpiresAt: null,
        },
      });

      if (claim.count !== 1) {
        const latest = await tx.order.findUnique({
          where: { id: order.id },
        });

        if (!latest) {
          throw new Error("Order not found.");
        }

        return latest;
      }

      for (const item of order.orderItems) {
        const updated = await tx.$executeRaw`
          UPDATE "Product"
          SET
            "reservedStock" = "reservedStock" - ${item.quantity},
            "updatedAt" = NOW()
          WHERE
            "id" = ${item.productId}
            AND "reservedStock" >= ${item.quantity}
        `;

        if (updated !== 1) {
          throw new Error(
            "Reserved inventory could not be released. The transaction has been rolled back."
          );
        }
      }

      const releasedOrder = await tx.order.findUnique({
        where: { id: order.id },
        include: { orderItems: true },
      });

      if (!releasedOrder) {
        throw new Error(
          "Could not retrieve the released order."
        );
      }

      return releasedOrder;
    },
    {
      maxWait: 20000,
      timeout: 30000,
    }
  );
}

/**
 * Checks expired reservations against Paystack.
 *
 * Successful payments are committed.
 * Failed or abandoned payments are released.
 * Pending payments retain their reservations.
 *
 * Orders are processed individually so an error on one
 * order does not stop the entire cleanup.
 */
export async function reconcileExpiredReservations(
  limit = 10
): Promise<CleanupSummary> {
  const summary: CleanupSummary = {
    scanned: 0,
    released: 0,
    committed: 0,
    stillPending: 0,
    failed: 0,
    results: [],
  };

  const safeLimit = Math.max(
    1,
    Math.min(Math.floor(limit), 100)
  );

  const expiredOrders = await db.order.findMany({
    where: {
      inventoryStatus: "RESERVED",
      reservationExpiresAt: {
        not: null,
        lte: new Date(),
      },
    },
    orderBy: {
      reservationExpiresAt: "asc",
    },
    take: safeLimit,
    select: {
      id: true,
      status: true,
      total: true,
      paymentReference: true,
      reservationExpiresAt: true,
    },
  });

  summary.scanned = expiredOrders.length;

  const paystackSecret =
    process.env.PAYSTACK_SECRET_KEY;

  for (const order of expiredOrders) {
    try {
      /*
       * If Paystack initialization never succeeded,
       * there is no payment reference to verify.
       */
      if (!order.paymentReference) {
        if (order.status === "PAID") {
          summary.failed++;

          summary.results.push({
            orderId: order.id,
            action: "PAID_WITHOUT_REFERENCE",
          });

          continue;
        }

        await releaseOrderReservation(order.id);

        summary.released++;

        summary.results.push({
          orderId: order.id,
          action: "RELEASED_NO_REFERENCE",
        });

        continue;
      }

      if (!paystackSecret) {
        throw new Error(
          "PAYSTACK_SECRET_KEY is not configured."
        );
      }

      const response = await fetch(
        `https://api.paystack.co/transaction/verify/${encodeURIComponent(
          order.paymentReference
        )}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${paystackSecret}`,
          },
          cache: "no-store",
          signal: AbortSignal.timeout(8000),
        }
      );

      const data = await response.json();

      if (!response.ok || !data.status || !data.data) {
        throw new Error(
          data.message ||
            "Could not verify the Paystack transaction."
        );
      }

      const transaction = data.data;

      /*
       * Check that the transaction matches this order.
       */
      if (
        transaction.reference !==
        order.paymentReference
      ) {
        throw new Error(
          "Payment reference does not match the order."
        );
      }

      if (
        String(transaction.metadata?.orderId) !==
        order.id
      ) {
        throw new Error(
          "Payment metadata does not match the order."
        );
      }

      if (
        Number(transaction.amount) !==
        order.total * 100
      ) {
        throw new Error(
          "Payment amount does not match the order."
        );
      }

      if (transaction.currency !== "NGN") {
        throw new Error(
          "Payment currency does not match the order."
        );
      }

      /*
       * Commit genuine successful payments.
       */
      if (transaction.status === "success") {
        const result = await settlePaidOrder(
          order.id,
          {
            reference: transaction.reference,
            channel: transaction.channel,
            paidAt: transaction.paid_at,
          }
        );

        if (
          result.status === "PAID" &&
          result.inventoryStatus === "COMMITTED"
        ) {
          summary.committed++;

          summary.results.push({
            orderId: order.id,
            action: "COMMITTED",
          });
        } else {
          summary.failed++;

          summary.results.push({
            orderId: order.id,
            action: "PAYMENT_NOT_SETTLED",
          });
        }

        continue;
      }

      /*
       * Only explicit failed or abandoned payments
       * release a reservation.
       */
      if (
        transaction.status === "failed" ||
        transaction.status === "abandoned"
      ) {
        if (order.status === "PAID") {
          summary.failed++;

          summary.results.push({
            orderId: order.id,
            action: "PAID_ORDER_REQUIRES_REVIEW",
          });

          continue;
        }

        await releaseOrderReservation(order.id);

        summary.released++;

        summary.results.push({
          orderId: order.id,
          action: "RELEASED_FAILED_PAYMENT",
        });

        continue;
      }

      /*
       * Pending, ongoing or processing payments
       * keep their inventory reservation.
       */
      summary.stillPending++;

      summary.results.push({
        orderId: order.id,
        action: `PAYMENT_${String(
          transaction.status
        ).toUpperCase()}`,
      });
    } catch (error) {
      summary.failed++;

      console.error(
        `Failed to reconcile expired order ${order.id}:`,
        error
      );

      summary.results.push({
        orderId: order.id,
        action: "ERROR",
      });
    }
  }

  return summary;
}