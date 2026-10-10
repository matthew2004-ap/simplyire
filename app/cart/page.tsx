"use client";

import Link from "next/link";
import { useCart } from "@/context/CartContext";
import { formatNaira } from "@/lib/utils";

export default function CartPage() {
  const {
    items,
    increaseQuantity,
    decreaseQuantity,
    removeFromCart,
    clearCart,
    subtotal,
  } = useCart();

  const deliveryFee = subtotal >= 50000 ? 0 : 2500;
  const total = subtotal + deliveryFee;

  if (items.length === 0) {
    return (
      <div className="page">
        <section className="page-hero">
          <div className="container">
            <span className="eyebrow">Your shopping bag</span>
            <h1>Your bag is empty.</h1>
            <p>
              You haven&apos;t added anything to your bag yet.
            </p>
          </div>
        </section>

        <section className="section container">
          <div className="empty-cart">
            <div className="empty-cart-icon">🛍️</div>

            <h2>Nothing here yet</h2>

            <p>
              Explore our beauty, self-care, accessories and
              everyday essentials.
            </p>

            <Link
              href="/shop"
              className="btn btn-primary"
            >
              Continue Shopping
            </Link>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="page">
      {/* Header */}
      <section className="page-hero">
        <div className="container">
          <span className="eyebrow">Your shopping bag</span>

          <h1>Your cart.</h1>

          <p>
            Review your selected essentials before checkout.
          </p>
        </div>
      </section>

      {/* Cart */}
      <section className="section container">
        <div className="cart-layout">
          {/* Cart Items */}
          <div className="cart-items">
            {items.map((item) => (
              <article
                className="cart-item"
                key={item.id}
              >
                {/* Image */}
                <div className="cart-item-image">
                  <img
                    src={item.image}
                    alt={item.name}
                  />
                </div>

                {/* Information */}
                <div className="cart-item-info">
                  <span className="eyebrow">
                    {item.category}
                  </span>

                  <h3>{item.name}</h3>

                  <p>
                    {formatNaira(item.price)}
                  </p>

                  {/* Quantity */}
                  <div className="cart-item-actions">
                    <div className="cart-quantity">
                      <button
                        type="button"
                        onClick={() =>
                          decreaseQuantity(item.id)
                        }
                      >
                        −
                      </button>

                      <span>{item.quantity}</span>

                      <button
                        type="button"
                        onClick={() =>
                          increaseQuantity(item.id)
                        }
                      >
                        +
                      </button>
                    </div>

                    <button
                      type="button"
                      className="remove-button"
                      onClick={() =>
                        removeFromCart(item.id)
                      }
                    >
                      Remove
                    </button>
                  </div>
                </div>

                {/* Item Total */}
                <div className="cart-item-total">
                  {formatNaira(
                    item.price * item.quantity
                  )}
                </div>
              </article>
            ))}

            {/* Clear Cart */}
            <div className="cart-actions">
              <button
                type="button"
                className="clear-cart"
                onClick={clearCart}
              >
                Clear cart
              </button>

              <Link
                href="/shop"
                className="continue-shopping"
              >
                ← Continue shopping
              </Link>
            </div>
          </div>

          {/* Order Summary */}
          <aside className="cart-summary">
            <h2>Order summary</h2>

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

            {subtotal < 50000 && (
              <p className="delivery-note">
                Add{" "}
                {formatNaira(
                  50000 - subtotal
                )}{" "}
                more to get free delivery.
              </p>
            )}

            <div className="summary-divider" />

            <div className="summary-total">
              <span>Total</span>

              <strong>
                {formatNaira(total)}
              </strong>
            </div>

            <Link
  href="/checkout"
  className="btn btn-primary full checkout-button"
>
  Proceed to checkout
</Link>

            <p className="secure-note">
              🔒 Secure checkout
            </p>
          </aside>
        </div>
      </section>
    </div>
  );
}