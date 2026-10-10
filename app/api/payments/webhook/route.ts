import { NextResponse } from "next/server";
import crypto from "crypto";
import { db } from "@/lib/db";
import { settlePaidOrder } from "@/lib/order-inventory";

export async function POST(request: Request) {
  try {
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

    /*
      Read the raw request body.
      Paystack's signature is generated from
      the raw payload using HMAC SHA512.
    */
    const body = await request.text();

    const signature =
      request.headers.get(
        "x-paystack-signature"
      );

    if (!signature) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Missing Paystack signature.",
        },
        { status: 401 }
      );
    }

    const expectedHash =
      crypto
        .createHmac(
          "sha512",
          secretKey
        )
        .update(body)
        .digest("hex");

    /*
      Use a timing-safe comparison.
    */
    const receivedBuffer =
      Buffer.from(
        signature,
        "utf8"
      );

    const expectedBuffer =
      Buffer.from(
        expectedHash,
        "utf8"
      );

    if (
      receivedBuffer.length !==
        expectedBuffer.length ||
      !crypto.timingSafeEqual(
        receivedBuffer,
        expectedBuffer
      )
    ) {
      console.error(
        "Invalid Paystack webhook signature."
      );

      return NextResponse.json(
        {
          success: false,
          message:
            "Invalid signature.",
        },
        { status: 401 }
      );
    }

    let event: any;

    try {
      event = JSON.parse(body);
    } catch {
      return NextResponse.json(
        {
          success: false,
          message:
            "Invalid webhook payload.",
        },
        { status: 400 }
      );
    }

    console.log(
      "Paystack webhook event:",
      event?.event
    );

    /*
      We only process successful charges here.
      Other Paystack events are acknowledged.
    */
    if (
      event?.event !==
      "charge.success"
    ) {
      return NextResponse.json({
        success: true,
        message:
          "Event received.",
      });
    }

    const transaction =
      event?.data;

    if (!transaction) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Transaction data is missing.",
        },
        { status: 400 }
      );
    }

    /*
      charge.success should contain a successful
      transaction, but verify it again.
    */
    if (
      transaction.status !==
      "success"
    ) {
      return NextResponse.json({
        success: true,
        message:
          "Payment is not successful.",
      });
    }

    const reference =
      String(
        transaction.reference || ""
      );

    if (!reference) {
      console.error(
        "Paystack webhook has no reference."
      );

      return NextResponse.json(
        {
          success: false,
          message:
            "Transaction reference is missing.",
        },
        { status: 400 }
      );
    }

    /*
      Get our order ID from metadata.
    */
    const metadataOrderId =
      transaction.metadata?.orderId;

    if (!metadataOrderId) {
      console.error(
        "Paystack transaction has no order ID."
      );

      return NextResponse.json(
        {
          success: false,
          message:
            "Order ID missing from transaction.",
        },
        { status: 400 }
      );
    }

    const orderId =
      String(metadataOrderId);

    /*
      Find our order.
    */
    const order =
      await db.order.findUnique({
        where: {
          id: orderId,
        },
      });

    if (!order) {
      console.error(
        "Order not found:",
        orderId
      );

      return NextResponse.json(
        {
          success: false,
          message:
            "Order not found.",
        },
        { status: 404 }
      );
    }

    /*
      Confirm the Paystack reference belongs
      to this order.

      New orders have a reference saved during
      payment initialization.

      Older orders may not have one, so support
      the SIMPLYIRE-{orderId}-... format.
    */
    const expectedPrefix =
      `SIMPLYIRE-${order.id}-`;

    if (
      order.paymentReference &&
      order.paymentReference !==
        reference
    ) {
      console.error(
        "Payment reference mismatch:",
        {
          orderId: order.id,
          storedReference:
            order.paymentReference,
          receivedReference:
            reference,
        }
      );

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
      !reference.startsWith(
        expectedPrefix
      )
    ) {
      console.error(
        "Unexpected payment reference:",
        {
          orderId: order.id,
          reference,
        }
      );

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
      Confirm currency.
    */
    if (
      transaction.currency &&
      transaction.currency !== "NGN"
    ) {
      console.error(
        "Payment currency mismatch:",
        {
          orderId: order.id,
          receivedCurrency:
            transaction.currency,
        }
      );

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
      Paystack amount is in kobo.
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
          orderId: order.id,
          expectedAmount,
          receivedAmount:
            transaction.amount,
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
      If another process already completed
      the payment, simply acknowledge the webhook.

      This makes repeated webhook deliveries safe.
    */
    if (order.status === "PAID") {
      console.log(
        `Order ${order.id} is already PAID.`
      );

      return NextResponse.json({
        success: true,
        message:
          "Order was already paid.",
      });
    }

    /*
      Commit the reserved inventory and mark
      the order as PAID in the same transaction.
    */
    const paidOrder =
      await settlePaidOrder(
        order.id,
        {
          reference,
          channel:
            transaction.channel,
          paidAt:
            transaction.paid_at,
        }
      );

    console.log(
      `Order ${paidOrder.id} marked as PAID and inventory committed.`
    );

    return NextResponse.json({
      success: true,
      message:
        "Payment webhook processed successfully.",
      order: {
        id: paidOrder.id,
        status: paidOrder.status,
        fulfillmentStatus:
          paidOrder.fulfillmentStatus,
        inventoryStatus:
          paidOrder.inventoryStatus,
      },
    });
  } catch (error) {
    console.error(
      "Paystack webhook error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Webhook processing failed.",
      },
      { status: 500 }
    );
  }
}