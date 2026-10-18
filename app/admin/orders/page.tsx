"use client";

import { useEffect, useMemo, useState } from "react";
import FulfillmentStatusSelect from "./FulfillmentStatusSelect";

type OrderItem = {
  id: string;
  quantity: number;
  price: number;
  product: {
    id: string;
    name: string;
    image: string;
  };
};

type Order = {
  id: string;
  customer: string;
  email: string;
  phone: string;
  address: string;
  status: string;
  fulfillmentStatus: string;
  inventoryStatus: string;
  total: number;
  paymentReference: string | null;
  paymentChannel: string | null;
  paidAt: string | null;
  createdAt: string;
  orderItems: OrderItem[];
};

function formatNaira(amount: number) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(date: string) {
  const parsedDate = new Date(date);

  if (!Number.isFinite(parsedDate.getTime())) {
    return "Date unavailable";
  }

  return new Intl.DateTimeFormat("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(parsedDate);
}

function shortOrderId(id: string) {
  return `#${id.slice(-8).toUpperCase()}`;
}

function getPaymentClass(status: string) {
  switch (status.toUpperCase()) {
    case "PAID":
      return "order-badge order-badge-paid";

    case "PENDING":
      return "order-badge order-badge-pending";

    case "FAILED":
      return "order-badge order-badge-failed";

    case "REFUNDED":
      return "order-badge order-badge-refunded";

    default:
      return "order-badge";
  }
}


export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("ALL");
  const [selectedOrder, setSelectedOrder] =
    useState<Order | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  function handleFulfillmentUpdated(
    orderId: string,
    status: string
  ) {
    setOrders((currentOrders) =>
      currentOrders.map((order) =>
        order.id === orderId
          ? {
              ...order,
              fulfillmentStatus:
                status,
            }
          : order
      )
    );

    setSelectedOrder((currentOrder) =>
      currentOrder?.id === orderId
        ? {
            ...currentOrder,
            fulfillmentStatus:
              status,
          }
        : currentOrder
    );
  }

  async function loadOrders() {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(
        "/api/admin/orders",
        {
          cache: "no-store",
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.message ||
            "Failed to load orders."
        );
      }

      if (!Array.isArray(data.orders)) {
        throw new Error(
          "The server returned an invalid orders response."
        );
      }

      setOrders(data.orders);
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Failed to load orders."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // Initial client-side fetch; state updates happen after the request resolves.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadOrders();
  }, []);

  const filteredOrders = useMemo(() => {
    const query = search.trim().toLowerCase();

    return orders.filter((order) => {
      const searchableValues = [
        order.customer,
        order.email,
        order.phone,
        order.id,
        order.paymentReference ?? "",
      ];

      const matchesSearch =
        !query ||
        searchableValues.some((value) =>
          value.toLowerCase().includes(query)
        );

      const paymentStatus = order.status.toUpperCase();
      const fulfillmentStatus = order.fulfillmentStatus.toUpperCase();

      let matchesFilter = filter === "ALL";

      switch (filter) {
        case "PAYMENT_PENDING":
          matchesFilter = paymentStatus === "PENDING";
          break;
        case "PAYMENT_PAID":
          matchesFilter = paymentStatus === "PAID";
          break;
        case "PAYMENT_FAILED":
          matchesFilter = paymentStatus === "FAILED";
          break;
        case "FULFILLMENT_PENDING":
          matchesFilter = fulfillmentStatus === "PENDING";
          break;
        case "PROCESSING":
          matchesFilter = fulfillmentStatus === "PROCESSING";
          break;
        case "SHIPPED":
          matchesFilter = fulfillmentStatus === "SHIPPED";
          break;
        case "DELIVERED":
          matchesFilter = fulfillmentStatus === "DELIVERED";
          break;
        case "CANCELLED":
          matchesFilter = fulfillmentStatus === "CANCELLED";
          break;
        default:
          break;
      }

      return matchesSearch && matchesFilter;
    });
  }, [orders, search, filter]);

  const paidOrders = orders.filter(
    (order) => order.status.toUpperCase() === "PAID"
  ).length;

  const pendingPaymentOrders = orders.filter(
    (order) => order.status.toUpperCase() === "PENDING"
  ).length;

  // Only paid orders should count as ready for fulfillment.
  const pendingFulfillmentOrders = orders.filter(
    (order) =>
      order.status.toUpperCase() === "PAID" &&
      order.fulfillmentStatus.toUpperCase() === "PENDING"
  ).length;

  const deliveredOrders = orders.filter(
    (order) => order.fulfillmentStatus.toUpperCase() === "DELIVERED"
  ).length;

  return (
    <>
      <div className="orders-page">
        {/* HEADER */}
        <section className="orders-hero">
          <div className="container">
            <div className="orders-hero-content">
              <div>
                <span className="orders-eyebrow">
                  Administration
                </span>

                <h1>Order Management</h1>

                <p>
                  Manage customer orders,
                  payments and fulfillment
                  from one place.
                </p>
              </div>

              <button
                type="button"
                className="orders-refresh"
                onClick={loadOrders}
              >
                ↻ Refresh Orders
              </button>
            </div>
          </div>
        </section>

        {/* STATS */}
        <section className="orders-stats-section">
          <div className="container">
            <div className="orders-stats">
              <div className="orders-stat">
                <div className="orders-stat-icon">
                  🛒
                </div>

                <div>
                  <span>Total Orders</span>
                  <strong>
                    {orders.length}
                  </strong>
                </div>
              </div>

              <div className="orders-stat">
                <div className="orders-stat-icon">
                  ⏳
                </div>

                <div>
                  <span>Pending Payments</span>
                  <strong>
                    {pendingPaymentOrders}
                  </strong>
                </div>
              </div>

              <div className="orders-stat">
                <div className="orders-stat-icon">
                  💳
                </div>

                <div>
                  <span>Paid Orders</span>
                  <strong>
                    {paidOrders}
                  </strong>
                </div>
              </div>

              <div className="orders-stat">
                <div className="orders-stat-icon">
                  📦
                </div>

                <div>
                  <span>Pending Fulfillment</span>
                  <strong>
                    {pendingFulfillmentOrders}
                  </strong>
                </div>
              </div>

              <div className="orders-stat">
                <div className="orders-stat-icon">
                  ✓
                </div>

                <div>
                  <span>Delivered</span>
                  <strong>
                    {deliveredOrders}
                  </strong>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ORDERS */}
        <section className="orders-content">
          <div className="container">
            <div className="orders-panel">
              {/* TOOLBAR */}
              <div className="orders-toolbar">
                <div>
                  <h2>All Orders</h2>

                  <p>
                    {filteredOrders.length}{" "}
                    order
                    {filteredOrders.length !==
                    1
                      ? "s"
                      : ""}{" "}
                    found
                  </p>
                </div>

                <div className="orders-filters">
                  <div className="orders-search">
                    <span>⌕</span>

                    <input
                      type="search"
                      placeholder="Search name, phone, order ID, or reference..."
                      value={search}
                      onChange={(event) =>
                        setSearch(
                          event.target.value
                        )
                      }
                    />
                  </div>

                  <select
                    value={filter}
                    onChange={(event) =>
                      setFilter(
                        event.target.value
                      )
                    }
                    className="orders-select"
                  >
                    <option value="ALL">
                      All orders
                    </option>

                    <optgroup label="Payment status">
                      <option value="PAYMENT_PENDING">
                        Payment pending
                      </option>
                      <option value="PAYMENT_PAID">
                        Paid
                      </option>
                      <option value="PAYMENT_FAILED">
                        Payment failed
                      </option>
                    </optgroup>

                    <optgroup label="Fulfillment status">
                      <option value="FULFILLMENT_PENDING">
                        Awaiting fulfillment
                      </option>
                      <option value="PROCESSING">
                        Processing
                      </option>
                      <option value="SHIPPED">
                        Shipped
                      </option>
                      <option value="DELIVERED">
                        Delivered
                      </option>
                      <option value="CANCELLED">
                        Cancelled
                      </option>
                    </optgroup>
                  </select>
                </div>
              </div>

              {/* LOADING */}
              {loading && (
                <div className="orders-empty">
                  <div className="orders-loader">
                    <span />
                    <span />
                    <span />
                  </div>

                  <h3>
                    Loading orders...
                  </h3>

                  <p>
                    Getting the latest
                    customer orders.
                  </p>
                </div>
              )}

              {/* ERROR */}
              {!loading && error && (
                <div className="orders-empty">
                  <div className="orders-empty-icon">
                    ⚠️
                  </div>

                  <h3>
                    Unable to load orders
                  </h3>

                  <p>{error}</p>

                  <button
                    type="button"
                    className="orders-retry"
                    onClick={loadOrders}
                  >
                    Try Again
                  </button>
                </div>
              )}

              {/* EMPTY */}
              {!loading &&
                !error &&
                filteredOrders.length ===
                  0 && (
                  <div className="orders-empty">
                    <div className="orders-empty-icon">
                      🛍️
                    </div>

                    <h3>
                      No orders found
                    </h3>

                    <p>
                      Try changing your
                      search or filter.
                    </p>
                  </div>
                )}

              {/* DESKTOP TABLE */}
              {!loading &&
                !error &&
                filteredOrders.length >
                  0 && (
                  <div className="orders-table-wrapper">
                    <table className="orders-table">
                      <thead>
                        <tr>
                          <th>Order</th>
                          <th>Customer</th>
                          <th>Total</th>
                          <th>Payment</th>
                          <th>Fulfillment</th>
                          <th>Date</th>
                          <th />
                        </tr>
                      </thead>

                      <tbody>
                        {filteredOrders.map(
                          (order) => (
                            <tr
                              key={order.id}
                            >
                              <td>
                                <div className="order-id">
                                  {shortOrderId(
                                    order.id
                                  )}
                                </div>

                                <div className="order-item-count">
                                  {
                                    order
                                      .orderItems
                                      .length
                                  }{" "}
                                  item
                                  {order
                                    .orderItems
                                    .length !==
                                  1
                                    ? "s"
                                    : ""}
                                </div>
                              </td>

                              <td>
                                <div className="order-customer">
                                  <div className="customer-avatar">
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
                                <strong className="order-total">
                                  {formatNaira(
                                    order.total
                                  )}
                                </strong>
                              </td>

                              <td>
                                <span
                                  className={getPaymentClass(
                                    order.status
                                  )}
                                >
                                  <i />
                                  {
                                    order.status
                                  }
                                </span>
                              </td>

                              <td>
                                <FulfillmentStatusSelect
                                  orderId={order.id}
                                  value={order.fulfillmentStatus}
                                  paymentStatus={order.status}
                                  onUpdated={
                                    handleFulfillmentUpdated
                                  }
                                />
                              </td>

                              <td>
                                <span className="order-date">
                                  {formatDate(
                                    order.createdAt
                                  )}
                                </span>
                              </td>

                              <td>
                                <button
                                  type="button"
                                  className="order-view-button"
                                  onClick={() =>
                                    setSelectedOrder(
                                      order
                                    )
                                  }
                                >
                                  View
                                  <span>
                                    →
                                  </span>
                                </button>
                              </td>
                            </tr>
                          )
                        )}
                      </tbody>
                    </table>
                  </div>
                )}

              {/* MOBILE CARDS */}
              {!loading &&
                !error &&
                filteredOrders.length >
                  0 && (
                  <div className="orders-mobile-list">
                    {filteredOrders.map(
                      (order) => (
                        <div
                          className="mobile-order-card"
                          key={order.id}
                        >
                          <div className="mobile-order-top">
                            <div>
                              <strong>
                                {shortOrderId(
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
                          </div>

                          <div className="mobile-order-customer">
                            <div className="customer-avatar">
                              {order.customer
                                .charAt(0)
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

                          <div className="mobile-order-status">
                            <span
                              className={getPaymentClass(
                                order.status
                              )}
                            >
                              <i />
                              {
                                order.status
                              }
                            </span>

                            <FulfillmentStatusSelect
                              orderId={order.id}
                              value={order.fulfillmentStatus}
                              paymentStatus={order.status}
                              onUpdated={
                                handleFulfillmentUpdated
                              }
                            />
                          </div>

                          <button
                            type="button"
                            className="mobile-order-view"
                            onClick={() =>
                              setSelectedOrder(
                                order
                              )
                            }
                          >
                            View Order →
                          </button>
                        </div>
                      )
                    )}
                  </div>
                )}
            </div>
          </div>
        </section>
      </div>

      {/* ORDER MODAL */}
      {selectedOrder && (
        <div
          className="order-modal-backdrop"
          onClick={() =>
            setSelectedOrder(null)
          }
        >
          <div
            className="order-modal"
            onClick={(event) =>
              event.stopPropagation()
            }
          >
            <div className="order-modal-header">
              <div>
                <span>
                  {shortOrderId(
                    selectedOrder.id
                  )}
                </span>

                <h2>Order Details</h2>

                <p>
                  {formatDate(
                    selectedOrder.createdAt
                  )}
                </p>
              </div>

              <button
                type="button"
                className="order-modal-close"
                onClick={() =>
                  setSelectedOrder(null)
                }
              >
                ×
              </button>
            </div>

            <div className="order-modal-body">
              {/* CUSTOMER */}
              <div className="order-detail-section">
                <div className="order-detail-heading">
                  <span>👤</span>
                  <div>
                    <h3>
                      Customer Information
                    </h3>
                    <p>
                      Customer details
                    </p>
                  </div>
                </div>

                <div className="customer-detail-card">
                  <div className="customer-avatar large">
                    {selectedOrder.customer
                      .charAt(0)
                      .toUpperCase()}
                  </div>

                  <div>
                    <strong>
                      {
                        selectedOrder.customer
                      }
                    </strong>

                    <span>
                      {selectedOrder.email}
                    </span>

                    <span>
                      {selectedOrder.phone}
                    </span>
                  </div>
                </div>
              </div>

              {/* ADDRESS */}
              <div className="order-detail-section">
                <div className="order-detail-heading">
                  <span>📍</span>

                  <div>
                    <h3>
                      Delivery Address
                    </h3>

                    <p>
                      Where the order should
                      be delivered
                    </p>
                  </div>
                </div>

                <div className="order-address-card">
                  {
                    selectedOrder.address
                  }
                </div>
              </div>

              {/* PRODUCTS */}
              <div className="order-detail-section">
                <div className="order-detail-heading">
                  <span>🛍️</span>

                  <div>
                    <h3>
                      Ordered Products
                    </h3>

                    <p>
                      {
                        selectedOrder
                          .orderItems
                          .length
                      }{" "}
                      product
                      {selectedOrder
                        .orderItems
                        .length !== 1
                        ? "s"
                        : ""}
                    </p>
                  </div>
                </div>

                <div className="order-products">
                  {selectedOrder.orderItems.map(
                    (item) => (
                      <div
                        className="order-product"
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

                        <div className="order-product-info">
                          <strong>
                            {
                              item.product
                                .name
                            }
                          </strong>

                          <span>
                            {item.quantity} ×{" "}
                            {formatNaira(
                              item.price
                            )}
                          </span>
                        </div>

                        <strong>
                          {formatNaira(
                            item.price *
                              item.quantity
                          )}
                        </strong>
                      </div>
                    )
                  )}
                </div>
              </div>

              {/* PAYMENT */}
              <div className="order-detail-section">
                <div className="order-detail-heading">
                  <span>💳</span>

                  <div>
                    <h3>
                      Payment Information
                    </h3>

                    <p>
                      Payment and order
                      information
                    </p>
                  </div>
                </div>

                <div className="payment-detail-card">
                  <div>
                    <span>
                      Payment Status
                    </span>

                    <strong>
                      <span
                        className={getPaymentClass(
                          selectedOrder.status
                        )}
                      >
                        <i />
                        {
                          selectedOrder.status
                        }
                      </span>
                    </strong>
                  </div>
                  <div className="detail-item">
  <span>Inventory Status</span>
  <strong>{selectedOrder.inventoryStatus}</strong>
</div>

                  <div>
                    <span>
                      Fulfillment
                    </span>

                    <strong>
                      <FulfillmentStatusSelect
                        orderId={selectedOrder.id}
                        value={
                          selectedOrder.fulfillmentStatus
                        }
                        paymentStatus={
                          selectedOrder.status
                        }
                        onUpdated={
                          handleFulfillmentUpdated
                        }
                      />
                    </strong>
                  </div>

                  {selectedOrder.paymentChannel && (
                    <div>
                      <span>
                        Payment Channel
                      </span>

                      <strong>
                        {
                          selectedOrder.paymentChannel
                        }
                      </strong>
                    </div>
                  )}

                  {selectedOrder.paymentReference && (
                    <div>
                      <span>
                        Payment Reference
                      </span>

                      <strong>
                        {
                          selectedOrder.paymentReference
                        }
                      </strong>
                    </div>
                  )}

                  {selectedOrder.paidAt && (
                    <div>
                      <span>
                        Paid At
                      </span>

                      <strong>
                        {formatDate(selectedOrder.paidAt)}
                      </strong>
                    </div>
                  )}
                </div>
              </div>

              {/* TOTAL */}
              <div className="order-grand-total">
                <span>
                  Order Total
                </span>

                <strong>
                  {formatNaira(
                    selectedOrder.total
                  )}
                </strong>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}