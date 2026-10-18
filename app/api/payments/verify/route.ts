import { NextRequest, NextResponse } from "next/server";

import { db } from "@/lib/db";
import { settlePaidOrder } from "@/lib/order-inventory";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PAYSTACK_VERIFY_URL =
  "https://api.paystack.co/transaction/verify";

type PaystackVerification = {
  status?: boolean;
  message?: string;
  data?: {
    status?: string;
    reference?: string;
    amount?: number;
    currency?: string;
    paid_at?: string | null;
    channel?: string | null;
    metadata?: {
      orderId?: string;
      [key: string]: unknown;
    } | null;
  };
};

function jsonResponse(
  body: Record<string, unknown>,
  status = 200,
) {
  return NextResponse.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store, max-age=0",
    },
  });
}

export async function GET(request: NextRequest) {
  try {
    const secretKey = process.env.PAYSTACK_SECRET_KEY;

    if (!secretKey) {
      console.error(
        "PAYSTACK_SECRET_KEY is not configured.",
      );

      return jsonResponse(
        {
          success: false,
          paid: false,
          message:
            "The payment service is temporarily unavailable.",
        },
        500,
      );
    }

    const reference = request.nextUrl.searchParams
      .get("reference")
      ?.trim();

    if (!reference) {
      return jsonResponse(
        {
          success: false,
          paid: false,
          message: "Payment reference is required.",
        },
        400,
      );
    }

    /*
     * STEP 1:
     * Verify the transaction directly with Paystack.
     */
    const response = await fetch(
      `${PAYSTACK_VERIFY_URL}/${encodeURIComponent(
        reference,
      )}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${secretKey}`,
          Accept: "application/json",
        },
        cache: "no-store",
        signal: AbortSignal.timeout(15000),
      },
    );

    const result =
      (await response
        .json()
        .catch(() => null)) as
        | PaystackVerification
        | null;

    if (
      !response.ok ||
      result?.status !== true ||
      !result.data
    ) {
      console.error(
        "Paystack verification request failed:",
        {
          httpStatus: response.status,
          message: result?.message,
        },
      );

      return jsonResponse(
        {
          success: false,
          paid: false,
          message:
            "We could not verify your payment right now. Please try verification again.",
        },
        502,
      );
    }

    const payment = result.data;

    /*
     * STEP 2:
     * Verify that Paystack returned the exact reference
     * supplied by the customer.
     */
    if (payment.reference !== reference) {
      return jsonResponse(
        {
          success: false,
          paid: false,
          message:
            "The payment reference does not match.",
        },
        400,
      );
    }

    /*
     * STEP 3:
     * Find the order linked to this transaction.
     */
    const orderId = payment.metadata?.orderId;

    if (!orderId) {
      return jsonResponse(
        {
          success: false,
          paid: false,
          message:
            "The transaction is not linked to an order.",
        },
        400,
      );
    }

    const order = await db.order.findUnique({
      where: {
        id: orderId,
      },
    });

    if (!order) {
      return jsonResponse(
        {
          success: false,
          paid: false,
          message: "The order could not be found.",
        },
        404,
      );
    }

    /*
     * STEP 4:
     * Confirm that this reference belongs to this order.
     */
    if (order.paymentReference !== reference) {
      return jsonResponse(
        {
          success: false,
          paid: false,
          message:
            "The payment reference does not match the order.",
        },
        400,
      );
    }

    if (payment.metadata?.orderId !== order.id) {
      return jsonResponse(
        {
          success: false,
          paid: false,
          message:
            "The transaction metadata does not match the order.",
        },
        400,
      );
    }

    /*
     * STEP 5:
     * Validate the transaction amount.
     *
     * Paystack expects amounts in kobo for NGN.
     */
    if (
      typeof payment.amount !== "number" ||
      payment.amount !== order.total * 100
    ) {
      return jsonResponse(
        {
          success: false,
          paid: false,
          message:
            "The verified payment amount does not match the order total.",
        },
        400,
      );
    }

    /*
     * STEP 6:
     * Validate the currency.
     */
    if (
      typeof payment.currency !== "string" ||
      !payment.currency.trim()
    ) {
      return jsonResponse(
        {
          success: false,
          paid: false,
          message:
            "The payment currency is missing.",
        },
        400,
      );
    }

    /*
     * STEP 7:
     * Do not mark pending, failed, or abandoned transactions
     * as paid.
     *
     * The callback can retry while Paystack processes payment.
     */
    if (payment.status !== "success") {
      return jsonResponse({
        success: true,
        paid: false,
        status: payment.status ?? "unknown",
        message:
          payment.status === "failed" ||
          payment.status === "abandoned"
            ? "Paystack has not confirmed a successful payment. Please check your transaction before trying again."
            : "Your payment is still being processed. Please retry verification shortly.",
        reference,
        orderId: order.id,
      });
    }

    /*
     * STEP 8:
     * Settle inventory only after successful verification.
     *
     * The inventory helper also checks whether the order
     * has already been committed.
     */
    await settlePaidOrder(order.id, {
      reference,
      channel: payment.channel ?? null,
      paidAt: payment.paid_at ?? null,
    });

    /*
     * STEP 9:
     * Read the order again to confirm the final state.
     */
    const updatedOrder = await db.order.findUnique({
      where: {
        id: order.id,
      },
      select: {
        id: true,
        status: true,
        fulfillmentStatus: true,
        inventoryStatus: true,
        paymentReference: true,
        paymentChannel: true,
        paidAt: true,
        total: true,
      },
    });

    if (
      !updatedOrder ||
      updatedOrder.status !== "PAID"
    ) {
      console.error(
        "Payment was verified, but the order is not marked as paid.",
        {
          orderId: order.id,
          reference,
        },
      );

      return jsonResponse(
        {
          success: false,
          paid: false,
          message:
            "Your payment was verified, but order confirmation is still processing. Please retry verification.",
          reference,
          orderId: order.id,
        },
        503,
      );
    }

    /*
     * STEP 10:
     * Return the response expected by the callback page.
     */
    return jsonResponse({
      success: true,
      paid: true,
      message: "Payment verified successfully.",
      reference,
      order: updatedOrder,
    });
  } catch (error) {
    console.error(
      "Payment verification error:",
      error,
    );

    const timedOut =
      error instanceof Error &&
      error.name === "TimeoutError";

    return jsonResponse(
      {
        success: false,
        paid: false,
        message: timedOut
          ? "Payment verification timed out. Please retry verification."
          : "We could not complete payment verification. Please retry shortly.",
      },
      timedOut ? 504 : 500,
    );
  }
}