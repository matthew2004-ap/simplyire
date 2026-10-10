"use client";

import { FormEvent, useState } from "react";

export default function Newsletter() {
  const [email, setEmail] = useState("");
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.message || "Unable to subscribe right now.");
      }
      setDone(true);
      setEmail("");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to subscribe right now.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="newsletter" aria-labelledby="newsletter-heading">
      <div>
        <span className="eyebrow">The Simplyire note</span>
        <h2 id="newsletter-heading">Little updates, lovely things.</h2>
        <p>Join our list for new arrivals, care tips and occasional treats.</p>
      </div>
      {done ? (
        <div className="success-box" role="status">You&apos;re on the list. 💗</div>
      ) : (
        <form onSubmit={submit} className="newsletter-form">
          <label className="visually-hidden" htmlFor="newsletter-email">Email address</label>
          <input
            id="newsletter-email"
            type="email"
            autoComplete="email"
            required
            maxLength={254}
            placeholder="Your email address"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
          <button className="btn btn-dark" disabled={loading}>
            {loading ? "Joining…" : "Join us"}
          </button>
          {error && <p className="newsletter-error" role="alert">{error}</p>}
        </form>
      )}
    </section>
  );
}
