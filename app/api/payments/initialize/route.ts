import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { releaseOrderReservation } from "@/lib/order-inventory";

type PaymentRequest = {
  orderId: string;
};

export async function POST(request: Request) {
  try {
    const body =
      (await request.json()) as PaymentRequest;

    const { orderId } = body;

    if (!orderId) {
      return NextResponse.json(
        {
          success: false,
          message: "Order ID is required.",
        },
        { status: 400 }
      );
    }

    /*
      Get the current customer session.
      Guest checkout is still supported for
      orders that have no userId.
    */
    const session = await getSession();

    const order = await db.order.findUnique({
      where: {
        id: orderId,
      },
      select: {
        id: true,
        customer: true,
        email: true,
        phone: true,
        total: true,
        status: true,
        userId: true,
        paymentReference: true,
        inventoryStatus: true,
        reservationExpiresAt: true,
      },
    });

    if (!order) {
      return NextResponse.json(
        {
          success: false,
          message: "Order not found.",
        },
        { status: 404 }
      );
    }

    /*
      A logged-in customer may only initialize
      payment for their own order.
    */
    if (
      order.userId &&
      (!session ||
        session.userId !== order.userId)
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "You are not authorized to pay for this order.",
        },
        { status: 403 }
      );
    }

    /*
      Don't pay for an already-paid order.
    */
    if (order.status === "PAID") {
      return NextResponse.json(
        {
          success: false,
          message:
            "This order has already been paid for.",
        },
        { status: 400 }
      );
    }

    /*
      New orders reserve inventory for 30 minutes.
      Do not allow payment after that reservation
      has expired.
    */
    if (
      order.inventoryStatus === "RESERVED"
    ) {
      if (
        !order.reservationExpiresAt
      ) {
        return NextResponse.json(
          {
            success: false,
            message:
              "This order has an invalid inventory reservation. Please place the order again.",
          },
          { status: 400 }
        );
      }

      const now = new Date();

      if (
        order.reservationExpiresAt <= now
      ) {
        /*
          If there is no payment reference, no initialized
          Paystack session has been recorded for this order,
          so this reservation can be released here. If a
          reference exists, leave reconciliation to the
          verification/cron flow so a successful payment is
          not accidentally released.
        */
        if (!order.paymentReference) {
          try {
            await releaseOrderReservation(
              order.id
            );
          } catch (releaseError) {
            console.error(
              "Failed to release expired reservation:",
              releaseError
            );
          }
        }

        return NextResponse.json(
          {
            success: false,
            message:
              "Your order reservation has expired. Please place the order again.",
          },
          { status: 400 }
        );
      }
    }

    /*
      A previously released/failed order
      should not be paid again.
    */
    if (
      order.inventoryStatus ===
        "RELEASED" ||
      order.status === "FAILED"
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "This order is no longer available for payment. Please place a new order.",
        },
        { status: 400 }
      );
    }

    const secretKey =
      process.env.PAYSTACK_SECRET_KEY;

    if (!secretKey) {
      console.error(
        "PAYSTACK_SECRET_KEY is missing."
      );

      return NextResponse.json(
        {
          success: false,
          message:
            "Payment service is not configured.",
        },
        { status: 500 }
      );
    }

    const siteUrl =
      process.env.SITE_URL ||
      "http://localhost:3001";

    /*
      Paystack uses kobo.
      ₦10,000 = 1,000,000 kobo.
    */
    const amountInKobo =
      order.total * 100;

    /*
      Create a unique Paystack reference.
    */
    const reference =
      `SIMPLYIRE-${order.id}-${Date.now()}`;

    const paystackResponse =
      await fetch(
        "https://api.paystack.co/transaction/initialize",
        {
          method: "POST",

          headers: {
            Authorization:
              `Bearer ${secretKey}`,
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            email: order.email,
            amount: String(
              amountInKobo
            ),
            currency: "NGN",
            reference,

            callback_url:
              `${siteUrl}/payment/callback`,

            metadata: {
              orderId: order.id,
              customer:
                order.customer,
              phone: order.phone,
              inventoryStatus:
                order.inventoryStatus,
            },
          }),
        }
      );

    const paystackData =
      await paystackResponse.json();

    if (
      !paystackResponse.ok ||
      !paystackData.status
    ) {
      console.error(
        "Paystack initialization failed:",
        paystackData
      );

      return NextResponse.json(
        {
          success: false,
          message:
            paystackData.message ||
            "Unable to initialize payment.",
        },
        { status: 400 }
      );
    }

    if (
      !paystackData.data?.reference ||
      !paystackData.data?.authorization_url ||
      !paystackData.data?.access_code
    ) {
      console.error(
        "Paystack returned an incomplete initialization response."
      );

      return NextResponse.json(
        {
          success: false,
          message:
            "The payment provider returned an incomplete response. Please try again.",
        },
        { status: 502 }
      );
    }

    /*
      Store the payment reference only while the order
      is still eligible for payment. A reservation can
      expire while the Paystack initialize request is in
      flight; don't send the customer to a payment session
      if inventory has already been released.
    */
    if (order.inventoryStatus === "RESERVED") {
      const attached = await db.order.updateMany({
        where: {
          id: order.id,
          status: "PENDING",
          inventoryStatus: "RESERVED",
          reservationExpiresAt: {
            gt: new Date(),
          },
        },
        data: {
          paymentReference:
            paystackData.data.reference,
        },
      });

      if (attached.count !== 1) {
        console.warn(
          "Payment session was initialized after the order reservation became unavailable:",
          order.id
        );

        return NextResponse.json(
          {
            success: false,
            message:
              "Your inventory reservation expired while payment was being prepared. Please place a new order.",
          },
          { status: 409 }
        );
      }
    } else {
      // Compatibility for older orders created before reservations existed.
      const attached = await db.order.updateMany({
        where: {
          id: order.id,
          status: "PENDING",
          inventoryStatus: "NONE",
        },
        data: {
          paymentReference:
            paystackData.data.reference,
        },
      });

      if (attached.count !== 1) {
        return NextResponse.json(
          {
            success: false,
            message:
              "This order is no longer available for payment. Please place a new order.",
          },
          { status: 409 }
        );
      }
    }

    return NextResponse.json({
      success: true,

      message:
        "Payment initialized successfully.",

      payment: {
        authorizationUrl:
          paystackData.data
            .authorization_url,

        accessCode:
          paystackData.data
            .access_code,

        reference:
          paystackData.data.reference,
      },

      order: {
        id: order.id,
        total: order.total,
        inventoryStatus:
          order.inventoryStatus,
        reservationExpiresAt:
          order.reservationExpiresAt,
      },
    });
  } catch (error) {
    console.error(
      "Payment initialization error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Unable to initialize payment.",
      },
      { status: 500 }
    );
  }
}