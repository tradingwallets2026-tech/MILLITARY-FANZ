"use client";
import { useState, useTransition } from "react";
import { signIn } from "@/lib/actions";
import Link from "next/link";
import posthog from "posthog-js";
import styles from "./auth.module.css";

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const email = fd.get("email") as string;
    startTransition(async () => {
      const result = await signIn(fd);
      if (result?.error) {
        setError(result.error);
        posthog.capture("login_failed", { error: result.error });
      } else {
        posthog.identify(email, { email });
        posthog.capture("user_logged_in", { method: "email" });
      }
    });
  }

  return (
    <div className={styles.page}>
      {/* Background */}
      <div className={`glow-orb glow-orb-purple ${styles.orb1}`} />
      <div className={`glow-orb glow-orb-cyan ${styles.orb2}`} />
      <div className={styles.grid} />

      <div className={styles.card}>
        {/* Logo */}
        <Link href="/" className={styles.logo}>
          <span>🎖️</span>
          <span className={styles.logoText}>
            Military<span style={{ color: "var(--accent-cyan)" }}>Pass</span>
          </span>
        </Link>

        <h1 className={styles.title}>Operator Login</h1>
        <p className={styles.subtitle}>Enter your credentials to access the field.</p>

        {error && (
          <div className={styles.errorBox}>
            ⚠️ {error}
          </div>
        )}

        <form className={styles.form} onSubmit={handleSubmit}>
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
            <div className={styles.labelRow}>
              <label className={styles.label} htmlFor="password">Password</label>
              <Link href="/auth/forgot-password" className={styles.forgotLink}>
                Forgot password?
              </Link>
            </div>
            <input
              id="password"
              name="password"
              type="password"
              required
              className={styles.input}
              placeholder="••••••••••••"
              autoComplete="current-password"
            />
          </div>

          <button
            type="submit"
            disabled={isPending}
            className={`btn btn-primary ${styles.submitBtn}`}
          >
            {isPending ? (
              <span className={styles.spinner} />
            ) : (
              "🔐 Authenticate"
            )}
          </button>
        </form>

        <div className={styles.divider}>
          <span>or continue with</span>
        </div>

        <div className={styles.socials}>
          <button className={`btn btn-ghost ${styles.socialBtn}`}>
            <span>G</span> Google
          </button>
          <button className={`btn btn-ghost ${styles.socialBtn}`}>
            <span>🎵</span> TikTok
          </button>
        </div>

        <p className={styles.switchText}>
          No account?{" "}
          <Link href="/auth/signup" className={styles.switchLink}>
            Create one →
          </Link>
        </p>
      </div>
    </div>
  );
}
