"use client";
import { useState, useEffect } from "react";
import styles from "./ReferralWidget.module.css";

interface ReferralData {
  code:             string;
  link:             string;
  totalReferrals:   number;
  creditsEarned:    number;
  bonusPerReferral: number;
}

export default function ReferralWidget() {
  const [data,    setData]    = useState<ReferralData | null>(null);
  const [copied,  setCopied]  = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/referral")
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const copy = async () => {
    if (!data?.link) return;
    await navigator.clipboard.writeText(data.link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2200);
  };

  const share = () => {
    if (!data?.link) return;
    if (navigator.share) {
      navigator.share({
        title: "Military Pass — AI Face & Voice Transformation",
        text:  `Join me on Military Pass and get ${data.bonusPerReferral} FREE credits! Use my link:`,
        url:   data.link,
      });
    } else {
      copy();
    }
  };

  return (
    <div className={styles.root}>
      <div className={styles.header}>
        <span className={styles.icon}>🎖️</span>
        <div>
          <h3 className={styles.title}>Refer Operators</h3>
          <p className={styles.sub}>Earn credits for every sign-up</p>
        </div>
      </div>

      {loading ? (
        <div className={styles.loading}>Loading…</div>
      ) : data ? (
        <>
          {/* Stats row */}
          <div className={styles.statsRow}>
            <div className={styles.stat}>
              <span className={styles.statNum}>{data.totalReferrals}</span>
              <span className={styles.statLabel}>Referred</span>
            </div>
            <div className={styles.statDiv} />
            <div className={styles.stat}>
              <span className={styles.statNum}>⚡ {data.creditsEarned}</span>
              <span className={styles.statLabel}>Credits Earned</span>
            </div>
            <div className={styles.statDiv} />
            <div className={styles.stat}>
              <span className={styles.statNum}>+{data.bonusPerReferral}</span>
              <span className={styles.statLabel}>Per Referral</span>
            </div>
          </div>

          {/* Link box */}
          <div className={styles.linkBox}>
            <code className={styles.link}>{data.link}</code>
            <button className={styles.copyBtn} onClick={copy} title="Copy link">
              {copied ? "✓" : "📋"}
            </button>
          </div>

          <div className={styles.actions}>
            <button className="btn btn-ghost" onClick={copy} style={{ flex: 1 }}>
              {copied ? "✓ Copied!" : "📋 Copy Link"}
            </button>
            <button className="btn btn-primary" onClick={share} style={{ flex: 1 }}>
              📤 Share
            </button>
          </div>

          <p className={styles.note}>
            Your referees get <strong>+25 free credits</strong> on signup.
          </p>
        </>
      ) : (
        <p className={styles.sub}>Could not load referral data.</p>
      )}
    </div>
  );
}
