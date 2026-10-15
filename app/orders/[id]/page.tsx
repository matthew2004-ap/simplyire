import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import styles from "./page.module.css";
import OrderStatusRefresh from "./OrderStatusRefresh";
export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Order Details", robots: { index: false, follow: false } };

type PageProps = {
  params: Promise<{ id: string }>;
};

function formatNaira(amount: number) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en-NG", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function shortOrderId(id: string) {
  return `#${id.slice(-8).toUpperCase()}`;
}

function paymentClass(status: string) {
  if (status === "PAID") return `${styles.badge} ${styles.paid}`;
  if (status === "FAILED" || status === "REFUNDED") return `${styles.badge} ${styles.cancelled}`;
  return `${styles.badge} ${styles.pending}`;
}

function fulfillmentClass(status: string) {
  const classes: Record<string, string> = {
    PENDING: styles.pending,
    PROCESSING: styles.processing,
    SHIPPED: styles.shipped,
    DELIVERED: styles.delivered,
    CANCELLED: styles.cancelled,
  };
  return `${styles.badge} ${classes[status] ?? styles.pending}`;
}

function fulfillmentProgress(status: string) {
  const progress: Record<string, number> = {
    PENDING: 0,
    PROCESSING: 1,
    SHIPPED: 2,
    DELIVERED: 3,
  };
  return progress[status] ?? 0;
}

export default async function CustomerOrderDetailsPage({ params }: PageProps) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role === "ADMIN") redirect("/admin/orders");

  const { id } = await params;
  const order = await db.order.findFirst({
    where: {
      id,
      userId: session.userId,
    },
    include: {
      orderItems: {
        include: {
          product: {
            select: { id: true, name: true, image: true },
          },
        },
      },
    },
  });

  // An order is visible only to the account that owns it.
  if (!order) notFound();

  const itemsSubtotal = order.orderItems.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );
  const deliveryFee = Math.max(0, order.total - itemsSubtotal);
  const progress = fulfillmentProgress(order.fulfillmentStatus);
  const isCancelled = order.fulfillmentStatus === "CANCELLED";
  const trackingSteps = ["Order received", "Processing", "Shipped", "Delivered"];

  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.container}>
          <Link href="/dashboard" className={styles.backLink}>← Back to My Orders</Link>
          <span className={styles.eyebrow}>Order tracking</span>
          <div className={styles.heroRow}>
            <div>
              <h1>Order {shortOrderId(order.id)}</h1>
              <p>Placed on {formatDate(order.createdAt)}</p>
            </div>
            <span className={fulfillmentClass(order.fulfillmentStatus)}>{order.fulfillmentStatus}</span>
          </div>
        </div>
      </section>

      <section className={styles.content}>
        <div className={`${styles.container} ${styles.grid}`}>
          <div className={styles.mainColumn}>
            <section className={styles.panel}>
              <div className={styles.panelHeading}>
  <div>
    <span className={styles.panelEyebrow}>
      Delivery progress
    </span>

    <h2>Track your order</h2>

    <p>
      Follow your order from confirmation
      through delivery.
    </p>

    <OrderStatusRefresh />
  </div>

  <span className={paymentClass(order.status)}>
    Payment: {order.status}
  </span>
</div>

              {isCancelled ? (
                <div className={styles.cancelledNotice}>This order has been cancelled. Contact Simplyire if you need help with this order.</div>
              ) : (
                <div className={styles.timeline}>
                  <div className={styles.trackLine} />
                  <div className={styles.trackFill} style={{ width: `${(progress / 3) * 100}%` }} />
                  {trackingSteps.map((step, index) => (
                    <div className={styles.step} key={step}>
                      <div className={`${styles.stepDot} ${index <= progress ? styles.stepActive : ""}`}>
                        {index <= progress ? "✓" : index + 1}
                      </div>
                      <span className={index <= progress ? styles.stepLabelActive : ""}>{step}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* PAYMENT STATUS MESSAGES */}

{order.status === "PENDING" && (
  <div className={styles.paymentNotice}>
    Your payment is awaiting confirmation.
    Your order will proceed to fulfillment after
    successful payment verification. Please check
    your payment status before attempting another payment.
  </div>
)}

{order.status === "PAID" && (
  <div className={styles.successNotice}>
    ✓ Payment confirmed! Thank you for shopping
    with Simplyire Essentials. You can follow
    your order's delivery progress above.
  </div>
)}

{order.status === "FAILED" && (
  <div className={styles.cancelledNotice}>
    Your payment was unsuccessful. Your order
    cannot proceed to fulfillment until payment
    is resolved. If money was deducted from your
    account, contact our support team with your
    payment reference.
  </div>
)}

{order.status === "REFUNDED" && (
  <div className={styles.paymentNotice}>
    This payment has been marked as refunded.
    Contact our support team if you need
    clarification about your refund.
  </div>
)}
            </section>

            <section className={styles.panel}>
              <div className={styles.panelHeading}>
                <div>
                  <span className={styles.panelEyebrow}>Your purchase</span>
                  <h2>Items in this order</h2>
                </div>
                <span className={styles.itemCount}>{order.orderItems.length} item{order.orderItems.length === 1 ? "" : "s"}</span>
              </div>

              <div className={styles.itemsList}>
                {order.orderItems.map((item) => (
                  <div className={styles.item} key={item.id}>
                    <img src={item.product.image} alt={item.product.name} />
                    <div className={styles.itemInfo}>
                      <strong>{item.product.name}</strong>
                      <span>Quantity: {item.quantity}</span>
                      <small>{formatNaira(item.price)} each</small>
                    </div>
                    <strong className={styles.itemTotal}>{formatNaira(item.price * item.quantity)}</strong>
                  </div>
                ))}
              </div>

              <div className={styles.totals}>
                <div><span>Items subtotal</span><strong>{formatNaira(itemsSubtotal)}</strong></div>
                <div><span>Delivery</span><strong>{deliveryFee === 0 ? "FREE" : formatNaira(deliveryFee)}</strong></div>
                <div className={styles.grandTotal}><span>Order total</span><strong>{formatNaira(order.total)}</strong></div>
              </div>
            </section>
          </div>

          <aside className={styles.sideColumn}>
            <section className={styles.panel}>
              <span className={styles.panelEyebrow}>Delivery information</span>
              <h2>Ship to</h2>
              <strong className={styles.recipient}>{order.customer}</strong>
              <p>{order.address}</p>
              <p>{order.phone}</p>
              <p>{order.email}</p>
            </section>

            <section className={styles.panel}>
              <span className={styles.panelEyebrow}>Payment information</span>
              <h2>Payment summary</h2>
              <div className={styles.summaryRow}><span>Status</span><span className={paymentClass(order.status)}>{order.status}</span></div>
              {order.paymentChannel && <div className={styles.summaryRow}><span>Channel</span><strong>{order.paymentChannel}</strong></div>}
              {order.paidAt && <div className={styles.summaryRow}><span>Paid on</span><strong>{formatDate(order.paidAt)}</strong></div>}
              {order.paymentReference && <div className={styles.reference}><span>Payment reference</span><code>{order.paymentReference}</code></div>}
            </section>

            <section className={`${styles.panel} ${styles.helpPanel}`}>
              <h2>Need help?</h2>
              <p>Have a question about this delivery? Contact our team and include your order number.</p>
              <Link href={`/contact?subject=${encodeURIComponent(`Order ${shortOrderId(order.id)} support`)}`} className={styles.helpButton}>Contact Simplyire →</Link>
            </section>
          </aside>
        </div>
      </section>
    </main>
  );
}
