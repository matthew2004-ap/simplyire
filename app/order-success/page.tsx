"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type OrderData = {
  id: string;
  total: number;
  status: string;
  paymentReference?: string | null;
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
  const [order, setOrder] = useState<OrderData | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadOrder() {
      try {
        /*
         * Read the order information saved by the payment callback.
         */
        let savedOrder: OrderData | null = null;

        try {
          const saved = sessionStorage.getItem(
            "simplyire-last-order",
          );

          if (saved) {
            const parsed: unknown = JSON.parse(saved);

            if (
              parsed &&
              typeof parsed === "object" &&
              "id" in parsed &&
              typeof parsed.id === "string" &&
              "paymentReference" in parsed &&
              typeof parsed.paymentReference === "string"
            ) {
              savedOrder = parsed as OrderData;
            }
          }
        } catch (storageError) {
          console.warn(
            "Could not read saved order information:",
            storageError,
          );
        }

        if (!savedOrder?.id || !savedOrder.paymentReference) {
          if (!cancelled) {
            setMessage(
              "We couldn't retrieve your payment confirmation. Please return to the payment callback or contact Simplyire support.",
            );
          }

          return;
        }

        /*
         * Independently ask the server to verify the payment.
         * Do not trust browser storage as proof of payment.
         */
        const response = await fetch(
          `/api/payments/verify?reference=${encodeURIComponent(
            savedOrder.paymentReference,
          )}`,
          {
            method: "GET",
            cache: "no-store",
            headers: {
              Accept: "application/json",
            },
            signal: AbortSignal.timeout(15000),
          },
        );

        const data = await response.json().catch(() => null);

        if (
          !response.ok ||
          data?.success !== true ||
          data?.paid !== true ||
          !data?.order ||
          data.order.id !== savedOrder.id ||
          data.order.status !== "PAID"
        ) {
          if (!cancelled) {
            setMessage(
              "Your payment has not been confirmed on this page yet. Please retry verification before attempting another payment.",
            );
          }

          return;
        }

        const verifiedOrder: OrderData = {
          id: data.order.id,
          total: data.order.total,
          status: data.order.status,
          paymentReference:
            data.reference || savedOrder.paymentReference,
        };

        if (!cancelled) {
          setOrder(verifiedOrder);
        }

        /*
         * Update local storage only after server confirmation.
         */
        try {
          sessionStorage.setItem(
            "simplyire-last-order",
            JSON.stringify(verifiedOrder),
          );

          sessionStorage.setItem(
            "simplyire-payment-verified",
            "true",
          );
        } catch (storageError) {
          console.warn(
            "Could not update saved order information:",
            storageError,
          );
        }
      } catch (error) {
        console.error(
          "Order confirmation error:",
          error,
        );

        if (!cancelled) {
          setMessage(
            "We couldn't confirm your order right now. Check your connection and retry verification.",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadOrder();

    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
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
        <p style={{ color: "#907b84" }}>
          Verifying your payment and loading your order...
        </p>
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
          padding: "30px 20px",
          background: "#fff9fb",
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: "520px",
            padding: "40px 25px",
            borderRadius: "22px",
            background: "#fff",
            border: "1px solid #eedde4",
            textAlign: "center",
            boxShadow:
              "0 15px 45px rgba(88, 40, 59, 0.08)",
          }}
        >
          <h1
            style={{
              color: "#3b2932",
              fontSize: "24px",
            }}
          >
            Order Confirmation
          </h1>

          <p
            role="status"
            style={{
              color: "#907b84",
              lineHeight: 1.7,
              fontSize: "14px",
            }}
          >
            {message ||
              "We couldn't retrieve your order confirmation."}
          </p>

          <div
            style={{
              display: "flex",
              justifyContent: "center",
              gap: "12px",
              flexWrap: "wrap",
              marginTop: "24px",
            }}
          >
            <Link
              href="/shop"
              style={{
                display: "inline-block",
                borderRadius: "10px",
                background: "#c66686",
                padding: "12px 17px",
                color: "#fff",
                fontSize: "12px",
                fontWeight: 800,
                textDecoration: "none",
              }}
            >
              Return to Shop
            </Link>

            <Link
              href="/contact"
              style={{
                display: "inline-block",
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
              Contact Simplyire
            </Link>
          </div>
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
            padding: "42px 24px",
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
            Thank you for shopping with Simplyire Essentials.
            Your payment has been verified successfully.
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
                justifyContent: "space-between",
                gap: "20px",
                padding: "15px 17px",
                borderBottom: "1px solid #f2e7eb",
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
                justifyContent: "space-between",
                gap: "20px",
                padding: "15px 17px",
                borderBottom: "1px solid #f2e7eb",
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
                justifyContent: "space-between",
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
                {formatNaira(order.total)}
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
              Payment reference: {order.paymentReference}
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