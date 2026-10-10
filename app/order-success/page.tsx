"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type OrderData = {
  id: string;
  total: number;
  status: string;
  paymentReference?: string;
};

function formatNaira(amount: number) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(amount);
}

function shortOrderId(id: string) {
  return `#${id.slice(-8).toUpperCase()}`;
}

export default function OrderSuccessPage() {
  const [order, setOrder] =
    useState<OrderData | null>(null);

  const [loading, setLoading] =
    useState(true);

  useEffect(() => {
    try {
      const saved =
        sessionStorage.getItem(
          "simplyire-last-order"
        );

      if (saved) {
        // Read browser storage after hydration to avoid server/client mismatch.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setOrder(JSON.parse(saved));
      }
    } catch (error) {
      console.error(
        "Failed to load order:",
        error
      );
    } finally {
      setLoading(false);
    }
  }, []);

  if (loading) {
    return (
      <main
        style={{
          minHeight: "70vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#fff9fb",
        }}
      >
        <p>Loading your order...</p>
      </main>
    );
  }

  if (!order) {
    return (
      <main
        style={{
          minHeight: "70vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "30px",
          background: "#fff9fb",
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: "520px",
            padding: "40px",
            borderRadius: "22px",
            background: "#fff",
            border: "1px solid #eedde4",
            textAlign: "center",
          }}
        >
          <h1>Order Information</h1>

          <p>
            We couldn&apos;t find the recently
            completed order.
          </p>

          <Link href="/shop">
            Return to Shop
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main
      style={{
        minHeight: "75vh",
        padding: "55px 20px",
        background:
          "linear-gradient(135deg,#fff0f5,#fff9fb)",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "680px",
          margin: "0 auto",
        }}
      >
        <div
          style={{
            padding: "42px",
            borderRadius: "25px",
            background: "#fff",
            border: "1px solid #eedde4",
            boxShadow:
              "0 20px 60px rgba(88,40,59,0.08)",
            textAlign: "center",
          }}
        >
          <div
            style={{
              width: "68px",
              height: "68px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 20px",
              borderRadius: "50%",
              background: "#e9f8ef",
              color: "#2e8955",
              fontSize: "30px",
              fontWeight: 800,
            }}
          >
            ✓
          </div>

          <span
            style={{
              display: "block",
              marginBottom: "8px",
              color: "#c26083",
              fontSize: "11px",
              fontWeight: 800,
              letterSpacing: "0.16em",
              textTransform: "uppercase",
            }}
          >
            Simplyire Essentials
          </span>

          <h1
            style={{
              margin: 0,
              color: "#34252d",
              fontSize: "32px",
            }}
          >
            Payment Successful
          </h1>

          <p
            style={{
              marginTop: "12px",
              color: "#8f7a83",
              lineHeight: 1.6,
            }}
          >
            Thank you for shopping with
            Simplyire Essentials. Your
            payment has been confirmed.
          </p>

          <div
            style={{
              marginTop: "28px",
              border: "1px solid #eedfe5",
              borderRadius: "15px",
              overflow: "hidden",
              textAlign: "left",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent:
                  "space-between",
                gap: "20px",
                padding: "15px 17px",
                borderBottom:
                  "1px solid #f2e7eb",
              }}
            >
              <span
                style={{
                  color: "#96818a",
                  fontSize: "12px",
                }}
              >
                Order Number
              </span>

              <strong
                style={{
                  color: "#46313a",
                  fontSize: "12px",
                }}
              >
                {shortOrderId(order.id)}
              </strong>
            </div>

            <div
              style={{
                display: "flex",
                justifyContent:
                  "space-between",
                gap: "20px",
                padding: "15px 17px",
                borderBottom:
                  "1px solid #f2e7eb",
              }}
            >
              <span
                style={{
                  color: "#96818a",
                  fontSize: "12px",
                }}
              >
                Payment Status
              </span>

              <strong
                style={{
                  color: "#2e8955",
                  fontSize: "12px",
                }}
              >
                PAID ✓
              </strong>
            </div>

            <div
              style={{
                display: "flex",
                justifyContent:
                  "space-between",
                gap: "20px",
                padding: "15px 17px",
              }}
            >
              <span
                style={{
                  color: "#96818a",
                  fontSize: "12px",
                }}
              >
                Total
              </span>

              <strong
                style={{
                  color: "#46313a",
                  fontSize: "15px",
                }}
              >
                {formatNaira(
                  order.total
                )}
              </strong>
            </div>
          </div>

          {order.paymentReference && (
            <p
              style={{
                marginTop: "15px",
                color: "#a18d95",
                fontSize: "10px",
                wordBreak: "break-all",
              }}
            >
              Payment reference:{" "}
              {order.paymentReference}
            </p>
          )}

          <div
            style={{
              display: "flex",
              justifyContent: "center",
              gap: "10px",
              flexWrap: "wrap",
              marginTop: "28px",
            }}
          >
            <Link
              href="/dashboard"
              style={{
                borderRadius: "10px",
                background: "#c66686",
                padding: "12px 17px",
                color: "white",
                fontSize: "12px",
                fontWeight: 800,
                textDecoration: "none",
              }}
            >
              Track My Order →
            </Link>

            <Link
              href="/shop"
              style={{
                border: "1px solid #e5c4d1",
                borderRadius: "10px",
                background: "#fff4f7",
                padding: "11px 17px",
                color: "#a65170",
                fontSize: "12px",
                fontWeight: 800,
                textDecoration: "none",
              }}
            >
              Continue Shopping
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}