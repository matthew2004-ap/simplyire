"use client";

import { useState } from "react";
import styles from "./page.module.css";

type Props = {
  orderId: string;
  value: string;
  paymentStatus: string;
  paymentReference?: string | null;
  onUpdated: (orderId: string, status: string) => void;
};

const statuses = [
  "PENDING",
  "PROCESSING",
  "SHIPPED",
  "DELIVERED",
  "CANCELLED",
] as const;

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
  paymentReference = null,
  onUpdated,
}: Props) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function updateStatus(newStatus: string) {
    if (newStatus === value || saving) return;

    try {
      setSaving(true);
      setError("");

      const response = await fetch("/api/admin/orders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: orderId,
          fulfillmentStatus: newStatus,
        }),
      });

      const data = await response.json().catch(() => null);
      const savedStatus = data?.order?.fulfillmentStatus;

      if (
        !response.ok ||
        !data?.success ||
        typeof savedStatus !== "string"
      ) {
        throw new Error(
          typeof data?.message === "string"
            ? data.message
            : "Failed to update status. Please try again."
        );
      }

      onUpdated(orderId, savedStatus);
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Failed to update status. Please try again."
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
        className={styles.fulfillmentSelect}
        aria-label={`Fulfillment status for order ${orderId}`}
        onChange={(event) => updateStatus(event.target.value)}
      >
        {statuses.map((status) => {
          const isPaid = paymentStatus === "PAID";
          const isProgressStatus = [
            "PROCESSING",
            "SHIPPED",
            "DELIVERED",
          ].includes(status);

          const currentRank = rank[value];
          const targetRank = rank[status];
          const isBackward =
            value !== "CANCELLED" &&
            status !== "CANCELLED" &&
            currentRank !== undefined &&
            targetRank !== undefined &&
            targetRank < currentRank;

          const cannotReopenCancelled =
            value === "CANCELLED" && status !== "CANCELLED";
          const paymentAttemptInProgress =
            status === "CANCELLED" &&
            paymentStatus === "PENDING" &&
            Boolean(paymentReference);

          const cannotUse =
            isBackward ||
            cannotReopenCancelled ||
            (isProgressStatus && !isPaid) ||
            (status === "CANCELLED" && isPaid) ||
            paymentAttemptInProgress;

          return (
            <option
              key={status}
              value={status}
              disabled={cannotUse}
              title={
                paymentAttemptInProgress
                  ? "Verify the payment attempt before cancelling this order."
                  : undefined
              }
            >
              {status}
            </option>
          );
        })}
      </select>

      {saving && (
        <span className={styles.savingText}>Saving...</span>
      )}

      {error && (
        <span className={styles.statusError} role="alert">
          {error}
        </span>
      )}
    </div>
  );
}
