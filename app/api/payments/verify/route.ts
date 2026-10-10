import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  releaseOrderReservation,
  settlePaidOrder,
} from "@/lib/order-inventory";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    const reference = searchParams.get("reference");

    if (!reference) {
      return NextResponse.json(
        {
          success: false,
          message: "Payment reference is required.",
        },
        { status: 400 }
      );
    }

    const secretKey =
      process.env.PAYSTACK_SECRET_KEY;

    if (!secretKey) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Payment service is not configured.",
        },
        { status: 500 }
      );
    }

    /*
      Ask Paystack for the actual transaction.
      The transaction status is in data.status.
    */
    const response = await fetch(
      `https://api.paystack.co/transaction/verify/${encodeURIComponent(
        reference
      )}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${secretKey}`,
        },
        cache: "no-store",
      }
    );

    const data = await response.json();

    if (!response.ok || !data.status) {
      return NextResponse.json(
        {
          success: false,
          message:
            data.message ||
            "Payment verification failed.",
        },
        { status: 400 }
      );
    }

    const transaction = data.data;

    if (!transaction) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Paystack returned an invalid transaction response.",
        },
        { status: 400 }
      );
    }

    /*
      Get the order ID from the metadata created
      during Paystack initialization.
    */
    if (String(transaction.reference ?? "") !== reference) {
      return NextResponse.json(
        { success: false, message: "Verified transaction reference does not match the requested reference." },
        { status: 400 }
      );
    }

    const metadataOrderId =
      transaction.metadata?.orderId;

    if (!metadataOrderId) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Payment is valid, but the order could not be identified.",
        },
        { status: 400 }
      );
    }

    /*
      Find our order.
    */
    const order = await db.order.findUnique({
      where: {
        id: String(metadataOrderId),
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
      Confirm that the reference returned by Paystack
      belongs to this order.

      New orders have paymentReference saved during
      Paystack initialization.

      Legacy orders may not have one, so we also
      accept our SIMPLYIRE-{orderId}-{timestamp}
      reference pattern for compatibility.
    */
    const expectedPrefix =
      `SIMPLYIRE-${order.id}-`;

    if (
      order.paymentReference &&
      order.paymentReference !==
        transaction.reference
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Payment reference does not match the order.",
        },
        { status: 400 }
      );
    }

    if (
      !order.paymentReference &&
      !String(
        transaction.reference
      ).startsWith(expectedPrefix)
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Payment reference does not match the order.",
        },
        { status: 400 }
      );
    }

    /*
      Extra metadata protection.
      Make sure Paystack's metadata orderId
      actually points to this order.
    */
    if (
      String(metadataOrderId) !== order.id
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Payment metadata does not match the order.",
        },
        { status: 400 }
      );
    }

    /*
      Check the currency.
    */
    if (
      transaction.currency &&
      transaction.currency !== "NGN"
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Payment currency does not match the order.",
        },
        { status: 400 }
      );
    }

    /*
      Paystack amounts are expressed in kobo.
    */
    const expectedAmount =
      order.total * 100;

    if (
      Number(transaction.amount) !==
      expectedAmount
    ) {
      console.error(
        "Payment amount mismatch:",
        {
          orderTotal: expectedAmount,
          paystackAmount:
            transaction.amount,
          orderId: order.id,
          reference:
            transaction.reference,
        }
      );

      return NextResponse.json(
        {
          success: false,
          message:
            "Payment amount does not match the order.",
        },
        { status: 400 }
      );
    }

    /*
      Handle unsuccessful payment attempts.

      failed / abandoned:
      release reserved inventory.

      pending / ongoing / processing / queued:
      keep the reservation because the payment
      may still complete.
    */
    if (
      transaction.status === "failed" ||
      transaction.status === "abandoned"
    ) {
      if (
        order.status !== "PAID" &&
        order.inventoryStatus === "RESERVED"
      ) {
        try {
          await releaseOrderReservation(
            order.id
          );
        } catch (releaseError) {
          console.error(
            "Failed to release order reservation:",
            releaseError
          );

          return NextResponse.json(
            {
              success: false,
              message:
                "Payment failed, but the inventory reservation could not be released automatically.",
            },
            { status: 500 }
          );
        }
      }

      return NextResponse.json(
        {
          success: false,
          paid: false,
          status:
            transaction.status,
          message:
            "Payment was not completed. Your reserved stock has been released.",
        },
        { status: 400 }
      );
    }

    /*
      For every state other than success, don't mark
      the order as paid.

      Paystack can return states such as:
      pending, ongoing, processing, queued, reversed.
    */
    if (
      transaction.status !== "success"
    ) {
      return NextResponse.json(
        {
          success: false,
          paid: false,
          status:
            transaction.status,
          message:
            "Payment has not been completed yet.",
        },
        { status: 400 }
      );
    }

    /*
      Payment is genuinely successful.

      IMPORTANT:
      Do not update the order directly here.

      settlePaidOrder() commits reserved inventory
      and marks the order as PAID in one transaction.
    */
    const paidOrder =
      await settlePaidOrder(
        order.id,
        {
          reference:
            transaction.reference,
          channel:
            transaction.channel,
          paidAt:
            transaction.paid_at,
        }
      );

    return NextResponse.json({
      success: true,
      paid: true,

      message:
        "Payment verified successfully.",

      order: {
        id: paidOrder.id,
        total: paidOrder.total,
        status: paidOrder.status,
        fulfillmentStatus:
          paidOrder.fulfillmentStatus,
        inventoryStatus:
          paidOrder.inventoryStatus,
      },

      payment: {
        reference:
          transaction.reference,
        amount:
          transaction.amount,
        channel:
          transaction.channel,
        paidAt:
          transaction.paid_at,
      },
    });
  } catch (error) {
    console.error(
      "Payment verification error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Payment verification failed.",
      },
      { status: 500 }
    );
  }
}