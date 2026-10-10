"use client";

import { useState } from "react";
import styles from "./page.module.css";

type Props = {
  orderId: string;
  value: string;
  paymentStatus: string;
  onUpdated: (
    orderId: string,
    status: string
  ) => void;
};

const statuses = [
  "PENDING",
  "PROCESSING",
  "SHIPPED",
  "DELIVERED",
  "CANCELLED",
];

const rank: Record<string, number> = {
  PENDING: 0,
  PROCESSING: 1,
  SHIPPED: 2,
  DELIVERED: 3,
};

export default function FulfillmentStatusSelect({
  orderId,
  value,
  paymentStatus,
  onUpdated,
}: Props) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function updateStatus(
    newStatus: string
  ) {
    if (newStatus === value) {
      return;
    }

    try {
      setSaving(true);
      setError("");

      const response = await fetch(
        "/api/admin/orders",
        {
          method: "PATCH",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            id: orderId,
            fulfillmentStatus:
              newStatus,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.message ||
            "Failed to update status."
        );
      }

      onUpdated(
        orderId,
        data.order.fulfillmentStatus
      );
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Failed to update status."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className={styles.fulfillmentControl}>
      <select
        value={value}
        disabled={saving}
        data-status={value}
        className={
          styles.fulfillmentSelect
        }
        onChange={(event) =>
          updateStatus(
            event.target.value
          )
        }
      >
        {statuses.map((status) => {
          const isPaid =
            paymentStatus === "PAID";

          const isProgressStatus =
            [
              "PROCESSING",
              "SHIPPED",
              "DELIVERED",
            ].includes(status);

          const isBackward =
            rank[status] !== undefined &&
            rank[value] !== undefined &&
            rank[status] < rank[value];

          const cannotUse =
            isBackward ||
            (isProgressStatus &&
              !isPaid) ||
            (status === "CANCELLED" &&
              isPaid);

          return (
            <option
              key={status}
              value={status}
              disabled={cannotUse}
            >
              {status}
            </option>
          );
        })}
      </select>

      {saving && (
        <span className={styles.savingText}>
          Saving...
        </span>
      )}

      {error && (
        <span className={styles.statusError}>
          {error}
        </span>
      )}
    </div>
  );
}