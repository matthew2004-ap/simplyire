"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import type { Product } from "@/lib/product-types";

type CartItem = Product & {
  quantity: number;
};

type CartContextType = {
  items: CartItem[];
  addToCart: (product: Product, quantity?: number) => void;
  removeFromCart: (productId: string) => void;
  increaseQuantity: (productId: string) => void;
  decreaseQuantity: (productId: string) => void;
  clearCart: () => void;
  cartCount: number;
  subtotal: number;
};

const CartContext = createContext<CartContextType | undefined>(
  undefined
);

export function CartProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [loaded, setLoaded] = useState(false);

  // Load cart from localStorage
  useEffect(() => {
    try {
      const savedCart = localStorage.getItem(
        "simplyire-cart"
      );

      if (savedCart) {
        // Restore the persisted cart after the client hydrates.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setItems(JSON.parse(savedCart));
      }
    } catch (error) {
      console.error("Failed to load cart:", error);
    } finally {
      setLoaded(true);
    }
  }, []);

  // Save cart to localStorage
  useEffect(() => {
    if (!loaded) return;

    try {
      localStorage.setItem(
        "simplyire-cart",
        JSON.stringify(items)
      );
    } catch (error) {
      console.error("Failed to save cart:", error);
    }
  }, [items, loaded]);

 function addToCart(
  product: Product,
  quantity = 1
) {
  if (product.stock <= 0 || quantity <= 0) {
    return;
  }

  setItems((currentItems) => {
    const existingItem = currentItems.find(
      (item) => item.id === product.id
    );

    if (existingItem) {
      const newQuantity = Math.min(
        existingItem.quantity + quantity,
        product.stock
      );

      return currentItems.map((item) =>
        item.id === product.id
          ? {
              ...item,
              quantity: newQuantity,
            }
          : item
      );
    }

    return [
      ...currentItems,
      {
        ...product,
        quantity: Math.min(quantity, product.stock),
      },
    ];
  });
}
  function removeFromCart(productId: string) {
    setItems((currentItems) =>
      currentItems.filter(
        (item) => item.id !== productId
      )
    );
  }

 function increaseQuantity(productId: string) {
  setItems((currentItems) =>
    currentItems.map((item) => {
      if (item.id !== productId) {
        return item;
      }

      if (item.quantity >= item.stock) {
        return item;
      }

      return {
        ...item,
        quantity: item.quantity + 1,
      };
    })
  );
}

  function decreaseQuantity(productId: string) {
    setItems((currentItems) =>
      currentItems
        .map((item) =>
          item.id === productId
            ? {
                ...item,
                quantity: item.quantity - 1,
              }
            : item
        )
        .filter((item) => item.quantity > 0)
    );
  }

  function clearCart() {
    setItems([]);
  }

  const cartCount = useMemo(
    () =>
      items.reduce(
        (total, item) => total + item.quantity,
        0
      ),
    [items]
  );

  const subtotal = useMemo(
    () =>
      items.reduce(
        (total, item) =>
          total + item.price * item.quantity,
        0
      ),
    [items]
  );

  return (
    <CartContext.Provider
      value={{
        items,
        addToCart,
        removeFromCart,
        increaseQuantity,
        decreaseQuantity,
        clearCart,
        cartCount,
        subtotal,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);

  if (!context) {
    throw new Error(
      "useCart must be used inside CartProvider"
    );
  }

  return context;
}