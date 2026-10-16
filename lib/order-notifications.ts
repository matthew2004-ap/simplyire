// lib/order-notifications.ts

export type OrderEmailEvent =
  | "PAYMENT_CONFIRMED"
  | "PROCESSING"
  | "SHIPPED"
  | "DELIVERED";

type OrderEmailInput = {
  orderId: string;
  customerName: string;
  email: string;
  total: number;
  event: OrderEmailEvent;
};

function formatNaira(amount: number): string {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(amount);
}

function escapeHtml(value: string): string {
  const replacements: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  };

  return value.replace(
    /[&<>"']/g,
    (character) => replacements[character] ?? character
  );
}

export async function sendOrderNotificationEmail(
  input: OrderEmailInput
): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const sender = process.env.EMAIL_FROM;

  const siteUrl = (
    process.env.SITE_URL ||
    "https://simplyire.vercel.app"
  ).replace(/\/+$/, "");

  // Configuration checks
  if (!apiKey || !sender) {
    console.warn(
      "Order email skipped: RESEND_API_KEY or EMAIL_FROM is missing."
    );
    return;
  }

  if (!input.email || !input.email.includes("@")) {
    console.warn(
      "Order email skipped: customer email address is invalid."
    );
    return;
  }

  if (
    !Number.isFinite(input.total) ||
    input.total < 0
  ) {
    console.error(
      "Order email skipped: invalid order total."
    );
    return;
  }

  const shortId =
    `#${input.orderId.slice(-8).toUpperCase()}`;

  const messages: Record<
    OrderEmailEvent,
    { subject: string; heading: string; message: string }
  > = {
    PAYMENT_CONFIRMED: {
      subject: `Payment confirmed for order ${shortId}`,
      heading: "Payment Confirmed!",
      message:
        "Your payment has been confirmed. Thank you for shopping with Simplyire Essentials. We'll keep you updated as your order progresses.",
    },

    PROCESSING: {
      subject: `We're preparing order ${shortId}`,
      heading: "Your Order Is Being Prepared",
      message:
        "We've started processing your order. We'll notify you when it has been shipped.",
    },

    SHIPPED: {
      subject: `Your order ${shortId} has shipped`,
      heading: "Your Order Has Shipped!",
      message:
        "Your order has been marked as shipped. Please visit your order details page to follow its progress.",
    },

    DELIVERED: {
      subject: `Your order ${shortId} has been delivered`,
      heading: "Order Delivered!",
      message:
        "Your order has been marked as delivered. Thank you for choosing Simplyire Essentials!",
    },
  };

  const notification = messages[input.event];

  const safeName = escapeHtml(
    input.customerName || "Customer"
  );

  const safeOrderId = escapeHtml(shortId);

  const safeTotal = escapeHtml(
    formatNaira(input.total)
  );

  const orderUrl =
    `${siteUrl}/orders/${encodeURIComponent(input.orderId)}`;

  const safeOrderUrl = escapeHtml(orderUrl);

  const html = `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>${escapeHtml(notification.subject)}</title>
      </head>

      <body style="
        margin: 0;
        padding: 24px 12px;
        background-color: #fff7fa;
        font-family: Arial, Helvetica, sans-serif;
        color: #403039;
      ">
        <div style="
          max-width: 560px;
          margin: 0 auto;
          background: #ffffff;
          border: 1px solid #f0dce5;
          border-radius: 16px;
          overflow: hidden;
        ">
          <div style="
            background: #f8dce8;
            padding: 28px 24px;
            text-align: center;
          ">
            <h1 style="
              margin: 0;
              font-size: 25px;
              color: #66384e;
            ">
              Simplyire Essentials
            </h1>

            <p style="
              margin: 8px 0 0;
              color: #80586d;
              font-size: 14px;
            ">
              Your everyday essentials, delivered with care.
            </p>
          </div>

          <div style="padding: 28px 24px;">
            <p style="font-size: 15px;">
              Hello ${safeName},
            </p>

            <h2 style="
              color: #66384e;
              font-size: 22px;
            ">
              ${escapeHtml(notification.heading)}
            </h2>

            <p style="
              font-size: 15px;
              line-height: 1.8;
              color: #66545e;
            ">
              ${escapeHtml(notification.message)}
            </p>

            <div style="
              margin: 24px 0;
              padding: 18px;
              background: #fff7fa;
              border-radius: 10px;
              border: 1px solid #f0dce5;
            ">
              <p style="margin: 0 0 12px;">
                <strong>Order:</strong> ${safeOrderId}
              </p>

              <p style="margin: 0;">
                <strong>Order total:</strong> ${safeTotal}
              </p>
            </div>

            <div style="text-align: center; margin: 28px 0;">
              <a
                href="${safeOrderUrl}"
                style="
                  display: inline-block;
                  padding: 14px 24px;
                  border-radius: 8px;
                  background: #66384e;
                  color: #ffffff;
                  font-size: 14px;
                  font-weight: bold;
                  text-decoration: none;
                "
              >
                View My Order
              </a>
            </div>

            <p style="
              margin-top: 28px;
              font-size: 13px;
              line-height: 1.7;
              color: #897780;
            ">
              If you have questions about your order,
              please contact our support team through
              our website.
            </p>
          </div>

          <div style="
            padding: 18px;
            text-align: center;
            background: #fff7fa;
            color: #897780;
            font-size: 12px;
          ">
            © ${new Date().getFullYear()} Simplyire Essentials
          </div>
        </div>
      </body>
    </html>
  `;

  const text = `
Hello ${input.customerName || "Customer"},

${notification.heading}

${notification.message}

Order: ${shortId}
Order total: ${formatNaira(input.total)}

View your order:
${orderUrl}

Simplyire Essentials
  `.trim();

  try {
    const response = await fetch(
      "https://api.resend.com/emails",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",

          // Helps prevent duplicate notifications
          // when the same event is retried.
          "Idempotency-Key":
            `simplyire-${input.orderId}-${input.event}`,
        },
        body: JSON.stringify({
          from: sender,
          to: [input.email],
          subject: notification.subject,
          html,
          text,
        }),
      }
    );

    if (!response.ok) {
      const details = await response.text();

      console.error(
        "Resend email request failed:",
        response.status,
        details.slice(0, 500)
      );
    }
  } catch (error) {
    // An email service failure must not undo a
    // successfully processed order or payment.
    console.error(
      "Unable to send order notification:",
      error
    );
  }
}
