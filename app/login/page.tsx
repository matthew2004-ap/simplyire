"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState("");
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
        "/api/auth/login",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
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
            "Unable to sign in."
        );
      }

      if (data.user.role === "ADMIN") {
        router.replace("/admin");
      } else {
        const requestedNext = new URLSearchParams(window.location.search).get("next");
        const safeNext = requestedNext && requestedNext.startsWith("/") && !requestedNext.startsWith("//")
          ? requestedNext
          : null;
        router.replace(safeNext ?? "/dashboard");
      }
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Unable to sign in."
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
          Welcome back
        </span>

        <h1>Sign in</h1>

        {error && (
          <div className="auth-error">
            {error}
          </div>
        )}

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
            ? "Signing in..."
            : "Sign in"}
        </button>

        <p>
          New here?{" "}
          <Link href="/register">
            Create an account
          </Link>
        </p>
      </form>
    </div>
  );
}