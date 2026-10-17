import { NextRequest, NextResponse } from "next/server";

import { db } from "@/lib/db";
import { settlePaidOrder } from "@/lib/order-inventory";

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

export async function GET(request: NextRequest) {
  try {
    const secretKey = process.env.PAYSTACK_SECRET_KEY;

    if (!secretKey) {
      return NextResponse.json(
        {
          success: false,
          message: "Payment service is not configured.",
        },
        { status: 500 },
      );
    }

    const reference = request.nextUrl.searchParams
      .get("reference")
      ?.trim();

    if (!reference) {
      return NextResponse.json(
        {
          success: false,
          message: "Payment reference is required.",
        },
        { status: 400 },
      );
    }

    const response = await fetch(
      `${PAYSTACK_VERIFY_URL}/${encodeURIComponent(reference)}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${secretKey}`,
          Accept: "application/json",
        },
        cache: "no-store",
      },
    );

    const result =
      (await response.json().catch(() => null)) as
        | PaystackVerification
        | null;

    if (
      !response.ok ||
      !result?.status ||
      !result.data
    ) {
      console.error(
        "Paystack verification request failed:",
        result,
      );

      return NextResponse.json(
        {
          success: false,
          message:
            result?.message ||
            "Unable to verify payment with Paystack.",
        },
        { status: 502 },
      );
    }

    const payment = result.data;

    // Confirm that Paystack returned the requested reference.
    if (payment.reference !== reference) {
      return NextResponse.json(
        {
          success: false,
          message: "Payment reference does not match.",
        },
        { status: 400 },
      );
    }

    if (!payment.metadata?.orderId) {
      return NextResponse.json(
        {
          success: false,
          message:
            "The payment response does not contain an order ID.",
        },
        { status: 400 },
      );
    }

    const order = await db.order.findUnique({
      where: {
        id: payment.metadata.orderId,
      },
    });

    if (!order) {
      return NextResponse.json(
        {
          success: false,
          message: "Order not found.",
        },
        { status: 404 },
      );
    }

    /*
     * Match the verified reference against the reference stored
     * on this order. Do not accept another order's transaction.
     */
    if (order.paymentReference !== reference) {
      return NextResponse.json(
        {
          success: false,
          message:
            "The payment reference does not match this order.",
        },
        { status: 400 },
      );
    }

    if (
      payment.metadata.orderId !== order.id
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Payment metadata does not match the order.",
        },
        { status: 400 },
      );
    }

    // Paystack amounts are expressed in kobo for NGN transactions.
    if (
      typeof payment.amount !== "number" ||
      payment.amount !== order.total * 100
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "The verified payment amount does not match the order total.",
        },
        { status: 400 },
      );
    }

    if (
      !payment.currency ||
      payment.currency.toUpperCase() !== "NGN"
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "The payment currency does not match NGN.",
        },
        { status: 400 },
      );
    }

    /*
     * Only Paystack's verified "success" status can mark the
     * order as paid.
     */
    if (payment.status !== "success") {
      return NextResponse.json({
        success: true,
        paid: false,
        status: payment.status ?? "unknown",
        message: "Payment has not been confirmed.",
        reference,
        orderId: order.id,
      });
    }

    /*
     * The order inventory helper commits stock transactionally
     * and avoids deducting inventory twice for an already-paid order.
     */
    await settlePaidOrder(order.id, {
      reference,
      channel: payment.channel ?? null,
      paidAt: payment.paid_at ?? null,
    });

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

    return NextResponse.json({
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

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "An unexpected verification error occurred.",
      },
      { status: 500 },
    );
  }
}