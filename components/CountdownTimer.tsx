"use client";
import { useEffect, useState } from "react";
import styles from "./CountdownTimer.module.css";

const LAUNCH_DATE = new Date("2026-08-01T00:00:00Z");

function getTimeLeft() {
  const now = new Date();
  const diff = LAUNCH_DATE.getTime() - now.getTime();
  if (diff <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0 };
  return {
    days:    Math.floor(diff / (1000 * 60 * 60 * 24)),
    hours:   Math.floor((diff / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((diff / (1000 * 60)) % 60),
    seconds: Math.floor((diff / 1000) % 60),
  };
}

export default function CountdownTimer() {
  // Initialize with zeros to avoid SSR/client hydration mismatch
  const [time, setTime] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setTime(getTimeLeft());
    const t = setInterval(() => setTime(getTimeLeft()), 1000);
    return () => clearInterval(t);
  }, []);

  const units = [
    { label: "Days",    value: time.days },
    { label: "Hours",   value: time.hours },
    { label: "Minutes", value: time.minutes },
    { label: "Seconds", value: time.seconds },
  ];

  return (
    <section className={`section ${styles.section}`}>
      <div className={`glow-orb glow-orb-purple ${styles.orb}`} />
      <div className="container">
        <div className={styles.box}>
          <div className={styles.topBadge}>
            <span className="badge badge-live">LAUNCHING SOON</span>
          </div>

          <h2 className={styles.title}>
            Operator Rollout Is <span className="text-gradient">Live Now</span>
          </h2>

          <div className={styles.timer}>
            {units.map((u) => (
              <div key={u.label} className={styles.unit}>
                <div className={styles.digits}>
                  {String(u.value).padStart(2, "0")}
                </div>
                <div className={styles.unitLabel}>{u.label}</div>
              </div>
            ))}
          </div>

          <p className={styles.sub}>
            High demand is expected. Secure your access and credits early.
          </p>

          <a href="/auth/signup" className={`btn btn-primary ${styles.cta}`}>
            🎖️ Secure Your Access Now
          </a>
        </div>
      </div>
    </section>
  );
}
