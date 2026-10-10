"use client";

import { useEffect, useState } from "react";

type VerifiedOrder = {
  id: string;
  total: number;
  status: string;
};

export default function PaymentCallbackPage() {
  const [message, setMessage] = useState(
    "Verifying your payment..."
  );

  const [error, setError] = useState(false);

  useEffect(() => {
    async function verifyPayment() {
      try {
        const params = new URLSearchParams(
          window.location.search
        );

        const reference =
          params.get("reference") ||
          params.get("trxref");

        if (!reference) {
          throw new Error(
            "Payment reference was not found."
          );
        }

        const response = await fetch(
          `/api/payments/verify?reference=${encodeURIComponent(
            reference
          )}`,
          {
            cache: "no-store",
          }
        );

        const data = await response.json();

        if (
          !response.ok ||
          !data.success ||
          !data.paid ||
          !data.order
        ) {
          throw new Error(
            data.message ||
              "Payment could not be verified."
          );
        }

        const order =
          data.order as VerifiedOrder;

        /*
          Clear the cart ONLY after the server
          has confirmed that Paystack payment
          was successful.
        */
        localStorage.removeItem(
          "simplyire-cart"
        );

        /*
          Save the verified order so the
          order-success page can display it.
        */
        sessionStorage.setItem(
          "simplyire-last-order",
          JSON.stringify({
            id: order.id,
            total: order.total,
            status: order.status,
            paymentReference:
              data.payment?.reference ??
              reference,
          })
        );

        sessionStorage.setItem(
          "simplyire-payment-verified",
          "true"
        );

        setMessage(
          "Payment confirmed. Taking you to your order..."
        );

        /*
          Force a full page load so the CartProvider
          starts again with the now-empty cart.
        */
        window.location.replace(
          "/order-success"
        );
      } catch (error) {
        console.error(
          "Payment callback error:",
          error
        );

        setError(true);

        setMessage(
          error instanceof Error
            ? error.message
            : "We could not verify your payment."
        );
      }
    }

    verifyPayment();
  }, []);

  return (
    <main
      style={{
        minHeight: "70vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "40px 20px",
        background: "#fff9fb",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "520px",
          padding: "36px",
          border: "1px solid #eedde4",
          borderRadius: "22px",
          background: "#ffffff",
          textAlign: "center",
          boxShadow:
            "0 15px 45px rgba(88, 40, 59, 0.08)",
        }}
      >
        {!error ? (
          <>
            <div
              style={{
                width: "58px",
                height: "58px",
                margin: "0 auto 18px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: "50%",
                background: "#fff0f5",
                fontSize: "25px",
              }}
            >
              ⏳
            </div>

            <h1
              style={{
                margin: 0,
                color: "#3b2932",
                fontSize: "25px",
              }}
            >
              Verifying Payment
            </h1>
          </>
        ) : (
          <>
            <div
              style={{
                width: "58px",
                height: "58px",
                margin: "0 auto 18px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: "50%",
                background: "#fff0f1",
                color: "#bd5661",
                fontSize: "25px",
              }}
            >
              !
            </div>

            <h1
              style={{
                margin: 0,
                color: "#3b2932",
                fontSize: "25px",
              }}
            >
              Payment Verification
            </h1>
          </>
        )}

        <p
          style={{
            marginTop: "12px",
            color: "#907b84",
            lineHeight: 1.6,
            fontSize: "14px",
          }}
        >
          {message}
        </p>

        {error && (
          <div
            style={{
              marginTop: "20px",
            }}
          >
            <a
              href="/contact"
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: "10px",
                background: "#c66686",
                padding: "11px 17px",
                color: "#fff",
                fontSize: "12px",
                fontWeight: 800,
                textDecoration: "none",
              }}
            >
              Contact Simplyire
            </a>
          </div>
        )}
      </div>
    </main>
  );
}