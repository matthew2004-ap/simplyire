"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useCart } from "@/context/CartContext";
import { formatNaira } from "@/lib/utils";

export default function CheckoutPage() {
  const {
    items,
    subtotal,
  } = useCart();

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    state: "",
  });

  const [loading, setLoading] = useState(false);
  const [profilePrefilled, setProfilePrefilled] = useState(false);

  useEffect(() => {
    let active = true;

    async function prefillFromProfile() {
      try {
        const response = await fetch("/api/account/profile", {
          cache: "no-store",
        });

        if (!response.ok) return;
        const data = await response.json();
        if (!active || !data.success || !data.profile) return;

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
    return () => { active = false; };
  }, []);

  const deliveryFee = subtotal >= 50000 ? 0 : 2500;
  const total = subtotal + deliveryFee;

  function handleChange(
    event: React.ChangeEvent<
      HTMLInputElement |
        HTMLTextAreaElement |
        HTMLSelectElement
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

    if (items.length === 0) {
      alert("Your cart is empty.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          customer: form.name,
          email: form.email,
          phone: form.phone,
          address: form.address,
          city: form.city,
          state: form.state,
          items: items.map((item) => ({
            productId: item.id,
            quantity: item.quantity,
          })),
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.message || "Failed to create order."
        );
      }

    sessionStorage.setItem(
  "simplyire-last-order",
  JSON.stringify({
    orderId: data.order.id,
    total: data.order.total,
    customer: form.name,
    email: form.email,
  })
);

// Initialize Paystack payment
const paymentResponse = await fetch(
  "/api/payments/initialize",
  {
    method: "POST",

    headers: {
      "Content-Type": "application/json",
    },

    body: JSON.stringify({
      orderId: data.order.id,
    }),
  }
);

const paymentData =
  await paymentResponse.json();

if (
  !paymentResponse.ok ||
  !paymentData.success
) {
  throw new Error(
    paymentData.message ||
      "Unable to initialize payment."
  );
}

// Send customer to Paystack
// Send customer to Paystack
if (!paymentData.authorizationUrl) {
  throw new Error(
    "Paystack did not return a payment authorization URL."
  );
}

window.location.assign(
  paymentData.authorizationUrl
);
    } catch (error) {
      console.error("Checkout error:", error);

      alert(
        error instanceof Error
          ? error.message
          : "Something went wrong while creating your order."
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
            <span className="eyebrow">
              Checkout
            </span>

            <h1>Your cart is empty.</h1>

            <p>
              Add some products before continuing
              to checkout.
            </p>
          </div>
        </section>

        <section className="section container">
          <Link
            href="/shop"
            className="btn btn-primary"
          >
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
          <span className="eyebrow">
            Checkout
          </span>

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
              <h2>
                Customer information
              </h2>
              {profilePrefilled && (
                <p className="checkout-profile-note">
                  We filled in details from your saved profile. You can change them for this order. <Link href="/profile">Edit your profile</Link>
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
                    required
                  />
                </div>
              </div>
            </div>

            {/* Delivery Information */}
            <div className="checkout-card">
              <h2>
                Delivery information
              </h2>

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
                    required
                  >
                    <option value="">
                      Select state
                    </option>

                    <option value="Kwara">
                      Kwara
                    </option>

                    <option value="Lagos">
                      Lagos
                    </option>

                    <option value="Abuja">
                      FCT Abuja
                    </option>

                    <option value="Oyo">
                      Oyo
                    </option>

                    <option value="Rivers">
                      Rivers
                    </option>

                    <option value="Ogun">
                      Ogun
                    </option>

                    <option value="Kaduna">
                      Kaduna
                    </option>

                    <option value="Enugu">
                      Enugu
                    </option>

                    <option value="Other">
                      Other
                    </option>
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
                : `Continue to payment · ${formatNaira(
                    total
                  )}`}
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
                    <strong>
                      {item.name}
                    </strong>

                    <span>
                      {item.quantity} ×{" "}
                      {formatNaira(item.price)}
                    </span>
                  </div>

                  <strong>
                    {formatNaira(
                      item.price *
                        item.quantity
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
                  : formatNaira(
                      deliveryFee
                    )}
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