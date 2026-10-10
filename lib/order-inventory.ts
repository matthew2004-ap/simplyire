import { db } from "@/lib/db";

type PaymentDetails = {
  reference: string;
  channel?: string | null;
  paidAt?: string | null;
};

/**
 * Commit a successful payment and its reserved inventory atomically.
 * The conditional order update is the claim step: concurrent callbacks
 * and webhooks cannot both consume the same reservation.
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

      if (
        order.status === "PAID" &&
        order.inventoryStatus === "COMMITTED"
      ) {
        return order;
      }

      if (order.inventoryStatus === "RELEASED") {
        throw new Error(
          "This order's inventory reservation has already been released. Reconcile the payment before taking further action."
        );
      }

      const paidAt = payment.paidAt
        ? new Date(payment.paidAt)
        : new Date();

      if (order.inventoryStatus === "RESERVED") {
        // Claim the reservation inside this transaction before changing stock.
        const claimed = await tx.order.updateMany({
          where: {
            id: order.id,
            inventoryStatus: "RESERVED",
            status: { not: "FAILED" },
          },
          data: {
            status: "PAID",
            paymentReference: payment.reference,
            paymentChannel: payment.channel ?? null,
            paidAt,
            inventoryStatus: "COMMITTED",
            reservationExpiresAt: null,
          },
        });

        if (claimed.count !== 1) {
          const current = await tx.order.findUnique({
            where: { id: order.id },
            include: { orderItems: true },
          });

          if (
            current?.status === "PAID" &&
            current.inventoryStatus === "COMMITTED"
          ) {
            return current;
          }

          throw new Error(
            "The inventory reservation could not be claimed for payment settlement."
          );
        }

        // The claim and these stock updates share one transaction;
        // any failure rolls the whole operation back.
        for (const item of order.orderItems) {
          const result = await tx.$executeRaw`
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

          if (result !== 1) {
            throw new Error(
              "Inventory could not be committed for this order."
            );
          }
        }

        const settled = await tx.order.findUnique({
          where: { id: order.id },
          include: { orderItems: true },
        });

        if (!settled) {
          throw new Error("Settled order could not be reloaded.");
        }

        return settled;
      }

      // Legacy orders (inventoryStatus = NONE) used the older system,
      // which already reduced stock at order creation. Do not reduce again.
      if (order.inventoryStatus === "NONE") {
        if (order.status === "PAID") {
          return order;
        }

        const claimed = await tx.order.updateMany({
          where: {
            id: order.id,
            inventoryStatus: "NONE",
            status: { not: "PAID" },
          },
          data: {
            status: "PAID",
            paymentReference: payment.reference,
            paymentChannel: payment.channel ?? null,
            paidAt,
            reservationExpiresAt: null,
          },
        });

        if (claimed.count !== 1) {
          const current = await tx.order.findUnique({
            where: { id: order.id },
            include: { orderItems: true },
          });

          if (current?.status === "PAID") return current;
          throw new Error("The legacy order could not be settled.");
        }

        const settled = await tx.order.findUnique({
          where: { id: order.id },
          include: { orderItems: true },
        });

        if (!settled) {
          throw new Error("Settled order could not be reloaded.");
        }

        return settled;
      }

      throw new Error(
        `Unsupported inventory state: ${order.inventoryStatus}`
      );
    },
    {
      maxWait: 20000,
      timeout: 30000,
    }
  );
}

/**
 * Release an unpaid reservation atomically. The conditional order update
 * ensures duplicate cron runs or callbacks do not release the same stock twice.
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

      // A paid order must never have its reserved stock released.
      if (order.status === "PAID") {
        return order;
      }

      // Claim release before adjusting Product rows. Concurrent release attempts
      // will observe RELEASED after waiting and will not decrement twice.
      const claimed = await tx.order.updateMany({
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

      if (claimed.count !== 1) {
        const current = await tx.order.findUnique({
          where: { id: order.id },
          include: { orderItems: true },
        });

        if (
          current &&
          (current.status === "PAID" ||
            current.inventoryStatus === "RELEASED")
        ) {
          return current;
        }

        throw new Error(
          "The inventory reservation could not be claimed for release."
        );
      }

      for (const item of order.orderItems) {
        const result = await tx.$executeRaw`
          UPDATE "Product"
          SET
            "reservedStock" = "reservedStock" - ${item.quantity},
            "updatedAt" = NOW()
          WHERE
            "id" = ${item.productId}
            AND "reservedStock" >= ${item.quantity}
        `;

        if (result !== 1) {
          throw new Error(
            "Reserved inventory could not be released."
          );
        }
      }

      const released = await tx.order.findUnique({
        where: { id: order.id },
        include: { orderItems: true },
      });

      if (!released) {
        throw new Error("Released order could not be reloaded.");
      }

      return released;
    },
    {
      maxWait: 20000,
      timeout: 30000,
    }
  );
}
