"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import styles from "./page.module.css";

type Message = {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  createdAt: string;
};

function formatDate(date: string) {
  return new Intl.DateTimeFormat("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}

function shortMessage(message: string) {
  const clean = message.trim();

  if (clean.length <= 100) {
    return clean;
  }

  return `${clean.slice(0, 100)}...`;
}

export default function AdminMessagesPage() {
  const [messages, setMessages] =
    useState<Message[]>([]);

  const [search, setSearch] =
    useState("");

  const [selectedMessage, setSelectedMessage] =
    useState<Message | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [notice, setNotice] =
    useState("");

  const [deleting, setDeleting] =
    useState(false);

  async function loadMessages() {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(
        "/api/admin/messages",
        {
          cache: "no-store",
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.message ||
            "Failed to load messages."
        );
      }

      setMessages(data.messages);
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Failed to load messages."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // Initial client-side fetch; state updates happen after the request resolves.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadMessages();
  }, []);

  const filteredMessages =
    useMemo(() => {
      const query =
        search.trim().toLowerCase();

      if (!query) {
        return messages;
      }

      return messages.filter(
        (message) =>
          message.name
            .toLowerCase()
            .includes(query) ||
          message.email
            .toLowerCase()
            .includes(query) ||
          message.subject
            .toLowerCase()
            .includes(query) ||
          message.message
            .toLowerCase()
            .includes(query)
      );
    }, [messages, search]);

  async function deleteMessage(
    message: Message
  ) {
    const confirmed =
      window.confirm(
        `Delete the message from ${message.name}?\n\nThis cannot be undone.`
      );

    if (!confirmed) {
      return;
    }

    try {
      setDeleting(true);
      setError("");
      setNotice("");

      const response = await fetch(
        `/api/admin/messages?id=${encodeURIComponent(
          message.id
        )}`,
        {
          method: "DELETE",
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.message ||
            "Failed to delete message."
        );
      }

      setSelectedMessage(null);
      setNotice(
        "Message deleted successfully."
      );

      await loadMessages();
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Failed to delete message."
      );
    } finally {
      setDeleting(false);
    }
  }

  return (
    <main className={styles.page}>
      {/* HERO */}

      <section className={styles.hero}>
        <div className={styles.container}>
          <Link
            href="/admin"
            className={styles.backLink}
          >
            ← Administration
          </Link>

          <span className={styles.eyebrow}>
            Communication
          </span>

          <h1>Customer Messages</h1>

          <p>
            View messages sent through
            the Simplyire Essentials
            contact page.
          </p>
        </div>
      </section>

      {/* STATS */}

      <section className={styles.statsSection}>
        <div className={styles.container}>
          <div className={styles.statsGrid}>
            <div className={styles.statCard}>
              <div
                className={`${styles.statIcon} ${styles.pink}`}
              >
                💬
              </div>

              <div>
                <span>
                  Total Messages
                </span>

                <strong>
                  {messages.length}
                </strong>

                <small>
                  Customer enquiries
                </small>
              </div>
            </div>

            <div className={styles.statCard}>
              <div
                className={`${styles.statIcon} ${styles.green}`}
              >
                📩
              </div>

              <div>
                <span>
                  Messages Found
                </span>

                <strong>
                  {filteredMessages.length}
                </strong>

                <small>
                  Matching your search
                </small>
              </div>
            </div>

            <div className={styles.statCard}>
              <div
                className={`${styles.statIcon} ${styles.purple}`}
              >
                📅
              </div>

              <div>
                <span>
                  Latest Message
                </span>

                <strong>
                  {messages.length > 0
                    ? formatDate(
                        messages[0]
                          .createdAt
                      ).split(",")[0]
                    : "—"}
                </strong>

                <small>
                  Most recent enquiry
                </small>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CONTENT */}

      <section className={styles.content}>
        <div className={styles.container}>
          {notice && (
            <div
              className={
                styles.successNotice
              }
            >
              ✓ {notice}
            </div>
          )}

          {error && (
            <div
              className={styles.errorNotice}
            >
              ⚠ {error}
            </div>
          )}

          <div className={styles.panel}>
            <div className={styles.toolbar}>
              <div>
                <span
                  className={
                    styles.panelEyebrow
                  }
                >
                  Inbox
                </span>

                <h2>
                  Customer Enquiries
                </h2>

                <p>
                  {filteredMessages.length}{" "}
                  message
                  {filteredMessages.length !==
                  1
                    ? "s"
                    : ""}{" "}
                  shown.
                </p>
              </div>

              <div
                className={styles.filters}
              >
                <div
                  className={styles.search}
                >
                  <span>⌕</span>

                  <input
                    type="search"
                    placeholder="Search messages..."
                    value={search}
                    onChange={(event) =>
                      setSearch(
                        event.target.value
                      )
                    }
                  />
                </div>

                <button
                  type="button"
                  className={
                    styles.refreshButton
                  }
                  onClick={
                    loadMessages
                  }
                >
                  ↻ Refresh
                </button>
              </div>
            </div>

            {loading ? (
              <div
                className={styles.empty}
              >
                <div
                  className={styles.loader}
                >
                  <span />
                  <span />
                  <span />
                </div>

                <h3>
                  Loading messages...
                </h3>

                <p>
                  Getting customer
                  enquiries.
                </p>
              </div>
            ) : filteredMessages.length ===
              0 ? (
              <div
                className={styles.empty}
              >
                <div
                  className={
                    styles.emptyIcon
                  }
                >
                  💬
                </div>

                <h3>
                  No messages found
                </h3>

                <p>
                  Customer messages will
                  appear here.
                </p>
              </div>
            ) : (
              <>
                {/* DESKTOP */}

                <div
                  className={
                    styles.tableWrapper
                  }
                >
                  <table
                    className={
                      styles.table
                    }
                  >
                    <thead>
                      <tr>
                        <th>
                          Customer
                        </th>

                        <th>
                          Subject
                        </th>

                        <th>
                          Message
                        </th>

                        <th>
                          Date
                        </th>

                        <th />
                      </tr>
                    </thead>

                    <tbody>
                      {filteredMessages.map(
                        (message) => (
                          <tr
                            key={
                              message.id
                            }
                          >
                            <td>
                              <div
                                className={
                                  styles.customer
                                }
                              >
                                <div
                                  className={
                                    styles.avatar
                                  }
                                >
                                  {message.name
                                    .charAt(
                                      0
                                    )
                                    .toUpperCase()}
                                </div>

                                <div>
                                  <strong>
                                    {
                                      message.name
                                    }
                                  </strong>

                                  <span>
                                    {
                                      message.email
                                    }
                                  </span>
                                </div>
                              </div>
                            </td>

                            <td>
                              <strong
                                className={
                                  styles.subject
                                }
                              >
                                {
                                  message.subject
                                }
                              </strong>
                            </td>

                            <td>
                              <span
                                className={
                                  styles.preview
                                }
                              >
                                {shortMessage(
                                  message.message
                                )}
                              </span>
                            </td>

                            <td>
                              <span
                                className={
                                  styles.date
                                }
                              >
                                {formatDate(
                                  message.createdAt
                                )}
                              </span>
                            </td>

                            <td>
                              <button
                                type="button"
                                className={
                                  styles.viewButton
                                }
                                onClick={() =>
                                  setSelectedMessage(
                                    message
                                  )
                                }
                              >
                                Read →
                              </button>
                            </td>
                          </tr>
                        )
                      )}
                    </tbody>
                  </table>
                </div>

                {/* MOBILE */}

                <div
                  className={
                    styles.mobileList
                  }
                >
                  {filteredMessages.map(
                    (message) => (
                      <article
                        key={
                          message.id
                        }
                        className={
                          styles.mobileCard
                        }
                      >
                        <div
                          className={
                            styles.mobileTop
                          }
                        >
                          <div
                            className={
                              styles.customer
                            }
                          >
                            <div
                              className={
                                styles.avatar
                              }
                            >
                              {message.name
                                .charAt(
                                  0
                                )
                                .toUpperCase()}
                            </div>

                            <div>
                              <strong>
                                {
                                  message.name
                                }
                              </strong>

                              <span>
                                {
                                  message.email
                                }
                              </span>
                            </div>
                          </div>

                          <span
                            className={
                              styles.date
                            }
                          >
                            {formatDate(
                              message.createdAt
                            )}
                          </span>
                        </div>

                        <h3>
                          {
                            message.subject
                          }
                        </h3>

                        <p>
                          {shortMessage(
                            message.message
                          )}
                        </p>

                        <button
                          type="button"
                          className={
                            styles.mobileRead
                          }
                          onClick={() =>
                            setSelectedMessage(
                              message
                            )
                          }
                        >
                          Read Message →
                        </button>
                      </article>
                    )
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </section>

      {/* MESSAGE MODAL */}

      {selectedMessage && (
        <div
          className={
            styles.modalBackdrop
          }
          onClick={() =>
            setSelectedMessage(null)
          }
        >
          <div
            className={styles.modal}
            onClick={(event) =>
              event.stopPropagation()
            }
          >
            <div
              className={
                styles.modalHeader
              }
            >
              <div>
                <span
                  className={
                    styles.panelEyebrow
                  }
                >
                  Customer Message
                </span>

                <h2>
                  {
                    selectedMessage.subject
                  }
                </h2>

                <p>
                  {formatDate(
                    selectedMessage.createdAt
                  )}
                </p>
              </div>

              <button
                type="button"
                className={
                  styles.closeButton
                }
                onClick={() =>
                  setSelectedMessage(
                    null
                  )
                }
              >
                ×
              </button>
            </div>

            <div className={styles.modalBody}>
              <div
                className={
                  styles.senderCard
                }
              >
                <div
                  className={
                    styles.avatarLarge
                  }
                >
                  {selectedMessage.name
                    .charAt(0)
                    .toUpperCase()}
                </div>

                <div>
                  <strong>
                    {
                      selectedMessage.name
                    }
                  </strong>

                  <span>
                    {
                      selectedMessage.email
                    }
                  </span>
                </div>
              </div>

              <div
                className={
                  styles.messageBox
                }
              >
                <span>Message</span>

                <p>
                  {
                    selectedMessage.message
                  }
                </p>
              </div>

              <div
                className={
                  styles.modalActions
                }
              >
                <a
                  href={`mailto:${selectedMessage.email}?subject=${encodeURIComponent(
                    `Re: ${selectedMessage.subject}`
                  )}`}
                  className={
                    styles.replyButton
                  }
                >
                  Reply by Email
                </a>

                <button
                  type="button"
                  className={
                    styles.deleteButton
                  }
                  disabled={deleting}
                  onClick={() =>
                    deleteMessage(
                      selectedMessage
                    )
                  }
                >
                  {deleting
                    ? "Deleting..."
                    : "Delete Message"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}