"use client";

import { useState } from "react";
import { useCart } from "@/context/CartContext";
import type { Product } from "@/lib/product-types";

export default function AddToCartButton({
  product,
}: {
  product: Product;
}) {
  const { addToCart } = useCart();
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);

  function increase() {
    if (quantity < product.stock) {
      setQuantity((current) => current + 1);
    }
  }

  function decrease() {
    setQuantity((current) => Math.max(1, current - 1));
  }

  function handleAddToCart() {
    addToCart(product, quantity);

    setAdded(true);

    setTimeout(() => {
      setAdded(false);
    }, 2000);
  }

  return (
    <>
      <div className="quantity">
        <button
          type="button"
          onClick={decrease}
          disabled={quantity <= 1}
        >
          −
        </button>

        <span>{quantity}</span>

        <button
          type="button"
          onClick={increase}
          disabled={quantity >= product.stock}
        >
          +
        </button>
      </div>

      <button
        type="button"
        className="btn btn-primary full"
        onClick={handleAddToCart}
        disabled={product.stock <= 0}
      >
        {product.stock <= 0
          ? "Out of stock"
          : added
          ? "✓ Added to bag"
          : "Add to bag"}
      </button>
    </>
  );
}