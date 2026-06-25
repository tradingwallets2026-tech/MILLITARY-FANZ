"use client";
import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import styles from "../login/auth.module.css";

export default function ForgotPasswordPage() {
  const [email,     setEmail]     = useState("");
  const [sent,      setSent]      = useState(false);
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState<string | null>(null);

  const supabase = createClient();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/auth/reset-password`,
    });

    setLoading(false);

    if (resetError) {
      setError(resetError.message);
    } else {
      setSent(true);
    }
  }

  return (
    <div className={styles.page}>
      <div className={`${styles.orb} ${styles.orbLeft}`}  />
      <div className={`${styles.orb} ${styles.orbRight}`} />

      <div className={styles.card}>
        {/* Logo */}
        <div className={styles.logoRow}>
          <span className={styles.logoIcon}>🎖️</span>
          <span className={styles.logoText}>MILITARY PASS</span>
        </div>

        {sent ? (
          /* Success state */
          <div className={styles.successBox}>
            <span style={{ fontSize: "2.5rem" }}>📧</span>
            <h2 className={styles.title}>Check Your Email</h2>
            <p className={styles.sub}>
              We sent a password reset link to <strong>{email}</strong>.
              Check your inbox and follow the instructions.
            </p>
            <p className={styles.sub} style={{ fontSize: "0.8rem", marginTop: "8px" }}>
              Didn't receive it? Check your spam folder or{" "}
              <button
                onClick={() => { setSent(false); setEmail(""); }}
                className={styles.linkBtn}
              >
                try again
              </button>.
            </p>
            <Link href="/auth/login" className="btn btn-ghost" style={{ marginTop: "16px", display: "inline-flex" }}>
              ← Back to Login
            </Link>
          </div>
        ) : (
          /* Form state */
          <>
            <h1 className={styles.title}>Reset Password</h1>
            <p className={styles.sub}>
              Enter your operator email and we'll send you a secure reset link.
            </p>

            {error && <div className={styles.errorBox}>⚠️ {error}</div>}

            <form onSubmit={handleSubmit} className={styles.form}>
              <div className={styles.field}>
                <label className={styles.label} htmlFor="email">Email Address</label>
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="operator@militarypass.com"
                  className={styles.input}
                  autoComplete="email"
                />
              </div>

              <button
                type="submit"
                className={`btn btn-primary ${styles.submitBtn}`}
                disabled={loading}
              >
                {loading ? <span className={styles.spinner} /> : "📧 Send Reset Link"}
              </button>
            </form>

            <div className={styles.footer}>
              Remember your password?{" "}
              <Link href="/auth/login" className={styles.footerLink}>Sign In</Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
