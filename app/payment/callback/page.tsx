"use client";

import { useEffect, useState } from "react";

type VerifiedOrder = {
  id: string;
  total: number;
  status: string;
};

type VerificationResponse = {
  success?: boolean;
  paid?: boolean;
  message?: string;
  reference?: string;
  order?: VerifiedOrder;
};

const MAX_ATTEMPTS = 4;
const RETRY_DELAY_MS = 2000;

function wait(ms: number) {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

export default function PaymentCallbackPage() {
  const [message, setMessage] = useState(
    "Verifying your payment..."
  );

  const [error, setError] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [reference, setReference] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function verifyPayment() {
      const params = new URLSearchParams(
        window.location.search
      );

      const paymentReference =
        params.get("reference") ||
        params.get("trxref");

      if (!paymentReference) {
        setError(true);
        setMessage(
          "We could not find your payment reference. Please contact Simplyire support before attempting another payment."
        );
        return;
      }

      setReference(paymentReference);

      for (
        let currentAttempt = 1;
        currentAttempt <= MAX_ATTEMPTS;
        currentAttempt++
      ) {
        if (cancelled) return;

        setAttempt(currentAttempt);
        setRetrying(currentAttempt > 1);
        setError(false);

        setMessage(
          currentAttempt === 1
            ? "Please wait while we securely verify your payment."
            : `Your payment is taking longer than expected. Retrying verification (${currentAttempt}/${MAX_ATTEMPTS})...`
        );

        try {
          const controller = new AbortController();

          const timeoutId = window.setTimeout(() => {
            controller.abort();
          }, 15000);

          let response: Response;

          try {
            response = await fetch(
              `/api/payments/verify?reference=${encodeURIComponent(
                paymentReference
              )}`,
              {
                method: "GET",
                cache: "no-store",
                signal: controller.signal,
                headers: {
                  Accept: "application/json",
                },
              }
            );
          } finally {
            window.clearTimeout(timeoutId);
          }

          const data =
            (await response
              .json()
              .catch(() => null)) as
              | VerificationResponse
              | null;

          if (cancelled) return;

          /*
           * Never treat a payment as successful based
           * on the URL alone. The server must verify it.
           */
          if (
            response.ok &&
            data?.success === true &&
            data.paid === true &&
            data.order?.id &&
            data.order.status === "PAID"
          ) {
            const order = data.order;

            /*
             * Browser storage is helpful for displaying
             * the order, but storage failure must not
             * undo a server-confirmed payment.
             */
            try {
              localStorage.removeItem(
                "simplyire-cart"
              );
            } catch (storageError) {
              console.warn(
                "Could not clear the local cart:",
                storageError
              );
            }

            try {
              sessionStorage.setItem(
                "simplyire-last-order",
                JSON.stringify({
                  id: order.id,
                  orderId: order.id,
                  total: order.total,
                  status: order.status,
                  paymentReference:
                    data.reference || paymentReference,
                })
              );

              sessionStorage.setItem(
                "simplyire-payment-verified",
                "true"
              );
            } catch (storageError) {
              console.warn(
                "Could not save order details:",
                storageError
              );
            }

            setRetrying(false);
            setError(false);

            setMessage(
              "Payment confirmed! Redirecting you to your order..."
            );

            /*
             * Give the customer a moment to read the
             * confirmation before navigating.
             */
            window.setTimeout(() => {
              if (!cancelled) {
                window.location.replace(
                  "/order-success"
                );
              }
            }, 500);

            return;
          }

          /*
           * A pending payment may need more time to
           * become visible to Paystack verification.
           */
          if (
            response.ok &&
            data?.success === true &&
            data.paid === false
          ) {
            if (currentAttempt < MAX_ATTEMPTS) {
              await wait(RETRY_DELAY_MS);

              if (cancelled) return;

              continue;
            }

            setError(true);
            setRetrying(false);

            setMessage(
              "Your payment has not yet been confirmed. Do not pay again yet. Please retry verification or contact Simplyire support if you were charged."
            );

            return;
          }

          /*
           * Retry temporary server errors. Other
           * verification errors are shown to the user.
           */
          if (
            response.status >= 500 &&
            currentAttempt < MAX_ATTEMPTS
          ) {
            await wait(RETRY_DELAY_MS);

            if (cancelled) return;

            continue;
          }

          throw new Error(
            data?.message ||
              "We could not verify your payment. Please contact support before trying to pay again."
          );
        } catch (verificationError) {
          if (cancelled) return;

          console.error(
            `Payment verification attempt ${currentAttempt} failed:`,
            verificationError
          );

          if (currentAttempt < MAX_ATTEMPTS) {
            await wait(RETRY_DELAY_MS);

            if (cancelled) return;

            continue;
          }

          setError(true);
          setRetrying(false);

          if (
            verificationError instanceof Error &&
            verificationError.name === "AbortError"
          ) {
            setMessage(
              "The payment verification request timed out. Your payment may still have succeeded. Retry verification before attempting another payment."
            );
          } else {
            setMessage(
              verificationError instanceof Error
                ? verificationError.message
                : "We could not verify your payment. Please contact support before attempting another payment."
            );
          }

          return;
        }
      }
    }

    void verifyPayment();

    return () => {
      cancelled = true;
    };
  }, []);

  function retryVerification() {
    if (!reference) {
      window.location.reload();
      return;
    }

    /*
     * Reload the callback to start a fresh verification
     * cycle using the existing Paystack reference.
     */
    window.location.reload();
  }

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
          padding: "36px 24px",
          border: "1px solid #eedde4",
          borderRadius: "22px",
          background: "#ffffff",
          textAlign: "center",
          boxShadow:
            "0 15px 45px rgba(88, 40, 59, 0.08)",
        }}
      >
        <div
          style={{
            width: "58px",
            height: "58px",
            margin: "0 auto 18px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: "50%",
            background: error
              ? "#fff0f1"
              : "#fff0f5",
            color: error ? "#bd5661" : "#c66686",
            fontSize: "25px",
          }}
          aria-hidden="true"
        >
          {error ? "!" : retrying ? "↻" : "⏳"}
        </div>

        <h1
          style={{
            margin: 0,
            color: "#3b2932",
            fontSize: "25px",
          }}
        >
          {error
            ? "Payment Verification"
            : "Verifying Payment"}
        </h1>

        <p
          role="status"
          aria-live="polite"
          style={{
            marginTop: "12px",
            color: "#907b84",
            lineHeight: 1.7,
            fontSize: "14px",
          }}
        >
          {message}
        </p>

        {!error && (
          <p
            style={{
              marginTop: "8px",
              color: "#a18c95",
              fontSize: "12px",
            }}
          >
            {retrying
              ? `Verification attempt ${attempt} of ${MAX_ATTEMPTS}`
              : "Please keep this page open."}
          </p>
        )}

        {error && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "12px",
              marginTop: "24px",
            }}
          >
            <button
              type="button"
              onClick={retryVerification}
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                border: "none",
                borderRadius: "10px",
                background: "#c66686",
                padding: "13px 17px",
                color: "#fff",
                fontSize: "13px",
                fontWeight: 800,
                cursor: "pointer",
              }}
            >
              Retry Verification
            </button>

            <a
              href="/contact"
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: "10px",
                border: "1px solid #eedde4",
                background: "#ffffff",
                padding: "12px 17px",
                color: "#8d5269",
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