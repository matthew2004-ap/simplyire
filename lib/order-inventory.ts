import "server-only";

import { Prisma } from "@/app/generated/prisma/client";
import { db } from "@/lib/db";

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;

const PAYSTACK_VERIFY_URL = "https://api.paystack.co/transaction/verify";

const DEFAULT_RESERVATION_MINUTES = 30;

type PaymentDetails = {
  reference: string;
  channel?: string | null;
  paidAt?: string | Date | null;
};

type ReconciliationResult = {
  orderId: string;
  action: "RELEASED" | "COMMITTED" | "PENDING" | "FAILED";
  message?: string;
};

type ReconciliationSummary = {
  scanned: number;
  released: number;
  committed: number;
  stillPending: number;
  failed: number;
  results: ReconciliationResult[];
};

type PaystackVerificationResponse = {
  status?: boolean;
  message?: string;
  data?: {
    status?: string;
    reference?: string;
    amount?: number;
    currency?: string;
    metadata?: {
      orderId?: string;
      [key: string]: unknown;
    } | null;
    channel?: string;
  };
};

function getReservationExpiry(minutes = DEFAULT_RESERVATION_MINUTES) {
  return new Date(Date.now() + minutes * 60 * 1000);
}

/**
 * Reserve inventory when creating an order.
 *
 * Call this inside your order-creation transaction, if you use this helper
 * in that flow. Do not reserve the same order twice.
 *
 * This helper assumes Product.stock is physical stock and Product.reservedStock
 * is the quantity already reserved by unpaid orders.
 */
export async function reserveOrderInventory(
  tx: Prisma.TransactionClient,
  orderId: string,
  reservationMinutes = DEFAULT_RESERVATION_MINUTES,
) {
  const order = await tx.order.findUnique({
    where: { id: orderId },
    include: { items: true },
  });

  if (!order) {
    throw new Error("Order not found.");
  }

  if (order.inventoryStatus === "RESERVED") {
    return order;
  }

  if (order.inventoryStatus === "COMMITTED") {
    throw new Error("Inventory has already been committed for this order.");
  }

  if (order.inventoryStatus === "RELEASED") {
    throw new Error("Inventory reservation has already been released.");
  }

  if (order.status !== "PENDING") {
    throw new Error("Only pending orders can reserve inventory.");
  }

  if (order.items.length === 0) {
    throw new Error("Cannot reserve inventory for an order with no items.");
  }

  // Combine duplicate product lines so stock is checked and reserved once
  // per product.
  const quantities = new Map<string, number>();

  for (const item of order.items) {
    if (!Number.isInteger(item.quantity) || item.quantity <= 0) {
      throw new Error("Invalid product quantity in order.");
    }

    quantities.set(
      item.productId,
      (quantities.get(item.productId) ?? 0) + item.quantity,
    );
  }

  for (const [productId, quantity] of quantities) {
    const result = await tx.$executeRaw`
      UPDATE "Product"
      SET "reservedStock" = "reservedStock" + ${quantity}
      WHERE "id" = ${productId}
        AND "stock" - "reservedStock" >= ${quantity}
    `;

    if (result !== 1) {
      throw new Error(
        `Insufficient available inventory for product ${productId}.`,
      );
    }
  }

  const updated = await tx.order.update({
    where: { id: orderId },
    data: {
      inventoryStatus: "RESERVED",
      reservationExpiresAt: getReservationExpiry(reservationMinutes),
    },
    include: { items: true },
  });

  return updated;
}

/**
 * Commit reserved inventory after Paystack confirms payment.
 *
 * A committed order reduces both physical stock and reservedStock.
 * A previously committed order is returned without deducting stock again.
 */
export async function settlePaidOrder(
  orderId: string,
  payment: PaymentDetails,
) {
  if (!payment.reference?.trim()) {
    throw new Error("A valid payment reference is required.");
  }

  return db.$transaction(
    async (tx) => {
      const order = await tx.order.findUnique({
        where: { id: orderId },
        include: { items: true },
      });

      if (!order) {
        throw new Error("Order not found.");
      }

      if (
        order.paymentReference &&
        order.paymentReference !== payment.reference
      ) {
        throw new Error("Payment reference does not match this order.");
      }

      if (order.inventoryStatus === "RELEASED") {
        throw new Error(
          "Cannot commit inventory because the reservation has been released.",
        );
      }

      if (
        order.status === "PAID" &&
        order.inventoryStatus === "COMMITTED"
      ) {
        return order;
      }

      /*
       * Legacy orders may not have used inventory reservations.
       * We intentionally avoid deducting stock for them here because doing so
       * without knowing their previous inventory handling could double-deduct.
       */
      if (order.inventoryStatus === "NONE") {
        if (order.status === "PAID") {
          return order;
        }

        throw new Error(
          "This order has no inventory reservation. Reconcile its inventory before settling payment.",
        );
      }

      if (order.inventoryStatus !== "RESERVED") {
        throw new Error("Order inventory is not reserved.");
      }

      if (order.status !== "PENDING" && order.status !== "PAID") {
        throw new Error(
          `Cannot settle an order with payment status ${order.status}.`,
        );
      }

      /*
       * Claim the reservation using a conditional update.
       * If another request has already changed its state, this update fails.
       */
      const claim = await tx.order.updateMany({
        where: {
          id: orderId,
          inventoryStatus: "RESERVED",
          status: { in: ["PENDING", "PAID"] },
        },
        data: {
          status: "PAID",
          inventoryStatus: "COMMITTED",
          paymentReference: payment.reference,
          paymentChannel: payment.channel ?? null,
          paidAt: new Date(),
          reservationExpiresAt: null,
        },
      });

      if (claim.count !== 1) {
        const latest = await tx.order.findUnique({
          where: { id: orderId },
          include: { items: true },
        });

        if (
          latest?.status === "PAID" &&
          latest.inventoryStatus === "COMMITTED"
        ) {
          return latest;
        }

        throw new Error(
          "Could not claim the inventory reservation. Please retry safely.",
        );
      }

      // Aggregate duplicate product lines before deducting inventory.
      const quantities = new Map<string, number>();

      for (const item of order.items) {
        quantities.set(
          item.productId,
          (quantities.get(item.productId) ?? 0) + item.quantity,
        );
      }

      for (const [productId, quantity] of quantities) {
        const result = await tx.$executeRaw`
          UPDATE "Product"
          SET
            "stock" = "stock" - ${quantity},
            "reservedStock" = "reservedStock" - ${quantity}
          WHERE "id" = ${productId}
            AND "stock" >= ${quantity}
            AND "reservedStock" >= ${quantity}
        `;

        if (result !== 1) {
          // Throwing rolls back the transaction, including the order update.
          throw new Error(
            `Could not commit inventory for product ${productId}.`,
          );
        }
      }

      const updatedOrder = await tx.order.findUnique({
        where: { id: orderId },
        include: { items: true },
      });

      if (!updatedOrder) {
        throw new Error("Order could not be retrieved after settlement.");
      }

      return updatedOrder;
    },
    {
      maxWait: 20000,
      timeout: 30000,
    },
  );
}

/**
 * Release reserved inventory for an unpaid order.
 *
 * This does not reduce physical stock. It only reduces reservedStock.
 */
export async function releaseOrderReservation(orderId: string) {
  return db.$transaction(
    async (tx) => {
      const order = await tx.order.findUnique({
        where: { id: orderId },
        include: { items: true },
      });

      if (!order) {
        throw new Error("Order not found.");
      }

      if (
        order.status === "PAID" ||
        order.inventoryStatus === "COMMITTED"
      ) {
        throw new Error(
          "Cannot release inventory for an order that has been paid or committed.",
        );
      }

      if (order.inventoryStatus === "RELEASED") {
        return order;
      }

      if (order.inventoryStatus === "NONE") {
        return order;
      }

      if (order.inventoryStatus !== "RESERVED") {
        throw new Error("Order inventory is not reserved.");
      }

      const claim = await tx.order.updateMany({
        where: {
          id: orderId,
          inventoryStatus: "RESERVED",
          status: "PENDING",
        },
        data: {
          status: "FAILED",
          inventoryStatus: "RELEASED",
          reservationExpiresAt: null,
        },
      });

      if (claim.count !== 1) {
        const latest = await tx.order.findUnique({
          where: { id: orderId },
          include: { items: true },
        });

        if (
          latest?.inventoryStatus === "RELEASED" ||
          latest?.inventoryStatus === "NONE"
        ) {
          return latest;
        }

        throw new Error(
          "Could not release this inventory reservation. Check the latest order state.",
        );
      }

      const quantities = new Map<string, number>();

      for (const item of order.items) {
        quantities.set(
          item.productId,
          (quantities.get(item.productId) ?? 0) + item.quantity,
        );
      }

      for (const [productId, quantity] of quantities) {
        const result = await tx.$executeRaw`
          UPDATE "Product"
          SET "reservedStock" = "reservedStock" - ${quantity}
          WHERE "id" = ${productId}
            AND "reservedStock" >= ${quantity}
        `;

        if (result !== 1) {
          throw new Error(
            `Could not release reserved inventory for product ${productId}.`,
          );
        }
      }

      const updatedOrder = await tx.order.findUnique({
        where: { id: orderId },
        include: { items: true },
      });

      if (!updatedOrder) {
        throw new Error("Order could not be retrieved after release.");
      }

      return updatedOrder;
    },
    {
      maxWait: 20000,
      timeout: 30000,
    },
  );
}

/**
 * Verify a Paystack transaction using its reference.
 */
async function verifyPaystackPayment(
  reference: string,
): Promise<PaystackVerificationResponse["data"] | null> {
  if (!PAYSTACK_SECRET_KEY) {
    throw new Error("PAYSTACK_SECRET_KEY is not configured.");
  }

  const response = await fetch(
    `${PAYSTACK_VERIFY_URL}/${encodeURIComponent(reference)}`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
        Accept: "application/json",
      },
      cache: "no-store",
    },
  );

  if (!response.ok) {
    throw new Error(
      `Paystack verification request failed with status ${response.status}.`,
    );
  }

  const result =
    (await response.json()) as PaystackVerificationResponse;

  if (!result.status || !result.data) {
    throw new Error(result.message || "Paystack verification failed.");
  }

  return result.data;
}

/**
 * Reconcile expired reservations.
 *
 * For expired orders with a payment reference, verify the transaction with
 * Paystack before releasing inventory. Successful payments are committed;
 * pending payments keep their reservation; failed or abandoned payments
 * release the reservation.
 */
export async function reconcileExpiredReservations(
  limit = 10,
): Promise<ReconciliationSummary> {
  const safeLimit = Math.min(Math.max(Math.floor(limit), 1), 100);
  const now = new Date();

  const expiredOrders = await db.order.findMany({
    where: {
      inventoryStatus: "RESERVED",
      status: "PENDING",
      reservationExpiresAt: {
        lte: now,
      },
    },
    orderBy: {
      reservationExpiresAt: "asc",
    },
    take: safeLimit,
    select: {
      id: true,
      total: true,
      currency: true,
      paymentReference: true,
    },
  });

  const summary: ReconciliationSummary = {
    scanned: expiredOrders.length,
    released: 0,
    committed: 0,
    stillPending: 0,
    failed: 0,
    results: [],
  };

  for (const order of expiredOrders) {
    try {
      const reference = order.paymentReference;

      /*
       * If no reference exists, there is no Paystack transaction to verify.
       * The reservation can be released.
       */
      if (!reference) {
        await releaseOrderReservation(order.id);

        summary.released += 1;
        summary.results.push({
          orderId: order.id,
          action: "RELEASED",
          message: "Expired order had no payment reference.",
        });

        continue;
      }

      const payment = await verifyPaystackPayment(reference);

      if (!payment) {
        summary.stillPending += 1;
        summary.results.push({
          orderId: order.id,
          action: "PENDING",
          message: "Paystack returned no transaction data.",
        });

        continue;
      }

      if (payment.reference !== reference) {
        throw new Error("Paystack returned a mismatched payment reference.");
      }

      if (
        payment.metadata?.orderId &&
        payment.metadata.orderId !== order.id
      ) {
        throw new Error("Paystack metadata does not match the order.");
      }

      if (
        typeof payment.amount !== "number" ||
        payment.amount !== order.total * 100
      ) {
        throw new Error("Paystack amount does not match the order total.");
      }

      if (
        payment.currency &&
        payment.currency.toUpperCase() !== "NGN"
      ) {
        throw new Error("Paystack currency is not NGN.");
      }

      if (payment.status === "success") {
        await settlePaidOrder(order.id, {
          reference,
          channel: payment.channel ?? null,
        });

        summary.committed += 1;
        summary.results.push({
          orderId: order.id,
          action: "COMMITTED",
          message: "Successful payment verified and inventory committed.",
        });

        continue;
      }

      if (
        payment.status === "failed" ||
        payment.status === "abandoned"
      ) {
        await releaseOrderReservation(order.id);

        summary.released += 1;
        summary.results.push({
          orderId: order.id,
          action: "RELEASED",
          message: `Paystack transaction status: ${payment.status}.`,
        });

        continue;
      }

      // Do not release stock for an ongoing transaction.
      summary.stillPending += 1;
      summary.results.push({
        orderId: order.id,
        action: "PENDING",
        message: `Paystack transaction status: ${payment.status ?? "unknown"}.`,
      });
    } catch (error) {
      summary.failed += 1;
      summary.results.push({
        orderId: order.id,
        action: "FAILED",
        message:
          error instanceof Error
            ? error.message
            : "Unknown reconciliation error.",
      });
    }
  }

  return summary;
}