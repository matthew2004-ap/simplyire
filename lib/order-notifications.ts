import "server-only";

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

type EmailNotification = {
  subject: string;
  heading: string;
  message: string;
};

type ResendResponse = {
  id?: string;
  message?: string;
  name?: string;
};

const RESEND_API_URL = "https://api.resend.com/emails";

const DEFAULT_SITE_URL = "https://simplyire.vercel.app";

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
    (character) => replacements[character] ?? character,
  );
}

function getNotification(
  event: OrderEmailEvent,
  shortId: string,
): EmailNotification {
  const messages: Record<OrderEmailEvent, EmailNotification> = {
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
        "Your order has been marked as shipped. Visit your order details page to follow its progress.",
    },

    DELIVERED: {
      subject: `Your order ${shortId} has been delivered`,
      heading: "Order Delivered!",
      message:
        "Your order has been marked as delivered. Thank you for choosing Simplyire Essentials!",
    },
  };

  return messages[event];
}

function buildEmailHtml(input: {
  customerName: string;
  shortId: string;
  total: string;
  notification: EmailNotification;
  orderUrl: string;
}): string {
  const safeName = escapeHtml(input.customerName);
  const safeOrderId = escapeHtml(input.shortId);
  const safeTotal = escapeHtml(input.total);
  const safeSubject = escapeHtml(input.notification.subject);
  const safeHeading = escapeHtml(input.notification.heading);
  const safeMessage = escapeHtml(input.notification.message);
  const safeOrderUrl = escapeHtml(input.orderUrl);
  const year = new Date().getFullYear();

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${safeSubject}</title>
</head>

<body style="
  margin:0;
  padding:24px 12px;
  background-color:#fff7fa;
  font-family:Arial,Helvetica,sans-serif;
  color:#403039;
">
  <div style="
    max-width:560px;
    margin:0 auto;
    background:#ffffff;
    border:1px solid #f0dce5;
    border-radius:16px;
    overflow:hidden;
  ">

    <div style="
      background:#f8dce8;
      padding:28px 24px;
      text-align:center;
    ">
      <h1 style="
        margin:0;
        font-size:25px;
        color:#66384e;
      ">
        Simplyire Essentials
      </h1>

      <p style="
        margin:8px 0 0;
        color:#80586d;
        font-size:14px;
      ">
        Your everyday essentials, delivered with care.
      </p>
    </div>

    <div style="padding:28px 24px;">

      <p style="font-size:15px;">
        Hello ${safeName},
      </p>

      <h2 style="
        color:#66384e;
        font-size:22px;
      ">
        ${safeHeading}
      </h2>

      <p style="
        font-size:15px;
        line-height:1.8;
        color:#66545e;
      ">
        ${safeMessage}
      </p>

      <div style="
        margin:24px 0;
        padding:18px;
        background:#fff7fa;
        border-radius:10px;
        border:1px solid #f0dce5;
      ">
        <p style="margin:0 0 12px;">
          <strong>Order:</strong> ${safeOrderId}
        </p>

        <p style="margin:0;">
          <strong>Order total:</strong> ${safeTotal}
        </p>
      </div>

      <div style="text-align:center;margin:28px 0;">
        <a
          href="${safeOrderUrl}"
          style="
            display:inline-block;
            padding:14px 24px;
            border-radius:8px;
            background:#66384e;
            color:#ffffff;
            font-size:14px;
            font-weight:bold;
            text-decoration:none;
          "
        >
          View My Order
        </a>
      </div>

      <p style="
        margin-top:28px;
        font-size:13px;
        line-height:1.7;
        color:#897780;
      ">
        If you have questions about your order, please contact our
        support team through our website.
      </p>

    </div>

    <div style="
      padding:18px;
      text-align:center;
      background:#fff7fa;
      color:#897780;
      font-size:12px;
    ">
      <p style="margin:0 0 8px;">
        © ${year} Simplyire Essentials
      </p>

      <a
        href="${escapeHtml(input.orderUrl.split("/orders/")[0])}"
        style="color:#66384e;text-decoration:none;"
      >
        Visit our store
      </a>
    </div>

  </div>
</body>
</html>
`.trim();
}

function buildEmailText(input: {
  customerName: string;
  shortId: string;
  total: string;
  notification: EmailNotification;
  orderUrl: string;
  siteUrl: string;
}): string {
  return [
    "SIMPLYIRE ESSENTIALS",
    "",
    `Hello ${input.customerName},`,
    "",
    input.notification.heading,
    "",
    input.notification.message,
    "",
    `Order: ${input.shortId}`,
    `Order total: ${input.total}`,
    "",
    "View your order:",
    input.orderUrl,
    "",
    "Visit our store:",
    input.siteUrl,
    "",
    "Thank you for shopping with Simplyire Essentials.",
  ].join("\n");
}

/**
 * Sends an order notification email through Resend.
 *
 * Required environment variables:
 * RESEND_API_KEY
 * EMAIL_FROM
 * SITE_URL (optional; defaults to the production website)
 *
 * Email failures are logged and do not throw an error into the order flow.
 */
export async function sendOrderNotificationEmail(
  input: OrderEmailInput,
): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const sender = process.env.EMAIL_FROM;

  const configuredSiteUrl =
    process.env.SITE_URL || DEFAULT_SITE_URL;

  const siteUrl = configuredSiteUrl.replace(/\/+$/, "");

  // Configuration checks.
  if (!apiKey || !sender) {
    console.warn(
      "Order email skipped: RESEND_API_KEY or EMAIL_FROM is missing.",
    );
    return;
  }

  if (
    !siteUrl.startsWith("https://") &&
    !siteUrl.startsWith("http://localhost")
  ) {
    console.error(
      "Order email skipped: SITE_URL must be a valid HTTPS URL.",
    );
    return;
  }

  if (
    !input ||
    typeof input.orderId !== "string" ||
    !input.orderId.trim()
  ) {
    console.warn("Order email skipped: invalid order ID.");
    return;
  }

  if (
    !input.email ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email.trim())
  ) {
    console.warn(
      "Order email skipped: customer email address is invalid.",
    );
    return;
  }

  if (
    !Number.isFinite(input.total) ||
    input.total < 0
  ) {
    console.error(
      "Order email skipped: invalid order total.",
    );
    return;
  }

  const validEvents: OrderEmailEvent[] = [
    "PAYMENT_CONFIRMED",
    "PROCESSING",
    "SHIPPED",
    "DELIVERED",
  ];

  if (!validEvents.includes(input.event)) {
    console.error("Order email skipped: invalid notification event.");
    return;
  }

  const customerName =
    input.customerName?.trim() || "Customer";

  const customerEmail = input.email.trim().toLowerCase();

  // Use a short, readable order reference in the email.
  const shortId = `#${input.orderId
    .slice(-8)
    .toUpperCase()}`;

  const notification = getNotification(
    input.event,
    shortId,
  );

  const total = formatNaira(input.total);

  const orderUrl =
    `${siteUrl}/orders/${encodeURIComponent(input.orderId)}`;

  const html = buildEmailHtml({
    customerName,
    shortId,
    total,
    notification,
    orderUrl,
  });

  const text = buildEmailText({
    customerName,
    shortId,
    total,
    notification,
    orderUrl,
    siteUrl,
  });

  try {
    const response = await fetch(RESEND_API_URL, {
      method: "POST",

      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",

        // Resend supports idempotency keys to help prevent
        // duplicate sends when a request is retried.
        "Idempotency-Key":
          `simplyire-${input.orderId}-${input.event}`,
      },

      body: JSON.stringify({
        from: sender,
        to: [customerEmail],
        subject: notification.subject,
        html,
        text,
      }),

      cache: "no-store",
    });

    if (!response.ok) {
      const details = await response.text();

      console.error(
        "Resend email request failed:",
        response.status,
        details.slice(0, 500),
      );

      return;
    }

    const result =
      (await response.json().catch(() => ({}))) as ResendResponse;

    console.info("Order notification email accepted by Resend.", {
      orderId: input.orderId,
      event: input.event,
      emailId: result.id ?? "unknown",
    });
  } catch (error) {
    // Email delivery problems should not reverse a successful
    // payment or a successfully saved fulfillment-status update.
    console.error(
      "Unable to send order notification:",
      error instanceof Error ? error.message : error,
    );
  }
}