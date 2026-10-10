"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

export default function Register() {
  const router = useRouter();
  const [name, setName] =
    useState("");

  const [email, setEmail] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  async function submit(
    event: FormEvent
  ) {
    event.preventDefault();

    setLoading(true);
    setError("");

    try {
      const response = await fetch(
        "/api/auth/register",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            name,
            email,
            password,
          }),
        }
      );

      const data =
        await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.message ||
            "Unable to create account."
        );
      }

      router.replace("/dashboard");
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Unable to create account."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <form
        className="auth-card"
        onSubmit={submit}
      >
        <span className="eyebrow">
          Join Simplyire
        </span>

        <h1>Create account</h1>

        {error && (
          <div className="auth-error">
            {error}
          </div>
        )}

        <label>
          Full name
          <input
            value={name}
            onChange={(event) =>
              setName(event.target.value)
            }
            required
          />
        </label>

        <label>
          Email
          <input
            type="email"
            value={email}
            onChange={(event) =>
              setEmail(event.target.value)
            }
            required
          />
        </label>

        <label>
          Password
          <input
            type="password"
            minLength={8}
            value={password}
            onChange={(event) =>
              setPassword(
                event.target.value
              )
            }
            required
          />
        </label>

        <button
          className="btn btn-primary full"
          disabled={loading}
        >
          {loading
            ? "Creating account..."
            : "Create account"}
        </button>

        <p>
          Already have an account?{" "}
          <Link href="/login">
            Sign in
          </Link>
        </p>
      </form>
    </div>
  );
}