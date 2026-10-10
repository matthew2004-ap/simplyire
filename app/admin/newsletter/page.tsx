"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import styles from "./page.module.css";

type Subscriber = { id: string; email: string; createdAt: string };

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-NG", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

export default function AdminNewsletterPage() {
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load() {
    try {
      setLoading(true);
      setError("");
      const response = await fetch("/api/admin/newsletter", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.message || "Unable to load subscribers.");
      setSubscribers(data.subscribers);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load subscribers.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // Initial client-side fetch; state updates happen after the request resolves.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, []);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return subscribers.filter((item) => item.email.toLowerCase().includes(query));
  }, [subscribers, search]);

  function exportCsv() {
    const rows = [["Email", "Subscribed at"], ...filtered.map((item) => [item.email, new Date(item.createdAt).toISOString()])];
    const csv = rows.map((row) => row.map((value) => `"${value.replace(/"/g, '""')}"`).join(",")).join("\r\n");
    const blob = new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "simplyire-newsletter-subscribers.csv";
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.container}>
          <Link href="/admin" className={styles.backLink}>← Administration</Link>
          <div className={styles.heroRow}>
            <div><span className={styles.eyebrow}>Community</span><h1>Newsletter subscribers</h1><p>View people who signed up for new arrivals and Simplyire updates.</p></div>
            <button type="button" className={styles.primaryButton} onClick={exportCsv} disabled={filtered.length === 0}>↓ Export CSV</button>
          </div>
        </div>
      </section>
      <section className={styles.container}>
        <div className={styles.stat}><span>All subscribers</span><strong>{subscribers.length}</strong><small>Stored in the store database</small></div>
        {error && <div className={styles.error}>{error}</div>}
        <section className={styles.panel}>
          <div className={styles.toolbar}><div><span className={styles.panelEyebrow}>Newsletter</span><h2>Email list</h2><p>{filtered.length} subscriber{filtered.length === 1 ? "" : "s"} shown.</p></div><input aria-label="Search subscribers" placeholder="Search email addresses…" value={search} onChange={(event) => setSearch(event.target.value)} /></div>
          {loading ? <div className={styles.empty}>Loading subscribers…</div> : filtered.length === 0 ? <div className={styles.empty}><span>✉️</span><h3>No subscribers found</h3><p>As people sign up from the storefront, they will appear here.</p></div> : (
            <div className={styles.tableWrapper}><table className={styles.table}><thead><tr><th>Email address</th><th>Subscribed</th></tr></thead><tbody>{filtered.map((item) => <tr key={item.id}><td><strong>{item.email}</strong></td><td>{formatDate(item.createdAt)}</td></tr>)}</tbody></table></div>
          )}
        </section>
      </section>
    </main>
  );
}
