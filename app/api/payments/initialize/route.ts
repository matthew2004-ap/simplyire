import { NextRequest, NextResponse } from "next/server";

import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PAYSTACK_INITIALIZE_URL =
  "https://api.paystack.co/transaction/initialize";

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

function getSiteUrl(): string {
  const configuredUrl = process.env.SITE_URL?.trim();

  if (!configuredUrl) {
    throw new Error("SITE_URL is not configured.");
  }

  let parsedUrl: URL;

  try {
    parsedUrl = new URL(configuredUrl);
  } catch {
    throw new Error(
      "SITE_URL must be a valid absolute URL.",
    );
  }

  if (
    parsedUrl.protocol !== "https:" &&
    parsedUrl.hostname !== "localhost"
  ) {
    throw new Error(
      "SITE_URL must use HTTPS in production.",
    );
  }

  return parsedUrl.origin;
}

export async function POST(request: NextRequest) {
  try {
    const secretKey = process.env.PAYSTACK_SECRET_KEY;

    if (!secretKey) {
      console.error(
        "PAYSTACK_SECRET_KEY is not configured.",
      );

      return jsonResponse(
        {
          success: false,
          message:
            "The payment service is temporarily unavailable.",
        },
        500,
      );
    }

    let body: { orderId?: unknown };

    try {
      body = await request.json();
    } catch {
      return jsonResponse(
        {
          success: false,
          message: "Invalid request body.",
        },
        400,
      );
    }

    const orderId = body.orderId;

    if (
      typeof orderId !== "string" ||
      !orderId.trim()
    ) {
      return jsonResponse(
        {
          success: false,
          message: "A valid order ID is required.",
        },
        400,
      );
    }

    const session = await getSession();

    const order = await db.order.findUnique({
      where: {
        id: orderId.trim(),
      },
    });

    if (!order) {
      return jsonResponse(
        {
          success: false,
          message: "Order not found.",
        },
        404,
      );
    }

    /*
     * Authenticated orders can only be paid by their owner.
     * Guest orders remain payable through the checkout flow.
     */
    if (
      order.userId &&
      (!session || session.userId !== order.userId)
    ) {
      return jsonResponse(
        {
          success: false,
          message:
            "You are not authorized to pay for this order.",
        },
        403,
      );
    }

    if (
      order.status === "PAID" &&
      order.inventoryStatus === "COMMITTED"
    ) {
      return jsonResponse(
        {
          success: false,
          paid: true,
          message:
            "This order has already been paid for.",
          orderId: order.id,
        },
        409,
      );
    }

    if (
      order.status !== "PENDING" ||
      order.inventoryStatus === "RELEASED" ||
      order.inventoryStatus === "COMMITTED"
    ) {
      return jsonResponse(
        {
          success: false,
          message:
            "This order is no longer available for payment. Please contact support if you believe this is incorrect.",
        },
        409,
      );
    }

    /*
     * Check the reservation before contacting Paystack.
     */
    if (
      order.inventoryStatus === "RESERVED" &&
      (
        !order.reservationExpiresAt ||
        order.reservationExpiresAt.getTime() <= Date.now()
      )
    ) {
      return jsonResponse(
        {
          success: false,
          message:
            "Your order reservation has expired. Please contact support before creating another order.",
        },
        409,
      );
    }

    if (
      order.inventoryStatus !== "RESERVED" &&
      order.inventoryStatus !== "NONE"
    ) {
      return jsonResponse(
        {
          success: false,
          message:
            "The order inventory state is invalid for payment.",
        },
        409,
      );
    }

    if (
      !Number.isSafeInteger(order.total) ||
      order.total <= 0 ||
      order.total > Math.floor(Number.MAX_SAFE_INTEGER / 100)
    ) {
      return jsonResponse(
        {
          success: false,
          message: "The order total is invalid.",
        },
        400,
      );
    }

    const email = order.email?.trim().toLowerCase();

    if (
      !email ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    ) {
      return jsonResponse(
        {
          success: false,
          message:
            "The order must have a valid email address.",
        },
        400,
      );
    }

    /*
     * Do not create a second transaction for an order that already
     * has a reference. The old reference must be reconciled first.
     *
     * This avoids creating an untracked payment that could later
     * succeed after another transaction has been initialized.
     */
    if (order.paymentReference) {
      return jsonResponse(
        {
          success: false,
          paid: false,
          message:
            "A payment attempt already exists for this order. Please retry payment verification or contact support before attempting another payment.",
          reference: order.paymentReference,
          orderId: order.id,
        },
        409,
      );
    }

    const siteUrl = getSiteUrl();

    /*
     * Create a unique reference for this payment attempt.
     */
    const reference =
      `SIMPLYIRE-${order.id}-${crypto.randomUUID()}`;

    const paystackResponse = await fetch(
      PAYSTACK_INITIALIZE_URL,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${secretKey}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          email,
          amount: order.total * 100,
          currency: "NGN",
          reference,
          callback_url: `${siteUrl}/payment/callback`,
          metadata: {
            orderId: order.id,
            customer: order.customer,
            phone: order.phone,
          },
        }),
        cache: "no-store",
        signal: AbortSignal.timeout(15000),
      },
    );

    const result = await paystackResponse
      .json()
      .catch(() => null);

    if (
      !paystackResponse.ok ||
      result?.status !== true ||
      typeof result?.data?.authorization_url !== "string" ||
      !result.data.authorization_url.startsWith("https://")
    ) {
      console.error(
        "Paystack initialization failed:",
        {
          httpStatus: paystackResponse.status,
          message: result?.message,
        },
      );

      return jsonResponse(
        {
          success: false,
          message:
            "We could not initialize your payment. Please retry verification or contact support if a transaction may already have been created.",
        },
        502,
      );
    }

    /*
     * Save the reference only if the order is still eligible
     * and no other request has claimed a payment reference.
     */
    const updated = await db.order.updateMany({
      where: {
        id: order.id,
        status: "PENDING",
        paymentReference: null,
        OR: [
          {
            inventoryStatus: "NONE",
          },
          {
            inventoryStatus: "RESERVED",
            reservationExpiresAt: {
              gt: new Date(),
            },
          },
        ],
      },
      data: {
        paymentReference: reference,
      },
    });

    if (updated.count !== 1) {
      /*
       * Paystack may already have created the transaction.
       * Do not return its checkout URL unless its reference
       * has been saved against the correct order.
       */
      console.error(
        "Could not associate the Paystack reference with the order.",
        {
          orderId: order.id,
          reference,
        },
      );

      return jsonResponse(
        {
          success: false,
          message:
            "We could not safely attach this payment to your order. Please contact support before attempting another payment.",
        },
        409,
      );
    }

    /*
     * The checkout page expects authorizationUrl at the top level.
     */
    return jsonResponse({
      success: true,
      message: "Payment initialized successfully.",
      authorizationUrl:
        result.data.authorization_url,
      accessCode: result.data.access_code,
      reference,
    });
  } catch (error) {
    console.error(
      "Payment initialization error:",
      error,
    );

    const timedOut =
      error instanceof Error &&
      error.name === "TimeoutError";

    return jsonResponse(
      {
        success: false,
        message: timedOut
          ? "The payment request timed out. Check the order's payment status before trying again."
          : "We could not initialize your payment. Please try again or contact support.",
      },
      timedOut ? 504 : 500,
    );
  }
}