import { db } from "@/lib/db";
import {
  releaseOrderReservation,
  settlePaidOrder,
} from "@/lib/order-inventory";

type SweepResult = {
  orderId: string;
  action: string;
};

/**
 * Reconcile reservations whose 30-minute window has expired.
 * Always query Paystack before releasing a reservation with a transaction reference.
 */
export async function processExpiredReservations(limit = 50) {
  const now = new Date();
  const expiredOrders = await db.order.findMany({
    where: {
      inventoryStatus: "RESERVED",
      reservationExpiresAt: { not: null, lte: now },
    },
    orderBy: { reservationExpiresAt: "asc" },
    take: Math.max(1, Math.min(Math.trunc(limit), 100)),
    select: {
      id: true,
      status: true,
      total: true,
      paymentReference: true,
    },
  });

  let released = 0;
  let committed = 0;
  let stillPending = 0;
  let failed = 0;
  const results: SweepResult[] = [];
  const paystackSecret = process.env.PAYSTACK_SECRET_KEY;

  for (const order of expiredOrders) {
    try {
      if (!order.paymentReference) {
        await releaseOrderReservation(order.id);
        released++;
        results.push({ orderId: order.id, action: "RELEASED_NO_PAYMENT_REFERENCE" });
        continue;
      }

      if (!paystackSecret) {
        throw new Error("PAYSTACK_SECRET_KEY is not configured.");
      }

      const response = await fetch(
        `https://api.paystack.co/transaction/verify/${encodeURIComponent(order.paymentReference)}`,
        {
          method: "GET",
          headers: { Authorization: `Bearer ${paystackSecret}` },
          cache: "no-store",
        }
      );
      const payload = await response.json();

      if (!response.ok || !payload.status || !payload.data) {
        throw new Error(payload.message || "Unable to verify Paystack transaction.");
      }

      const transaction = payload.data;
      const reference = String(transaction.reference ?? "");
      if (reference !== order.paymentReference) {
        throw new Error("Paystack transaction reference mismatch.");
      }
      if (transaction.currency && transaction.currency !== "NGN") {
        throw new Error("Paystack currency does not match NGN.");
      }
      if (Number(transaction.amount) !== order.total * 100) {
        throw new Error("Paystack amount does not match the order total.");
      }
      if (String(transaction.metadata?.orderId ?? "") !== order.id) {
        throw new Error("Paystack metadata does not match the order.");
      }

      if (transaction.status === "success") {
        const paidOrder = await settlePaidOrder(order.id, {
          reference,
          channel: transaction.channel,
          paidAt: transaction.paid_at,
        });
        if (paidOrder.status === "PAID" && paidOrder.inventoryStatus === "COMMITTED") {
          committed++;
          results.push({ orderId: order.id, action: "PAYMENT_FOUND_AND_INVENTORY_COMMITTED" });
        } else {
          stillPending++;
          results.push({ orderId: order.id, action: "PAYMENT_RECONCILED" });
        }
        continue;
      }

      if (transaction.status === "failed" || transaction.status === "abandoned") {
        await releaseOrderReservation(order.id);
        released++;
        results.push({ orderId: order.id, action: "RELEASED_FAILED_PAYMENT" });
        continue;
      }

      // Keep reservations for payment states that may still complete.
      stillPending++;
      results.push({ orderId: order.id, action: `STILL_${String(transaction.status ?? "UNKNOWN").toUpperCase()}` });
    } catch (error) {
      failed++;
      console.error(`Expired reservation processing failed for order ${order.id}:`, error);
      results.push({ orderId: order.id, action: "ERROR" });
    }
  }

  return {
    success: true as const,
    message: "Expired reservation sweep completed.",
    summary: {
      scanned: expiredOrders.length,
      released,
      committed,
      stillPending,
      failed,
    },
    results,
  };
}

// On-demand sweeps help keep reservations fresh even on hosting plans
// that only permit daily scheduled jobs. Each warm runtime sweeps at most
// once every two minutes; the protected cron route can always force a sweep.
let lastOpportunisticSweepAt = 0;

export async function maybeProcessExpiredReservations(limit = 5) {
  const now = Date.now();
  if (now - lastOpportunisticSweepAt < 2 * 60 * 1000) return;
  lastOpportunisticSweepAt = now;

  try {
    await processExpiredReservations(limit);
  } catch (error) {
    console.error("Opportunistic reservation sweep failed:", error);
  }
}
