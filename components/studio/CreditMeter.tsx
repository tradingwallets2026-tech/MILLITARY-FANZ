"use client";
import { useEffect, useRef, useState } from "react";
import styles from "./CreditMeter.module.css";

interface CreditMeterProps {
  initialBalance: number;
  isRunning: boolean;
  onCreditDeducted?: (newBalance: number) => void;
  onExhausted?: () => void;
  sessionId: string | null;
}

const CREDITS_PER_MINUTE = 6;
const DEDUCT_INTERVAL_MS = 10_000;  // every 10 seconds = 1 credit
const WARN_THRESHOLD     = 30;       // ~5 minutes remaining

export default function CreditMeter({
  initialBalance,
  isRunning,
  onCreditDeducted,
  onExhausted,
  sessionId,
}: CreditMeterProps) {
  const [balance,   setBalance]   = useState(initialBalance);
  const [elapsed,   setElapsed]   = useState(0);   // seconds
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const elapsedRef  = useRef<ReturnType<typeof setInterval> | null>(null);

  const minutesLeft = Math.floor(balance / CREDITS_PER_MINUTE);
  const secondsLeft = Math.floor((balance / CREDITS_PER_MINUTE - minutesLeft) * 60);
  const isWarning   = balance <= WARN_THRESHOLD && balance > 0;
  const isExhausted = balance <= 0;

  useEffect(() => {
    setBalance(initialBalance);
  }, [initialBalance]);

  useEffect(() => {
    if (isRunning && !isExhausted) {
      // Credit deduction every 10s
      intervalRef.current = setInterval(async () => {
        setBalance((prev) => {
          const next = Math.max(0, prev - 1);
          onCreditDeducted?.(next);
          if (next <= 0) onExhausted?.();
          return next;
        });

        // Sync deduction with server
        try {
          await fetch("/api/credits/balance", {
            method:  "POST",
            headers: { "Content-Type": "application/json" },
            body:    JSON.stringify({ action: "deduct", amount: 1 }),
          });
        } catch { /* silently fail */ }
      }, DEDUCT_INTERVAL_MS);

      // Elapsed timer (every second)
      elapsedRef.current = setInterval(() => {
        setElapsed((s) => s + 1);
      }, 1000);

    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (elapsedRef.current)  clearInterval(elapsedRef.current);
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (elapsedRef.current)  clearInterval(elapsedRef.current);
    };
  }, [isRunning, isExhausted, onCreditDeducted, onExhausted]);

  const elapsedFmt = `${String(Math.floor(elapsed / 60)).padStart(2, "0")}:${String(elapsed % 60).padStart(2, "0")}`;
  const barPct     = initialBalance > 0 ? (balance / initialBalance) * 100 : 0;

  return (
    <div className={`${styles.root} ${isWarning ? styles.warning : ""} ${isExhausted ? styles.exhausted : ""}`}>
      {/* Balance display */}
      <div className={styles.balanceRow}>
        <div className={styles.icon}>⚡</div>
        <div className={styles.balance}>
          <span className={styles.num}>{balance.toLocaleString()}</span>
          <span className={styles.unit}>credits</span>
        </div>
        <div className={styles.timeLeft}>
          {isExhausted ? (
            <span className={styles.exhaustedLabel}>DEPLETED</span>
          ) : (
            <>
              <span className={styles.timeNum}>
                {minutesLeft}:{String(secondsLeft).padStart(2, "0")}
              </span>
              <span className={styles.timeUnit}>remaining</span>
            </>
          )}
        </div>
      </div>

      {/* Progress bar */}
      <div className={styles.track}>
        <div
          className={`${styles.fill} ${isWarning ? styles.fillWarn : ""} ${isExhausted ? styles.fillDead : ""}`}
          style={{ width: `${barPct}%` }}
        />
      </div>

      {/* Session timer + rate */}
      <div className={styles.meta}>
        {isRunning && <span className={styles.timer}>⏱ {elapsedFmt}</span>}
        <span className={styles.rate}>6 credits / minute</span>
        {isWarning && !isExhausted && (
          <span className={styles.warnLabel}>⚠ LOW CREDITS</span>
        )}
      </div>

      {/* Exhausted CTA */}
      {isExhausted && (
        <a href="/dashboard/credits" className={`btn btn-primary ${styles.buyBtn}`}>
          💳 Buy Credits
        </a>
      )}
    </div>
  );
}
