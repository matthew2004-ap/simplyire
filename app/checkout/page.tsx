"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useCart } from "@/context/CartContext";
import { formatNaira } from "@/lib/utils";

type CheckoutForm = {
  name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
};

type OrderResponse = {
  success: boolean;
  message?: string;
  order?: {
    id: string;
    total: number;
    status: string;
    fulfillmentStatus?: string;
    inventoryStatus?: string;
    reservationExpiresAt?: string | null;
  };
};

type PaymentResponse = {
  success: boolean;
  message?: string;
  authorizationUrl?: string;
  accessCode?: string;
  reference?: string;
};

export default function CheckoutPage() {
  const { items, subtotal } = useCart();

  const [form, setForm] = useState<CheckoutForm>({
    name: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    state: "",
  });

  const [loading, setLoading] = useState(false);
  const [profilePrefilled, setProfilePrefilled] = useState(false);

  const deliveryFee = subtotal >= 50000 ? 0 : 2500;
  const total = subtotal + deliveryFee;

  useEffect(() => {
    let active = true;

    async function prefillFromProfile() {
      try {
        const response = await fetch("/api/account/profile", {
          cache: "no-store",
        });

        if (!response.ok) return;

        const data = await response.json();

        if (!active || !data.success || !data.profile) {
          return;
        }

        const profile = data.profile;

        setForm((current) => ({
          ...current,
          name: current.name || profile.name || "",
          email: current.email || profile.email || "",
          phone: current.phone || profile.phone || "",
          address: current.address || profile.address || "",
          city: current.city || profile.city || "",
          state: current.state || profile.state || "",
        }));

        setProfilePrefilled(true);
      } catch {
        // Guest checkout remains available if no profile exists.
      }
    }

    void prefillFromProfile();

    return () => {
      active = false;
    };
  }, []);

  function handleChange(
    event: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) {
    const { name, value } = event.target;

    setForm((current) => ({
      ...current,
      [name]: value,
    }));
  }

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (loading) return;

    if (items.length === 0) {
      alert("Your cart is empty. Please add products before checkout.");
      return;
    }

    setLoading(true);

    try {
      /*
       * STEP 1:
       * Create the order on the server.
       */
      const orderResponse = await fetch("/api/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          customer: form.name.trim(),
          email: form.email.trim(),
          phone: form.phone.trim(),
          address: form.address.trim(),
          city: form.city.trim(),
          state: form.state.trim(),
          items: items.map((item) => ({
            productId: item.id,
            quantity: item.quantity,
          })),
        }),
        cache: "no-store",
      });

      const orderData =
        (await orderResponse.json().catch(() => null)) as
          | OrderResponse
          | null;

      if (
        !orderResponse.ok ||
        !orderData?.success ||
        !orderData.order?.id
      ) {
        throw new Error(
          orderData?.message || "Unable to create your order."
        );
      }

      const order = orderData.order;

      /*
       * STEP 2:
       * Save basic order details for the callback and
       * order-success pages.
       *
       * Storage failure must not prevent payment from
       * continuing.
       */
      try {
        sessionStorage.setItem(
          "simplyire-last-order",
          JSON.stringify({
            id: order.id,
            orderId: order.id,
            total: order.total,
            status: order.status,
            customer: form.name.trim(),
            email: form.email.trim(),
          })
        );
      } catch (storageError) {
        console.warn(
          "Could not save order details in session storage:",
          storageError
        );
      }

      /*
       * STEP 3:
       * Initialize Paystack payment.
       */
      const paymentResponse = await fetch(
        "/api/payments/initialize",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            orderId: order.id,
          }),
          cache: "no-store",
        }
      );

      const paymentData =
        (await paymentResponse.json().catch(() => null)) as
          | PaymentResponse
          | null;

      if (
        !paymentResponse.ok ||
        !paymentData?.success
      ) {
        throw new Error(
          paymentData?.message ||
            "Unable to initialize payment. Please contact support if your order was created."
        );
      }

      /*
       * STEP 4:
       * Confirm that the server returned a valid HTTPS
       * Paystack authorization URL.
       *
       * The initialize API returns authorizationUrl
       * at the top level, not inside payment.
       */
      const authorizationUrl = paymentData.authorizationUrl;

      if (
        typeof authorizationUrl !== "string" ||
        !authorizationUrl.startsWith("https://")
      ) {
        throw new Error(
          "The payment link was not returned correctly. Please contact support before creating another order."
        );
      }

      /*
       * STEP 5:
       * Redirect the customer to Paystack.
       *
       * This works with normal mobile and desktop
       * browser navigation.
       */
      window.location.assign(authorizationUrl);
    } catch (error) {
      console.error("Checkout error:", error);

      alert(
        error instanceof Error
          ? error.message
          : "Something went wrong during checkout. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  if (items.length === 0) {
    return (
      <div className="page">
        <section className="page-hero">
          <div className="container">
            <span className="eyebrow">Checkout</span>

            <h1>Your cart is empty.</h1>

            <p>
              Add some products before continuing to checkout.
            </p>
          </div>
        </section>

        <section className="section container">
          <Link href="/shop" className="btn btn-primary">
            Continue Shopping
          </Link>
        </section>
      </div>
    );
  }

  return (
    <div className="page">
      {/* Checkout Header */}
      <section className="page-hero">
        <div className="container">
          <span className="eyebrow">Checkout</span>

          <h1>Complete your order.</h1>

          <p>
            Enter your delivery information below.
          </p>
        </div>
      </section>

      {/* Checkout Content */}
      <section className="section container">
        <div className="checkout-layout">
          {/* Customer Form */}
          <form
            className="checkout-form"
            onSubmit={handleSubmit}
          >
            {/* Customer Information */}
            <div className="checkout-card">
              <h2>Customer information</h2>

              {profilePrefilled && (
                <p className="checkout-profile-note">
                  We filled in details from your saved profile.
                  You can change them for this order.{" "}
                  <Link href="/profile">
                    Edit your profile
                  </Link>
                </p>
              )}

              <div className="form-group">
                <label htmlFor="name">
                  Full name
                </label>

                <input
                  id="name"
                  name="name"
                  type="text"
                  value={form.name}
                  onChange={handleChange}
                  placeholder="Enter your full name"
                  autoComplete="name"
                  required
                />
              </div>

              <div className="form-grid">
                <div className="form-group">
                  <label htmlFor="email">
                    Email address
                  </label>

                  <input
                    id="email"
                    name="email"
                    type="email"
                    value={form.email}
                    onChange={handleChange}
                    placeholder="you@example.com"
                    autoComplete="email"
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="phone">
                    Phone number
                  </label>

                  <input
                    id="phone"
                    name="phone"
                    type="tel"
                    value={form.phone}
                    onChange={handleChange}
                    placeholder="08012345678"
                    autoComplete="tel"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Delivery Information */}
            <div className="checkout-card">
              <h2>Delivery information</h2>

              <div className="form-group">
                <label htmlFor="address">
                  Delivery address
                </label>

                <textarea
                  id="address"
                  name="address"
                  value={form.address}
                  onChange={handleChange}
                  placeholder="Enter your full delivery address"
                  autoComplete="street-address"
                  rows={4}
                  required
                />
              </div>

              <div className="form-grid">
                <div className="form-group">
                  <label htmlFor="city">
                    City
                  </label>

                  <input
                    id="city"
                    name="city"
                    type="text"
                    value={form.city}
                    onChange={handleChange}
                    placeholder="e.g. Ilorin"
                    autoComplete="address-level2"
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="state">
                    State
                  </label>

                  <select
                    id="state"
                    name="state"
                    value={form.state}
                    onChange={handleChange}
                    autoComplete="address-level1"
                    required
                  >
                    <option value="">
                      Select state
                    </option>

                    <option value="Kwara">Kwara</option>
                    <option value="Lagos">Lagos</option>
                    <option value="Abuja">FCT Abuja</option>
                    <option value="Oyo">Oyo</option>
                    <option value="Rivers">Rivers</option>
                    <option value="Ogun">Ogun</option>
                    <option value="Kaduna">Kaduna</option>
                    <option value="Enugu">Enugu</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              className="btn btn-primary full"
              disabled={loading}
            >
              {loading
                ? "Processing..."
                : `Continue to payment · ${formatNaira(total)}`}
            </button>
          </form>

          {/* Order Summary */}
          <aside className="checkout-summary">
            <h2>Your order</h2>

            <div className="checkout-products">
              {items.map((item) => (
                <div
                  className="checkout-product"
                  key={item.id}
                >
                  <img
                    src={item.image}
                    alt={item.name}
                  />

                  <div>
                    <strong>{item.name}</strong>

                    <span>
                      {item.quantity} ×{" "}
                      {formatNaira(item.price)}
                    </span>
                  </div>

                  <strong>
                    {formatNaira(
                      item.price * item.quantity
                    )}
                  </strong>
                </div>
              ))}
            </div>

            <div className="summary-divider" />

            <div className="summary-row">
              <span>Subtotal</span>

              <strong>
                {formatNaira(subtotal)}
              </strong>
            </div>

            <div className="summary-row">
              <span>Delivery</span>

              <strong>
                {deliveryFee === 0
                  ? "FREE"
                  : formatNaira(deliveryFee)}
              </strong>
            </div>

            <div className="summary-divider" />

            <div className="summary-total">
              <span>Total</span>

              <strong>
                {formatNaira(total)}
              </strong>
            </div>
          </aside>
        </div>
      </section>
    </div>
  );
}