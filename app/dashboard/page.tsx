import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import styles from "./page.module.css";

export const metadata: Metadata = { title: "My Orders", robots: { index: false, follow: false } };

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
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function shortOrderId(id: string) {
  return `#${id.slice(-8).toUpperCase()}`;
}

function getPaymentClass(status: string) {
  switch (status) {
    case "PAID":
      return `${styles.badge} ${styles.paid}`;

    case "PENDING":
      return `${styles.badge} ${styles.pending}`;

    case "FAILED":
      return `${styles.badge} ${styles.failed}`;

    case "REFUNDED":
      return `${styles.badge} ${styles.refunded}`;

    default:
      return styles.badge;
  }
}

function getFulfillmentClass(status: string) {
  switch (status) {
    case "PROCESSING":
      return `${styles.badge} ${styles.processing}`;

    case "SHIPPED":
      return `${styles.badge} ${styles.shipped}`;

    case "DELIVERED":
      return `${styles.badge} ${styles.delivered}`;

    case "CANCELLED":
      return `${styles.badge} ${styles.cancelled}`;

    default:
      return `${styles.badge} ${styles.pending}`;
  }
}

function getProgress(status: string) {
  switch (status) {
    case "PROCESSING":
      return 1;

    case "SHIPPED":
      return 2;

    case "DELIVERED":
      return 3;

    default:
      return 0;
  }
}

export default async function DashboardPage() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  if (session.role === "ADMIN") {
    redirect("/admin");
  }

  const [orders, customerProfile] = await Promise.all([
    db.order.findMany({
      where: {
        userId: session.userId,
      },
      orderBy: {
        createdAt: "desc",
      },
      include: {
        orderItems: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                image: true,
              },
            },
          },
        },
      },
    }),
    db.user.findUnique({
      where: { id: session.userId },
      select: {
        phone: true,
        address: true,
        city: true,
        state: true,
        createdAt: true,
      },
    }),
  ]);

  const savedAddress = [
    customerProfile?.address,
    customerProfile?.city,
    customerProfile?.state,
  ].filter(Boolean).join(", ");

  const paidOrders = orders.filter(
    (order) => order.status === "PAID"
  );

  const totalSpent = paidOrders.reduce(
    (sum, order) => sum + order.total,
    0
  );

  const activeOrders = orders.filter(
    (order) =>
      !["DELIVERED", "CANCELLED"].includes(
        order.fulfillmentStatus
      )
  );

  return (
    <main className={styles.page}>
      {/* HERO */}

      <section className={styles.hero}>
        <div className={styles.container}>
          <div>
            <span className={styles.eyebrow}>
              My Account
            </span>

            <h1>
              Welcome, {session.name}.
            </h1>

            <p>
              Track your Simplyire
              Essentials orders from
              one place.
            </p>
          </div>

          <div className={styles.heroActions}>
            <Link href="/profile" className={styles.profileButton}>
              View my profile
            </Link>
            <Link href="/shop" className={styles.shopButton}>
              Continue Shopping →
            </Link>
          </div>
        </div>
      </section>

      {/* STATS */}

      <section className={styles.statsSection}>
        <div className={styles.container}>
          <div className={styles.stats}>
            <div className={styles.stat}>
              <div className={styles.icon}>
                🛍️
              </div>

              <div>
                <span>
                  Total Orders
                </span>

                <strong>
                  {orders.length}
                </strong>
              </div>
            </div>

            <div className={styles.stat}>
              <div className={styles.icon}>
                📦
              </div>

              <div>
                <span>
                  Active Orders
                </span>

                <strong>
                  {activeOrders.length}
                </strong>
              </div>
            </div>

            <div className={styles.stat}>
              <div className={styles.icon}>
                ₦
              </div>

              <div>
                <span>
                  Total Spent
                </span>

                <strong>
                  {formatNaira(
                    totalSpent
                  )}
                </strong>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* PROFILE SUMMARY */}
      <section className={styles.profileSection}>
        <div className={styles.container}>
          <div className={styles.profileSnapshot}>
            <div className={styles.profileSnapshotIcon}>
              {session.name.trim().charAt(0).toUpperCase()}
            </div>
            <div className={styles.profileSnapshotMain}>
              <span className={styles.sectionEyebrow}>Your Profile</span>
              <h2>{session.name}</h2>
              <p>{session.email}</p>
              <div className={styles.profileDetails}>
                <span><strong>Phone:</strong> {customerProfile?.phone || "Not added yet"}</span>
                <span><strong>Delivery address:</strong> {savedAddress || "Add a default delivery address"}</span>
              </div>
            </div>
            <Link href="/profile" className={styles.profileEditButton}>
              Edit profile →
            </Link>
          </div>
        </div>
      </section>

      {/* ORDERS */}

      <section className={styles.ordersSection}>
        <div className={styles.container}>
          <div className={styles.sectionHeader}>
            <div>
              <span
                className={
                  styles.sectionEyebrow
                }
              >
                Order History
              </span>

              <h2>
                My Orders
              </h2>

              <p>
                Follow the progress of
                your purchases.
              </p>
            </div>

            <Link
              href="/shop"
              className={styles.secondaryButton}
            >
              Shop More
            </Link>
          </div>

          {orders.length === 0 ? (
            <div className={styles.empty}>
              <div className={styles.emptyIcon}>
                🛍️
              </div>

              <h3>
                You haven&apos;t placed an
                order yet.
              </h3>

              <p>
                Your orders will appear
                here after checkout.
              </p>

              <Link
                href="/shop"
                className={styles.shopButton}
              >
                Start Shopping
              </Link>
            </div>
          ) : (
            <div className={styles.orderList}>
              {orders.map((order) => {
                const progress =
                  getProgress(
                    order.fulfillmentStatus
                  );

                const isCancelled =
                  order.fulfillmentStatus ===
                  "CANCELLED";

                return (
                  <article
                    className={
                      styles.orderCard
                    }
                    key={order.id}
                  >
                    <div
                      className={
                        styles.orderHeader
                      }
                    >
                      <div>
                        <span
                          className={
                            styles.orderId
                          }
                        >
                          {shortOrderId(
                            order.id
                          )}
                        </span>

                        <strong>
                          Order placed
                        </strong>

                        <span
                          className={
                            styles.orderDate
                          }
                        >
                          {formatDate(
                            order.createdAt
                          )}
                        </span>
                      </div>

                      <div
                        className={
                          styles.orderAmount
                        }
                      >
                        {formatNaira(
                          order.total
                        )}
                      </div>
                    </div>

                    <div
                      className={
                        styles.statusRow
                      }
                    >
                      <div>
                        <span>
                          Payment
                        </span>

                        <span
                          className={getPaymentClass(
                            order.status
                          )}
                        >
                          {order.status}
                        </span>
                      </div>

                      <div>
                        <span>
                          Fulfillment
                        </span>

                        <span
                          className={getFulfillmentClass(
                            order.fulfillmentStatus
                          )}
                        >
                          {
                            order.fulfillmentStatus
                          }
                        </span>
                      </div>
                    </div>

                    {!isCancelled && (
                      <div
                        className={
                          styles.timeline
                        }
                      >
                        <div
                          className={
                            `${styles.timelineLine} ${
                              progress >= 1
                                ? styles.timelineActive
                                : ""
                            }`
                          }
                        />

                        <div
                          className={
                            `${styles.timelineLineSecond} ${
                              progress >= 2
                                ? styles.timelineActive
                                : ""
                            }`
                          }
                        />

                        <div
                          className={
                            `${styles.timelineLineThird} ${
                              progress >= 3
                                ? styles.timelineActive
                                : ""
                            }`
                          }
                        />

                        {[
                          {
                            label:
                              "Order Received",
                            icon: "✓",
                            step: 0,
                          },
                          {
                            label:
                              "Processing",
                            icon: "📦",
                            step: 1,
                          },
                          {
                            label:
                              "Shipped",
                            icon: "🚚",
                            step: 2,
                          },
                          {
                            label:
                              "Delivered",
                            icon: "✓",
                            step: 3,
                          },
                        ].map(
                          (item) => (
                            <div
                              className={
                                styles.timelineStep
                              }
                              key={
                                item.label
                              }
                            >
                              <div
                                className={
                                  `${styles.timelineDot} ${
                                    progress >=
                                    item.step
                                      ? styles.timelineDotActive
                                      : ""
                                  }`
                                }
                              >
                                {
                                  item.icon
                                }
                              </div>

                              <span>
                                {
                                  item.label
                                }
                              </span>
                            </div>
                          )
                        )}
                      </div>
                    )}

                    {isCancelled && (
                      <div
                        className={
                          styles.cancelledBox
                        }
                      >
                        ⚠ This order has
                        been cancelled.
                      </div>
                    )}

                    <div
                      className={
                        styles.products
                      }
                    >
                      {order.orderItems
                        .slice(0, 3)
                        .map((item) => (
                          <div
                            className={
                              styles.product
                            }
                            key={item.id}
                          >
                            <img
                              src={
                                item.product
                                  .image
                              }
                              alt={
                                item.product
                                  .name
                              }
                            />

                            <div>
                              <strong>
                                {
                                  item.product
                                    .name
                                }
                              </strong>

                              <span>
                                {
                                  item.quantity
                                }{" "}
                                ×{" "}
                                {formatNaira(
                                  item.price
                                )}
                              </span>
                            </div>
                          </div>
                        ))}

                      {order.orderItems
                        .length > 3 && (
                        <span
                          className={
                            styles.moreItems
                          }
                        >
                          +
                          {order
                            .orderItems
                            .length -
                            3}{" "}
                          more
                        </span>
                      )}
                    </div>

                    <div
                      className={
                        styles.orderFooter
                      }
                    >
                      <span>
                        {order.orderItems.length}{" "}
                        product
                        {order.orderItems.length !== 1 ? "s" : ""}
                      </span>

                      {order.status === "PAID" && (
                        <span className={styles.paidMessage}>
                          ✓ Payment confirmed
                        </span>
                      )}

                      <Link href={`/orders/${order.id}`} className={styles.viewOrderLink}>
                        View order details →
                      </Link>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}