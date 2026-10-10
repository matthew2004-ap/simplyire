"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import styles from "./page.module.css";

export type ProfileData = {
  id: string;
  name: string;
  email: string;
  role: "CUSTOMER" | "ADMIN";
  phone: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  createdAt: string;
  updatedAt: string;
};

type Props = { initialProfile: ProfileData };

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-NG", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(value));
}

export default function ProfileForm({ initialProfile }: Props) {
  const router = useRouter();
  const [profile, setProfile] = useState(initialProfile);
  const [form, setForm] = useState({
    name: initialProfile.name,
    phone: initialProfile.phone ?? "",
    address: initialProfile.address ?? "",
    city: initialProfile.city ?? "",
    state: initialProfile.state ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  function updateField(field: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setNotice("");

    try {
      const response = await fetch("/api/account/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Unable to save your profile.");
      }

      const saved = data.profile as ProfileData;
      setProfile(saved);
      setForm({
        name: saved.name,
        phone: saved.phone ?? "",
        address: saved.address ?? "",
        city: saved.city ?? "",
        state: saved.state ?? "",
      });
      setNotice("Your profile has been saved successfully.");
      window.dispatchEvent(new Event("simplyire-auth-change"));
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to save your profile. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.container}>
          <Link href={profile.role === "ADMIN" ? "/admin" : "/dashboard"} className={styles.backLink}>
            ← {profile.role === "ADMIN" ? "Administration" : "My account"}
          </Link>
          <span className={styles.eyebrow}>Your Simplyire account</span>
          <div className={styles.heroRow}>
            <div>
              <h1>My Profile</h1>
              <p>Keep your personal information and delivery details up to date.</p>
            </div>
            <div className={styles.memberPill}>
              <span className={styles.memberDot} />
              Member since {formatDate(profile.createdAt)}
            </div>
          </div>
        </div>
      </section>

      <section className={styles.content}>
        <div className={`${styles.container} ${styles.layout}`}>
          <aside className={styles.sidebar}>
            <div className={styles.identityCard}>
              <div className={styles.avatar}>{profile.name.trim().charAt(0).toUpperCase()}</div>
              <h2>{profile.name}</h2>
              <p>{profile.email}</p>
              <span className={styles.accountType}>{profile.role === "ADMIN" ? "Store administrator" : "Simplyire customer"}</span>
            </div>

            <nav className={styles.accountNav} aria-label="Account pages">
              {profile.role === "CUSTOMER" && (
                <Link href="/dashboard" className={styles.accountNavLink}>
                  <span>📦</span><span><strong>My orders</strong><small>Track purchases and deliveries</small></span><b>→</b>
                </Link>
              )}
              <Link href="/shop" className={styles.accountNavLink}>
                <span>🛍️</span><span><strong>Continue shopping</strong><small>Explore the latest essentials</small></span><b>→</b>
              </Link>
              <Link href="/contact" className={styles.accountNavLink}>
                <span>💬</span><span><strong>Need help?</strong><small>Contact the Simplyire team</small></span><b>→</b>
              </Link>
            </nav>
          </aside>

          <section className={styles.formPanel}>
            <div className={styles.panelHeading}>
              <span className={styles.panelEyebrow}>Account information</span>
              <h2>Personal details</h2>
              <p>Your email identifies your account. Contact and delivery information can be updated below.</p>
            </div>

            {notice && <div className={styles.noticeSuccess} role="status">✓ {notice}</div>}
            {error && <div className={styles.noticeError} role="alert">⚠ {error}</div>}

            <form onSubmit={handleSubmit} className={styles.form}>
              <div className={styles.field}>
                <label htmlFor="profile-name">Full name</label>
                <input id="profile-name" value={form.name} onChange={(event) => updateField("name", event.target.value)} autoComplete="name" maxLength={100} required />
              </div>

              <div className={styles.field}>
                <label htmlFor="profile-email">Email address</label>
                <input id="profile-email" value={profile.email} readOnly disabled autoComplete="email" />
                <small>To protect account ownership, email changes are not available here.</small>
              </div>

              <div className={styles.field}>
                <label htmlFor="profile-phone">Phone number</label>
                <input id="profile-phone" type="tel" value={form.phone} onChange={(event) => updateField("phone", event.target.value)} autoComplete="tel" maxLength={40} placeholder="e.g. 08012345678" />
              </div>

              <div className={styles.field}>
                <label htmlFor="profile-address">Default delivery address</label>
                <textarea id="profile-address" value={form.address} onChange={(event) => updateField("address", event.target.value)} autoComplete="street-address" maxLength={500} rows={3} placeholder="House number, street, area" />
              </div>

              <div className={styles.fieldGrid}>
                <div className={styles.field}>
                  <label htmlFor="profile-city">City</label>
                  <input id="profile-city" value={form.city} onChange={(event) => updateField("city", event.target.value)} autoComplete="address-level2" maxLength={100} placeholder="Your city" />
                </div>
                <div className={styles.field}>
                  <label htmlFor="profile-state">State</label>
                  <input id="profile-state" value={form.state} onChange={(event) => updateField("state", event.target.value)} autoComplete="address-level1" maxLength={100} placeholder="Your state" />
                </div>
              </div>

              <div className={styles.formFooter}>
                <p>Your details are shown only to you when you are signed in.</p>
                <button type="submit" className={styles.saveButton} disabled={saving}>
                  {saving ? "Saving profile…" : "Save profile changes"}
                </button>
              </div>
            </form>
          </section>
        </div>
      </section>
    </main>
  );
}
