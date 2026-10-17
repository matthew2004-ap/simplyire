import { NextRequest, NextResponse } from "next/server";

import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";

const PAYSTACK_INITIALIZE_URL =
  "https://api.paystack.co/transaction/initialize";

function getSiteUrl() {
  const siteUrl = process.env.SITE_URL;

  if (!siteUrl) {
    throw new Error("SITE_URL is not configured.");
  }

  return siteUrl.replace(/\/+$/, "");
}

export async function POST(request: NextRequest) {
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

    const body = await request.json().catch(() => null);
    const orderId = body?.orderId;

    if (
      typeof orderId !== "string" ||
      !orderId.trim()
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "A valid order ID is required.",
        },
        { status: 400 },
      );
    }

    const session = await getSession();

    const order = await db.order.findUnique({
      where: {
        id: orderId,
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

    // If the order belongs to an account, verify ownership.
    if (
      order.userId &&
      (!session || session.userId !== order.userId)
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "You are not authorized to pay for this order.",
        },
        { status: 403 },
      );
    }

    if (order.status === "PAID") {
      return NextResponse.json(
        {
          success: false,
          message: "This order has already been paid for.",
        },
        { status: 409 },
      );
    }

    if (
      order.status !== "PENDING" ||
      order.inventoryStatus === "RELEASED"
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "This order is no longer available for payment. Please create a new order.",
        },
        { status: 409 },
      );
    }

    // A reserved order must still have an active reservation.
    if (
      order.inventoryStatus === "RESERVED" &&
      order.reservationExpiresAt &&
      order.reservationExpiresAt.getTime() <= Date.now()
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Your order reservation has expired. Please create a new order.",
        },
        { status: 409 },
      );
    }

    if (
      !Number.isSafeInteger(order.total) ||
      order.total <= 0
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "The order total is invalid.",
        },
        { status: 400 },
      );
    }

    if (!order.email?.trim()) {
      return NextResponse.json(
        {
          success: false,
          message: "The order must have a valid email address.",
        },
        { status: 400 },
      );
    }

    /*
     * Do not initialize a second Paystack transaction while the order
     * already has a payment reference.
     *
     * This prevents accidentally attaching multiple payment attempts
     * to the same order. A separate retry flow can be added later.
     */
    if (order.paymentReference) {
      return NextResponse.json(
        {
          success: false,
          message:
            "A payment attempt already exists for this order. Please verify its status before trying again.",
          reference: order.paymentReference,
        },
        { status: 409 },
      );
    }

    const reference =
      `SIMPLYIRE-${order.id}-${Date.now()}`;

    const siteUrl = getSiteUrl();

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
          email: order.email.trim(),
          amount: order.total * 100,
          currency: "NGN",
          reference,
          callback_url: `${siteUrl}/payment/callback`,
          metadata: {
            orderId: order.id,
            customer: order.customer,
            phone: order.phone,
            inventoryStatus: order.inventoryStatus,
          },
        }),
        cache: "no-store",
      },
    );

    const result = await paystackResponse
      .json()
      .catch(() => null);

    if (
      !paystackResponse.ok ||
      !result?.status ||
      !result?.data?.authorization_url
    ) {
      console.error(
        "Paystack initialization failed:",
        result,
      );

      return NextResponse.json(
        {
          success: false,
          message:
            result?.message ||
            "Unable to initialize payment. Please try again.",
        },
        { status: 502 },
      );
    }

    /*
     * Save the reference only if the order is still pending and
     * does not already have another payment reference.
     *
     * This conditional update protects against concurrent requests.
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
      return NextResponse.json(
        {
          success: false,
          message:
            "The order changed while payment was being initialized. Please check the order status before continuing.",
        },
        { status: 409 },
      );
    }

    return NextResponse.json({
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

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "An unexpected payment error occurred.",
      },
      { status: 500 },
    );
  }
}