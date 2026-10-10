"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import styles from "./page.module.css";

type Promotion = {
  id: string;
  title: string;
  subtitle: string | null;
  description: string | null;
  image: string | null;
  ctaLabel: string;
  ctaHref: string;
  placement: string;
  isActive: boolean;
  sortOrder: number;
  startsAt: string | null;
  endsAt: string | null;
  createdAt: string;
  updatedAt: string;
};

type FormState = {
  title: string;
  subtitle: string;
  description: string;
  image: string;
  ctaLabel: string;
  ctaHref: string;
  placement: string;
  isActive: boolean;
  sortOrder: string;
  startsAt: string;
  endsAt: string;
};

const emptyForm: FormState = {
  title: "",
  subtitle: "New & upcoming",
  description: "A little something lovely is on the way.",
  image: "",
  ctaLabel: "Shop now",
  ctaHref: "/shop",
  placement: "HOME",
  isActive: false,
  sortOrder: "0",
  startsAt: "",
  endsAt: "",
};

function inputDate(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

function formatDate(value: string | null) {
  if (!value) return "No date limit";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Invalid date" : new Intl.DateTimeFormat("en-NG", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

export default function AdminPromotionsPage() {
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [placementFilter, setPlacementFilter] = useState("ALL");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Promotion | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function loadPromotions() {
    try {
      setLoading(true);
      setError("");
      const response = await fetch("/api/admin/promotions", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.message || "Unable to load promotions.");
      setPromotions(data.promotions);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load promotions.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // Initial client-side fetch; state updates happen after the request resolves.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadPromotions();
  }, []);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return promotions.filter((item) => {
      const matchesQuery = !query || `${item.title} ${item.subtitle ?? ""} ${item.description ?? ""}`.toLowerCase().includes(query);
      return matchesQuery && (placementFilter === "ALL" || item.placement === placementFilter);
    });
  }, [promotions, search, placementFilter]);

  const activeCount = promotions.filter((item) => item.isActive).length;
  const scheduledCount = promotions.filter((item) => item.startsAt && new Date(item.startsAt) > new Date()).length;
  const homeCount = promotions.filter((item) => item.placement === "HOME").length;

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setError("");
    setModalOpen(true);
  }

  function openEdit(item: Promotion) {
    setEditing(item);
    setForm({
      title: item.title,
      subtitle: item.subtitle ?? "",
      description: item.description ?? "",
      image: item.image ?? "",
      ctaLabel: item.ctaLabel,
      ctaHref: item.ctaHref,
      placement: item.placement,
      isActive: item.isActive,
      sortOrder: String(item.sortOrder),
      startsAt: inputDate(item.startsAt),
      endsAt: inputDate(item.endsAt),
    });
    setError("");
    setModalOpen(true);
  }

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setNotice("");

    const payload = {
      ...(editing ? { id: editing.id } : {}),
      ...form,
      sortOrder: Number(form.sortOrder),
      startsAt: form.startsAt ? new Date(form.startsAt).toISOString() : null,
      endsAt: form.endsAt ? new Date(form.endsAt).toISOString() : null,
    };

    try {
      const response = await fetch("/api/admin/promotions", {
        method: editing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.message || "Unable to save promotion.");
      setModalOpen(false);
      setNotice(editing ? "Promotion updated successfully." : "Promotion created successfully.");
      await loadPromotions();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to save promotion.");
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(item: Promotion) {
    try {
      setError("");
      const response = await fetch("/api/admin/promotions", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: item.id,
          title: item.title,
          subtitle: item.subtitle ?? "",
          description: item.description ?? "",
          image: item.image ?? "",
          ctaLabel: item.ctaLabel,
          ctaHref: item.ctaHref,
          placement: item.placement,
          isActive: !item.isActive,
          sortOrder: item.sortOrder,
          startsAt: item.startsAt,
          endsAt: item.endsAt,
        }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.message || "Unable to update promotion.");
      setNotice(data.message);
      await loadPromotions();
    } catch (toggleError) {
      setError(toggleError instanceof Error ? toggleError.message : "Unable to update promotion.");
    }
  }

  async function deletePromotion(item: Promotion) {
    if (!window.confirm(`Delete the promotion “${item.title}”? This cannot be undone.`)) return;
    try {
      setError("");
      const response = await fetch(`/api/admin/promotions?id=${encodeURIComponent(item.id)}`, { method: "DELETE" });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.message || "Unable to delete promotion.");
      setNotice("Promotion deleted.");
      await loadPromotions();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Unable to delete promotion.");
    }
  }

  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.container}>
          <Link href="/admin" className={styles.backLink}>← Administration</Link>
          <div className={styles.heroRow}>
            <div>
              <span className={styles.eyebrow}>Campaign studio</span>
              <h1>Promotions & new drops</h1>
              <p>Publish launches, previews and special product announcements across your storefront.</p>
            </div>
            <button type="button" className={styles.primaryButton} onClick={openCreate}>＋ Create advert</button>
          </div>
        </div>
      </section>

      <section className={styles.container}>
        <div className={styles.stats}>
          <div className={styles.stat}><span>Total adverts</span><strong>{promotions.length}</strong><small>Campaigns saved</small></div>
          <div className={styles.stat}><span>Active</span><strong>{activeCount}</strong><small>Eligible to appear</small></div>
          <div className={styles.stat}><span>Scheduled</span><strong>{scheduledCount}</strong><small>Future start dates</small></div>
          <div className={styles.stat}><span>Home placement</span><strong>{homeCount}</strong><small>Homepage campaigns</small></div>
        </div>

        {notice && <div className={styles.success}>{notice}</div>}
        {error && !modalOpen && <div className={styles.error}>{error}</div>}

        <section className={styles.panel}>
          <div className={styles.toolbar}>
            <div><span className={styles.panelEyebrow}>Storefront marketing</span><h2>Your adverts</h2><p>Use start/end dates to schedule upcoming launches automatically.</p></div>
            <div className={styles.filters}>
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search adverts…" aria-label="Search adverts" />
              <select value={placementFilter} onChange={(event) => setPlacementFilter(event.target.value)} aria-label="Filter by placement">
                <option value="ALL">All placements</option><option value="HOME">Homepage</option><option value="SHOP">Shop page</option><option value="ANNOUNCEMENT">Announcement strip</option>
              </select>
              <button type="button" className={styles.secondaryButton} onClick={() => void loadPromotions()}>↻ Refresh</button>
            </div>
          </div>

          {loading ? <div className={styles.empty}><span className={styles.loader} /><h3>Loading campaigns…</h3></div> : filtered.length === 0 ? (
            <div className={styles.empty}><span className={styles.emptyIcon}>✦</span><h3>No adverts yet</h3><p>Create your first advert to announce new arrivals or upcoming products.</p><button type="button" className={styles.primaryButton} onClick={openCreate}>Create your first advert</button></div>
          ) : (
            <div className={styles.campaignList}>
              {filtered.map((item) => (
                <article className={styles.campaign} key={item.id}>
                  <div className={styles.campaignImage}>
                    {item.image ? <img src={item.image} alt="" /> : <span>✦</span>}
                  </div>
                  <div className={styles.campaignBody}>
                    <div className={styles.campaignTop}><div><span className={styles.placement}>{item.placement.replace("_", " ")}</span><h3>{item.title}</h3></div><span className={item.isActive ? styles.active : styles.inactive}>{item.isActive ? "Active" : "Draft / paused"}</span></div>
                    {item.subtitle && <p className={styles.subtitle}>{item.subtitle}</p>}
                    {item.description && <p>{item.description}</p>}
                    <div className={styles.schedule}><span>Starts: {formatDate(item.startsAt)}</span><span>Ends: {formatDate(item.endsAt)}</span><span>Priority: {item.sortOrder}</span></div>
                    <div className={styles.campaignActions}>
                      <button type="button" className={styles.secondaryButton} onClick={() => openEdit(item)}>Edit</button>
                      <button type="button" className={item.isActive ? styles.pauseButton : styles.activateButton} onClick={() => void toggleActive(item)}>{item.isActive ? "Pause" : "Activate"}</button>
                      <button type="button" className={styles.deleteButton} onClick={() => void deletePromotion(item)}>Delete</button>
                      <a href={item.placement === "SHOP" ? "/shop" : "/"} target="_blank" rel="noreferrer" className={styles.previewLink}>Preview placement ↗</a>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </section>

      {modalOpen && (
        <div className={styles.backdrop} onClick={() => !saving && setModalOpen(false)}>
          <section className={styles.modal} role="dialog" aria-modal="true" aria-labelledby="promotion-form-title" onClick={(event) => event.stopPropagation()}>
            <header className={styles.modalHeader}>
              <div><span className={styles.panelEyebrow}>Campaign details</span><h2 id="promotion-form-title">{editing ? "Edit advert" : "Create an advert"}</h2><p>Keep the headline short and make the action clear.</p></div>
              <button type="button" className={styles.closeButton} onClick={() => !saving && setModalOpen(false)} aria-label="Close form">×</button>
            </header>
            <form onSubmit={submit} className={styles.form}>
              {error && <div className={styles.error}>{error}</div>}
              <div className={styles.formGrid}>
                <label>Headline<input maxLength={120} required value={form.title} onChange={(event) => update("title", event.target.value)} placeholder="Meet your next favourite" /></label>
                <label>Short eyebrow<input maxLength={100} value={form.subtitle} onChange={(event) => update("subtitle", event.target.value)} placeholder="Coming soon / Just dropped" /></label>
              </div>
              <label>Description<textarea rows={3} maxLength={400} value={form.description} onChange={(event) => update("description", event.target.value)} placeholder="Describe the launch or offer." /></label>
              <label>Image URL (HTTPS)<input type="url" value={form.image} onChange={(event) => update("image", event.target.value)} placeholder="https://..." /><small>Use a licensed product/lifestyle image or a trusted HTTPS image URL.</small></label>
              {form.image && <div className={styles.imagePreview}><img src={form.image} alt="Promotion preview" /></div>}
              <div className={styles.formGrid}>
                <label>Button text<input maxLength={40} value={form.ctaLabel} onChange={(event) => update("ctaLabel", event.target.value)} required /></label>
                <label>Button link<input value={form.ctaHref} onChange={(event) => update("ctaHref", event.target.value)} placeholder="/shop or https://..." required /></label>
              </div>
              <div className={styles.formGridThree}>
                <label>Placement<select value={form.placement} onChange={(event) => update("placement", event.target.value)}><option value="HOME">Homepage</option><option value="SHOP">Shop page</option><option value="ANNOUNCEMENT">Announcement strip</option></select></label>
                <label>Priority<input type="number" min="0" max="10000" step="1" value={form.sortOrder} onChange={(event) => update("sortOrder", event.target.value)} /></label>
                <label className={styles.checkboxLabel}><input type="checkbox" checked={form.isActive} onChange={(event) => update("isActive", event.target.checked)} /> Publish when scheduled</label>
              </div>
              <div className={styles.formGrid}>
                <label>Start date/time (optional)<input type="datetime-local" value={form.startsAt} onChange={(event) => update("startsAt", event.target.value)} /></label>
                <label>End date/time (optional)<input type="datetime-local" value={form.endsAt} onChange={(event) => update("endsAt", event.target.value)} /></label>
              </div>
              <p className={styles.scheduleHelp}>Leave dates blank for no time limit. Active campaigns display only between their scheduled dates.</p>
              <div className={styles.formActions}><button type="button" className={styles.secondaryButton} disabled={saving} onClick={() => setModalOpen(false)}>Cancel</button><button type="submit" className={styles.primaryButton} disabled={saving}>{saving ? "Saving…" : editing ? "Save changes" : "Create advert"}</button></div>
            </form>
          </section>
        </div>
      )}
    </main>
  );
}
