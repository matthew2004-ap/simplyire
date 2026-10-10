import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import styles from "./page.module.css";

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

function getStatusClass(status: string) {
  switch (status.toUpperCase()) {
    case "PAID":
      return `${styles.status} ${styles.statusPaid}`;

    case "PENDING":
      return `${styles.status} ${styles.statusPending}`;

    case "PROCESSING":
      return `${styles.status} ${styles.statusProcessing}`;

    case "SHIPPED":
      return `${styles.status} ${styles.statusShipped}`;

    case "DELIVERED":
      return `${styles.status} ${styles.statusDelivered}`;

    case "CANCELLED":
      return `${styles.status} ${styles.statusCancelled}`;

    default:
      return styles.status;
  }
}

export default async function AdminPage() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  if (session.role !== "ADMIN") {
    redirect("/dashboard");
  }

  const [
    revenueResult,
    totalOrders,
    totalCustomers,
    totalProducts,
    pendingOrders,
    recentOrders,
    lowStockProducts,
  ] = await Promise.all([
    db.order.aggregate({
      _sum: {
        total: true,
      },
      where: {
        status: "PAID",
      },
    }),

    db.order.count(),

    db.user.count({
      where: {
        role: "CUSTOMER",
      },
    }),

    db.product.count(),

    db.order.count({
      where: {
        status: "PENDING",
      },
    }),

    db.order.findMany({
      orderBy: {
        createdAt: "desc",
      },
      take: 8,
      select: {
        id: true,
        customer: true,
        email: true,
        total: true,
        status: true,
        createdAt: true,
      },
    }),

    db.product.findMany({
      where: {
        stock: {
          lte: 5,
        },
      },
      orderBy: {
        stock: "asc",
      },
      take: 6,
      select: {
        id: true,
        name: true,
        stock: true,
        price: true,
        image: true,
      },
    }),
  ]);

  const revenue = revenueResult._sum.total ?? 0;

  return (
    <main className={styles.page}>
      {/* HERO */}
      <section className={styles.hero}>
        <div className={styles.container}>
          <div className={styles.heroInner}>
            <div>
              <span className={styles.eyebrow}>
                Administration
              </span>

              <h1>
                Welcome, {session.name}.
              </h1>

              <p>
                Manage your Simplyire Essentials
                store from one place.
              </p>
            </div>

            <div className={styles.adminBadge}>
              <span className={styles.badgeDot} />
              ADMIN
            </div>
          </div>
        </div>
      </section>

      {/* STATS */}
      <section className={styles.statsSection}>
        <div className={styles.container}>
          <div className={styles.statsGrid}>
            <div className={styles.statCard}>
              <div
                className={`${styles.statIcon} ${styles.iconRevenue}`}
              >
                ₦
              </div>

              <div className={styles.statContent}>
                <span>Total Revenue</span>
                <strong>
                  {formatNaira(revenue)}
                </strong>
                <small>
                  From paid orders
                </small>
              </div>
            </div>

            <div className={styles.statCard}>
              <div
                className={`${styles.statIcon} ${styles.iconOrders}`}
              >
                🛒
              </div>

              <div className={styles.statContent}>
                <span>Total Orders</span>
                <strong>{totalOrders}</strong>
                <small>
                  {pendingOrders} pending
                </small>
              </div>
            </div>

            <div className={styles.statCard}>
              <div
                className={`${styles.statIcon} ${styles.iconCustomers}`}
              >
                👥
              </div>

              <div className={styles.statContent}>
                <span>Customers</span>
                <strong>{totalCustomers}</strong>
                <small>
                  Registered customers
                </small>
              </div>
            </div>

            <div className={styles.statCard}>
              <div
                className={`${styles.statIcon} ${styles.iconProducts}`}
              >
                📦
              </div>

              <div className={styles.statContent}>
                <span>Products</span>
                <strong>{totalProducts}</strong>
                <small>
                  Products in catalog
                </small>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* MAIN CONTENT */}
      <section className={styles.contentSection}>
        <div className={styles.container}>
          <div className={styles.contentGrid}>
            {/* RECENT ORDERS */}
            <div className={styles.panel}>
              <div className={styles.panelHeader}>
                <div>
                  <span className={styles.panelEyebrow}>
                    Sales
                  </span>

                  <h2>Recent Orders</h2>

                  <p>
                    Your latest customer
                    orders.
                  </p>
                </div>

                <Link
                  href="/admin/orders"
                  className={styles.panelLink}
                >
                  View all →
                </Link>
              </div>

              {recentOrders.length === 0 ? (
                <div className={styles.empty}>
                  <div className={styles.emptyIcon}>
                    🛒
                  </div>

                  <h3>No orders yet</h3>

                  <p>
                    Customer orders will
                    appear here.
                  </p>
                </div>
              ) : (
                <div className={styles.tableWrapper}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th>Customer</th>
                        <th>Total</th>
                        <th>Status</th>
                        <th>Date</th>
                      </tr>
                    </thead>

                    <tbody>
                      {recentOrders.map(
                        (order) => (
                          <tr key={order.id}>
                            <td>
                              <div
                                className={
                                  styles.customer
                                }
                              >
                                <div
                                  className={
                                    styles.avatar
                                  }
                                >
                                  {order.customer
                                    .charAt(
                                      0
                                    )
                                    .toUpperCase()}
                                </div>

                                <div>
                                  <strong>
                                    {
                                      order.customer
                                    }
                                  </strong>

                                  <span>
                                    {
                                      order.email
                                    }
                                  </span>
                                </div>
                              </div>
                            </td>

                            <td>
                              <strong>
                                {formatNaira(
                                  order.total
                                )}
                              </strong>
                            </td>

                            <td>
                              <span
                                className={getStatusClass(
                                  order.status
                                )}
                              >
                                {order.status}
                              </span>
                            </td>

                            <td>
                              <span
                                className={
                                  styles.date
                                }
                              >
                                {formatDate(
                                  order.createdAt
                                )}
                              </span>
                            </td>
                          </tr>
                        )
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* LOW STOCK */}
            <div className={styles.panel}>
              <div className={styles.panelHeader}>
                <div>
                  <span className={styles.panelEyebrow}>
                    Inventory
                  </span>

                  <h2>Low Stock</h2>

                  <p>
                    Products that need
                    attention.
                  </p>
                </div>

                <Link
                  href="/admin/products"
                  className={styles.panelLink}
                >
                  Products →
                </Link>
              </div>

              {lowStockProducts.length ===
              0 ? (
                <div className={styles.empty}>
                  <div className={styles.emptyIcon}>
                    ✅
                  </div>

                  <h3>Stock looks good</h3>

                  <p>
                    No products are
                    running low.
                  </p>
                </div>
              ) : (
                <div className={styles.stockList}>
                  {lowStockProducts.map(
                    (product) => (
                      <div
                        className={
                          styles.stockItem
                        }
                        key={product.id}
                      >
                        <img
                          src={product.image}
                          alt={
                            product.name
                          }
                        />

                        <div
                          className={
                            styles.stockInfo
                          }
                        >
                          <strong>
                            {product.name}
                          </strong>

                          <span>
                            {formatNaira(
                              product.price
                            )}
                          </span>
                        </div>

                        <div
                          className={
                            product.stock <= 2
                              ? styles.stockDanger
                              : styles.stockWarning
                          }
                        >
                          {product.stock} left
                        </div>
                      </div>
                    )
                  )}
                </div>
              )}
            </div>
          </div>

          {/* QUICK ACTIONS */}
          <div className={styles.panel}>
            <div className={styles.panelHeader}>
              <div>
                <span
                  className={
                    styles.panelEyebrow
                  }
                >
                  Management
                </span>

                <h2>Quick Actions</h2>

                <p>
                  Jump directly to the
                  section you need.
                </p>
              </div>
            </div>

            <div className={styles.actionsGrid}>
              <Link
                href="/admin/orders"
                className={styles.actionCard}
              >
                <div
                  className={
                    styles.actionIcon
                  }
                >
                  🛒
                </div>

                <div>
                  <strong>
                    Manage Orders
                  </strong>

                  <span>
                    View and update
                    customer orders.
                  </span>
                </div>

                <span
                  className={
                    styles.actionArrow
                  }
                >
                  →
                </span>
              </Link>

              <Link
                href="/admin/products"
                className={styles.actionCard}
              >
                <div
                  className={
                    styles.actionIcon
                  }
                >
                  📦
                </div>

                <div>
                  <strong>
                    Manage Products
                  </strong>

                  <span>
                    Manage products
                    and inventory.
                  </span>
                </div>

                <span
                  className={
                    styles.actionArrow
                  }
                >
                  →
                </span>
              </Link>

              <Link
                href="/admin/customers"
                className={styles.actionCard}
              >
                <div
                  className={
                    styles.actionIcon
                  }
                >
                  👥
                </div>

                <div>
                  <strong>
                    Customers
                  </strong>

                  <span>
                    View registered
                    customers.
                  </span>
                </div>

                <span
                  className={
                    styles.actionArrow
                  }
                >
                  →
                </span>
              </Link>

              <Link
                href="/admin/promotions"
                className={styles.actionCard}
              >
                <div className={styles.actionIcon}>✨</div>
                <div>
                  <strong>Promotions & Ads</strong>
                  <span>Create new-drop adverts and schedule announcements.</span>
                </div>
                <span className={styles.actionArrow}>→</span>
              </Link>

              <Link href="/admin/newsletter" className={styles.actionCard}>
                <div className={styles.actionIcon}>✉️</div>
                <div><strong>Newsletter</strong><span>View and export email subscribers.</span></div>
                <span className={styles.actionArrow}>→</span>
              </Link>

              <Link
                href="/admin/messages"
                className={styles.actionCard}
              >
                <div
                  className={
                    styles.actionIcon
                  }
                >
                  💬
                </div>

                <div>
                  <strong>
                    Messages
                  </strong>

                  <span>
                    View customer
                    messages.
                  </span>
                </div>

                <span
                  className={
                    styles.actionArrow
                  }
                >
                  →
                </span>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}