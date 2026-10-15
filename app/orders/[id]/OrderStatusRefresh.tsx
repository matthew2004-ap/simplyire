"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function OrderStatusRefresh() {
  const router = useRouter();

  useEffect(() => {
    const interval = window.setInterval(() => {
      router.refresh();
    }, 30_000);

    return () => {
      window.clearInterval(interval);
    };
  }, [router]);

  return (
    <p
      style={{
        marginTop: "12px",
        fontSize: "13px",
        color: "#897780",
      }}
      aria-live="polite"
    >
      ↻ Order status refreshes automatically
      every 30 seconds while this page is open.
    </p>
  );
}