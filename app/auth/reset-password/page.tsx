"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import styles from "../login/auth.module.css";

export default function ResetPasswordPage() {
  const [password,  setPassword]  = useState("");
  const [confirm,   setConfirm]   = useState("");
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState<string | null>(null);
  const [done,      setDone]      = useState(false);
  const [tokenOk,   setTokenOk]   = useState(false);

  const supabase = createClient();
  const router   = useRouter();

  // Supabase puts the token in the URL hash; the client SDK picks it up
  useEffect(() => {
    supabase.auth.onAuthStateChange((event: string) => {
      if (event === "PASSWORD_RECOVERY") setTokenOk(true);
    });
  }, [supabase]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    const { error: updateError } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (updateError) {
      setError(updateError.message);
    } else {
      setDone(true);
      setTimeout(() => router.push("/dashboard"), 2500);
    }
  }

  return (
    <div className={styles.page}>
      <div className={`${styles.orb} ${styles.orbLeft}`} />
      <div className={`${styles.orb} ${styles.orbRight}`} />

      <div className={styles.card}>
        <div className={styles.logoRow}>
          <span className={styles.logoIcon}>🎖️</span>
          <span className={styles.logoText}>MILITARY PASS</span>
        </div>

        {done ? (
          <div className={styles.successBox}>
            <span style={{ fontSize: "2.5rem" }}>✅</span>
            <h2 className={styles.title}>Password Updated</h2>
            <p className={styles.sub}>
              Your password has been changed. Redirecting to dashboard…
            </p>
          </div>
        ) : !tokenOk ? (
          <div className={styles.successBox}>
            <span style={{ fontSize: "2.5rem" }}>⏳</span>
            <h2 className={styles.title}>Verifying Link…</h2>
            <p className={styles.sub}>Please wait while we verify your reset link.</p>
          </div>
        ) : (
          <>
            <h1 className={styles.title}>New Password</h1>
            <p className={styles.sub}>Choose a strong password for your operator account.</p>

            {error && <div className={styles.errorBox}>⚠️ {error}</div>}

            <form onSubmit={handleSubmit} className={styles.form}>
              <div className={styles.field}>
                <label className={styles.label} htmlFor="password">New Password</label>
                <input
                  id="password" type="password" required minLength={8}
                  value={password} onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min. 8 characters" className={styles.input}
                  autoComplete="new-password"
                />
              </div>
              <div className={styles.field}>
                <label className={styles.label} htmlFor="confirm">Confirm Password</label>
                <input
                  id="confirm" type="password" required
                  value={confirm} onChange={(e) => setConfirm(e.target.value)}
                  placeholder="Repeat password" className={styles.input}
                  autoComplete="new-password"
                />
              </div>
              <button type="submit" disabled={loading} className={`btn btn-primary ${styles.submitBtn}`}>
                {loading ? <span className={styles.spinner} /> : "🔒 Update Password"}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
