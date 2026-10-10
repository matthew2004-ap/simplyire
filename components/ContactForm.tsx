"use client";

import { FormEvent, useState } from "react";

export default function ContactForm() {
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    const formElement = event.currentTarget;
    const form = new FormData(formElement);

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(Object.fromEntries(form.entries())),
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.message || data.error || "Your message could not be sent. Please try again.");
      }
      setSent(true);
      formElement.reset();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Your message could not be sent. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return <div className="form-success" role="status"><h3>Message received 💗</h3><p>Thank you for contacting Simplyire Essentials. We&apos;ll get back to you as soon as possible.</p></div>;
  }

  return (
    <form className="contact-form" onSubmit={submit}>
      {error && <div className="auth-error" role="alert">{error}</div>}
      <div className="form-two">
        <label>Name<input name="name" autoComplete="name" maxLength={100} required /></label>
        <label>Email<input name="email" type="email" autoComplete="email" maxLength={254} required /></label>
      </div>
      <label>Subject<input name="subject" maxLength={150} required /></label>
      <label>Message<textarea name="message" rows={7} maxLength={5000} required /></label>
      <button className="btn btn-primary" disabled={loading}>{loading ? "Sending…" : "Send message"}</button>
    </form>
  );
}
