"use client";
import { useState, useTransition } from "react";
import { signUp } from "@/lib/actions";
import Link from "next/link";
import posthog from "posthog-js";
import styles from "../login/auth.module.css";

export default function SignupPage() {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    if (fd.get("password") !== fd.get("confirm")) {
      setError("Passwords do not match.");
      return;
    }
    const email    = fd.get("email")    as string;
    const username = fd.get("username") as string;
    startTransition(async () => {
      const result = await signUp(fd);
      if (result?.error) {
        setError(result.error);
      } else {
        posthog.identify(email, { email, username });
        posthog.capture("user_signed_up", { method: "email", username });
      }
    });
  }

  return (
    <div className={styles.page}>
      <div className={`glow-orb glow-orb-purple ${styles.orb1}`} />
      <div className={`glow-orb glow-orb-cyan ${styles.orb2}`} />
      <div className={styles.grid} />

      <div className={styles.card}>
        <Link href="/" className={styles.logo}>
          <span>🎖️</span>
          <span className={styles.logoText}>
            Military<span style={{ color: "var(--accent-cyan)" }}>Pass</span>
          </span>
        </Link>

        <h1 className={styles.title}>Create Account</h1>
        <p className={styles.subtitle}>
          Join the network. Get <span style={{ color: "var(--accent-cyan)" }}>50 free credits</span> on signup.
        </p>

        {error && <div className={styles.errorBox}>⚠️ {error}</div>}

        <form className={styles.form} onSubmit={handleSubmit}>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="username">Operator Callsign</label>
            <input
              id="username"
              name="username"
              type="text"
              required
              minLength={3}
              className={styles.input}
              placeholder="ghost_operator"
              autoComplete="username"
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="email">Email Address</label>
            <input
              id="email"
              name="email"
              type="email"
              required
              className={styles.input}
              placeholder="operator@militarypass.com"
              autoComplete="email"
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="password">Password</label>
            <input
              id="password"
              name="password"
              type="password"
              required
              minLength={8}
              className={styles.input}
              placeholder="••••••••••••"
              autoComplete="new-password"
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="confirm">Confirm Password</label>
            <input
              id="confirm"
              name="confirm"
              type="password"
              required
              className={styles.input}
              placeholder="••••••••••••"
              autoComplete="new-password"
            />
          </div>

          <p className={styles.terms}>
            By signing up you agree to our{" "}
            <Link href="/terms" className={styles.switchLink}>Terms of Service</Link>
            {" & "}
            <Link href="/privacy" className={styles.switchLink}>Privacy Policy</Link>.
          </p>

          <button
            type="submit"
            disabled={isPending}
            className={`btn btn-primary ${styles.submitBtn}`}
          >
            {isPending ? <span className={styles.spinner} /> : "🎖️ Deploy Account"}
          </button>
        </form>

        <p className={styles.switchText}>
          Already an operator?{" "}
          <Link href="/auth/login" className={styles.switchLink}>Login →</Link>
        </p>
      </div>
    </div>
  );
}
