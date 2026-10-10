"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import styles from "./page.module.css";

type LatestOrder = {
  id: string;
  total: number;
  status: string;
  fulfillmentStatus: string;
  createdAt: string;
};

type Customer = {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: string;
  updatedAt: string;
  orderCount: number;
  paidOrderCount: number;
  totalSpent: number;
  latestOrder: LatestOrder | null;
};

type CustomerOrder = {
  id: string;
  total: number;
  status: string;
  fulfillmentStatus: string;
  createdAt: string;
  paymentReference: string | null;
};

type CustomerDetails = {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: string;
  updatedAt: string;
  orders: CustomerOrder[];
  orderCount: number;
  paidOrderCount: number;
  totalSpent: number;
};

function formatNaira(amount: number) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(date: string) {
  return new Intl.DateTimeFormat("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(date));
}

function shortId(id: string) {
  return `#${id.slice(-8).toUpperCase()}`;
}

function getPaymentClass(status: string) {
  switch (status) {
    case "PAID":
      return `${styles.badge} ${styles.paid}`;

    case "PENDING":
      return `${styles.badge} ${styles.pending}`;

    case "FAILED":
      return `${styles.badge} ${styles.cancelled}`;

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

export default function AdminCustomersPage() {
  const [customers, setCustomers] =
    useState<Customer[]>([]);

  const [selectedCustomer, setSelectedCustomer] =
    useState<CustomerDetails | null>(null);

  const [search, setSearch] = useState("");

  const [loading, setLoading] =
    useState(true);

  const [detailsLoading, setDetailsLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  async function loadCustomers() {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(
        "/api/admin/customers",
        {
          cache: "no-store",
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.message ||
            "Failed to load customers."
        );
      }

      setCustomers(data.customers);
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Failed to load customers."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // Initial client-side fetch; state updates happen after the request resolves.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadCustomers();
  }, []);

  async function viewCustomer(id: string) {
    try {
      setDetailsLoading(true);
      setError("");

      const response = await fetch(
        `/api/admin/customers?id=${encodeURIComponent(
          id
        )}`,
        {
          cache: "no-store",
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.message ||
            "Failed to load customer."
        );
      }

      setSelectedCustomer(
        data.customer
      );
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Failed to load customer."
      );
    } finally {
      setDetailsLoading(false);
    }
  }

  const filteredCustomers =
    useMemo(() => {
      const query =
        search.trim().toLowerCase();

      if (!query) return customers;

      return customers.filter(
        (customer) =>
          customer.name
            .toLowerCase()
            .includes(query) ||
          customer.email
            .toLowerCase()
            .includes(query)
      );
    }, [customers, search]);

  const totalCustomers =
    customers.length;

  const customersWithOrders =
    customers.filter(
      (customer) =>
        customer.orderCount > 0
    ).length;

  const totalSpent = customers.reduce(
    (sum, customer) =>
      sum + customer.totalSpent,
    0
  );

  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.container}>
          <div className={styles.heroTop}>
            <div>
              <Link
                href="/admin"
                className={styles.backLink}
              >
                ← Administration
              </Link>

              <span className={styles.eyebrow}>
                Customers
              </span>

              <h1>
                Customer Management
              </h1>

              <p>
                View your customers,
                purchases and order
                history.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.statsSection}>
        <div className={styles.container}>
          <div className={styles.statsGrid}>
            <div className={styles.statCard}>
              <div
                className={`${styles.statIcon} ${styles.pink}`}
              >
                👥
              </div>

              <div>
                <span>Total Customers</span>
                <strong>
                  {totalCustomers}
                </strong>
                <small>
                  Registered customers
                </small>
              </div>
            </div>

            <div className={styles.statCard}>
              <div
                className={`${styles.statIcon} ${styles.green}`}
              >
                🛒
              </div>

              <div>
                <span>
                  Customers With Orders
                </span>
                <strong>
                  {customersWithOrders}
                </strong>
                <small>
                  Customers who have
                  purchased
                </small>
              </div>
            </div>

            <div className={styles.statCard}>
              <div
                className={`${styles.statIcon} ${styles.purple}`}
              >
                ₦
              </div>

              <div>
                <span>
                  Customer Spend
                </span>

                <strong>
                  {formatNaira(
                    totalSpent
                  )}
                </strong>

                <small>
                  From paid orders
                </small>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.content}>
        <div className={styles.container}>
          {error && (
            <div
              className={
                styles.errorNotice
              }
            >
              ⚠ {error}
            </div>
          )}

          <div className={styles.panel}>
            <div className={styles.toolbar}>
              <div>
                <span
                  className={
                    styles.panelEyebrow
                  }
                >
                  Customer Database
                </span>

                <h2>
                  All Customers
                </h2>

                <p>
                  {filteredCustomers.length}{" "}
                  customer
                  {filteredCustomers.length !==
                  1
                    ? "s"
                    : ""}{" "}
                  shown.
                </p>
              </div>

              <div
                className={styles.search}
              >
                <span>⌕</span>

                <input
                  type="search"
                  placeholder="Search customers..."
                  value={search}
                  onChange={(event) =>
                    setSearch(
                      event.target.value
                    )
                  }
                />
              </div>
            </div>

            {loading ? (
              <div
                className={styles.empty}
              >
                <div
                  className={styles.loader}
                >
                  <span />
                  <span />
                  <span />
                </div>

                <h3>
                  Loading customers...
                </h3>

                <p>
                  Getting customer
                  information.
                </p>
              </div>
            ) : filteredCustomers.length ===
              0 ? (
              <div
                className={styles.empty}
              >
                <div
                  className={
                    styles.emptyIcon
                  }
                >
                  👥
                </div>

                <h3>
                  No customers found
                </h3>

                <p>
                  Try another search.
                </p>
              </div>
            ) : (
              <>
                <div
                  className={
                    styles.tableWrapper
                  }
                >
                  <table
                    className={styles.table}
                  >
                    <thead>
                      <tr>
                        <th>
                          Customer
                        </th>

                        <th>
                          Orders
                        </th>

                        <th>
                          Total Spent
                        </th>

                        <th>
                          Joined
                        </th>

                        <th>
                          Latest Order
                        </th>

                        <th />
                      </tr>
                    </thead>

                    <tbody>
                      {filteredCustomers.map(
                        (customer) => (
                          <tr
                            key={
                              customer.id
                            }
                          >
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
                                  {customer.name
                                    .charAt(
                                      0
                                    )
                                    .toUpperCase()}
                                </div>

                                <div>
                                  <strong>
                                    {
                                      customer.name
                                    }
                                  </strong>

                                  <span>
                                    {
                                      customer.email
                                    }
                                  </span>
                                </div>
                              </div>
                            </td>

                            <td>
                              <strong>
                                {
                                  customer.orderCount
                                }
                              </strong>
                            </td>

                            <td>
                              <strong>
                                {formatNaira(
                                  customer.totalSpent
                                )}
                              </strong>
                            </td>

                            <td>
                              <span
                                className={
                                  styles.date
                                }
                              >
                                {formatDate(
                                  customer.createdAt
                                )}
                              </span>
                            </td>

                            <td>
                              {customer.latestOrder ? (
                                <div
                                  className={
                                    styles.latestOrder
                                  }
                                >
                                  <strong>
                                    {shortId(
                                      customer
                                        .latestOrder
                                        .id
                                    )}
                                  </strong>

                                  <span>
                                    {formatNaira(
                                      customer
                                        .latestOrder
                                        .total
                                    )}
                                  </span>
                                </div>
                              ) : (
                                <span
                                  className={
                                    styles.noOrder
                                  }
                                >
                                  No orders
                                </span>
                              )}
                            </td>

                            <td>
                              <button
                                type="button"
                                className={
                                  styles.viewButton
                                }
                                onClick={() =>
                                  viewCustomer(
                                    customer.id
                                  )
                                }
                              >
                                View →
                              </button>
                            </td>
                          </tr>
                        )
                      )}
                    </tbody>
                  </table>
                </div>

                <div
                  className={
                    styles.mobileList
                  }
                >
                  {filteredCustomers.map(
                    (customer) => (
                      <article
                        key={
                          customer.id
                        }
                        className={
                          styles.mobileCard
                        }
                      >
                        <div
                          className={
                            styles.mobileTop
                          }
                        >
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
                              {customer.name
                                .charAt(
                                  0
                                )
                                .toUpperCase()}
                            </div>

                            <div>
                              <strong>
                                {
                                  customer.name
                                }
                              </strong>

                              <span>
                                {
                                  customer.email
                                }
                              </span>
                            </div>
                          </div>

                          <strong>
                            {formatNaira(
                              customer.totalSpent
                            )}
                          </strong>
                        </div>

                        <div
                          className={
                            styles.mobileMeta
                          }
                        >
                          <span>
                            {
                              customer.orderCount
                            }{" "}
                            orders
                          </span>

                          <span>
                            Joined{" "}
                            {formatDate(
                              customer.createdAt
                            )}
                          </span>
                        </div>

                        <button
                          type="button"
                          className={
                            styles.mobileView
                          }
                          onClick={() =>
                            viewCustomer(
                              customer.id
                            )
                          }
                        >
                          View Customer →
                        </button>
                      </article>
                    )
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </section>

      {selectedCustomer && (
        <div
          className={
            styles.modalBackdrop
          }
          onClick={() =>
            setSelectedCustomer(null)
          }
        >
          <div
            className={styles.modal}
            onClick={(event) =>
              event.stopPropagation()
            }
          >
            <div
              className={
                styles.modalHeader
              }
            >
              <div>
                <span
                  className={
                    styles.panelEyebrow
                  }
                >
                  Customer Profile
                </span>

                <h2>
                  {
                    selectedCustomer.name
                  }
                </h2>

                <p>
                  {
                    selectedCustomer.email
                  }
                </p>
              </div>

              <button
                type="button"
                className={
                  styles.closeButton
                }
                onClick={() =>
                  setSelectedCustomer(
                    null
                  )
                }
              >
                ×
              </button>
            </div>

            <div className={styles.modalBody}>
              <div
                className={
                  styles.profileCard
                }
              >
                <div
                  className={
                    styles.avatarLarge
                  }
                >
                  {selectedCustomer.name
                    .charAt(0)
                    .toUpperCase()}
                </div>

                <div>
                  <strong>
                    {
                      selectedCustomer.name
                    }
                  </strong>

                  <span>
                    {
                      selectedCustomer.email
                    }
                  </span>

                  <small>
                    Customer since{" "}
                    {formatDate(
                      selectedCustomer.createdAt
                    )}
                  </small>
                </div>
              </div>

              <div
                className={
                  styles.profileStats
                }
              >
                <div>
                  <span>
                    Total Orders
                  </span>
                  <strong>
                    {
                      selectedCustomer.orderCount
                    }
                  </strong>
                </div>

                <div>
                  <span>
                    Paid Orders
                  </span>
                  <strong>
                    {
                      selectedCustomer.paidOrderCount
                    }
                  </strong>
                </div>

                <div>
                  <span>
                    Total Spent
                  </span>
                  <strong>
                    {formatNaira(
                      selectedCustomer.totalSpent
                    )}
                  </strong>
                </div>
              </div>

              <div
                className={
                  styles.ordersSection
                }
              >
                <div
                  className={
                    styles.sectionHeading
                  }
                >
                  <div>
                    <h3>
                      Order History
                    </h3>
                    <p>
                      Customer&apos;s recent
                      orders.
                    </p>
                  </div>
                </div>

                {detailsLoading ? (
                  <div
                    className={
                      styles.smallLoading
                    }
                  >
                    Loading orders...
                  </div>
                ) : selectedCustomer
                    .orders.length ===
                  0 ? (
                  <div
                    className={
                      styles.noOrders
                    }
                  >
                    No orders yet.
                  </div>
                ) : (
                  <div
                    className={
                      styles.orderList
                    }
                  >
                    {selectedCustomer.orders.map(
                      (order) => (
                        <div
                          className={
                            styles.orderItem
                          }
                          key={order.id}
                        >
                          <div>
                            <strong>
                              {shortId(
                                order.id
                              )}
                            </strong>

                            <span>
                              {formatDate(
                                order.createdAt
                              )}
                            </span>
                          </div>

                          <strong>
                            {formatNaira(
                              order.total
                            )}
                          </strong>

                          <div
                            className={
                              styles.orderStatuses
                            }
                          >
                            <span
                              className={getPaymentClass(
                                order.status
                              )}
                            >
                              {
                                order.status
                              }
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
                      )
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}