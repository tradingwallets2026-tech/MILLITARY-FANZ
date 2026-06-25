"use client";
import { useState } from "react";
import styles from "./PricingSection.module.css";

const PLANS = [
  {
    id: "recruit",
    name: "Recruit",
    icon: "🪖",
    credits: 300,
    price: "₦16,000",
    minutes: "~50",
    popular: false,
  },
  {
    id: "operative",
    name: "Operative",
    icon: "🔫",
    credits: 1000,
    price: "₦50,999",
    minutes: "~167",
    popular: false,
  },
  {
    id: "specialist",
    name: "Specialist",
    icon: "⚔️",
    credits: 2000,
    price: "₦100,000",
    minutes: "~333",
    popular: true,
  },
  {
    id: "commander",
    name: "Commander",
    icon: "🎖️",
    credits: 5000,
    price: "₦259,999",
    minutes: "~833",
    popular: false,
  },
  {
    id: "ghost",
    name: "Ghost Unit",
    icon: "👻",
    credits: 12000,
    price: "₦599,999",
    minutes: "~2,000",
    popular: false,
  },
];

const FEATURES = [
  "Realtime face transformation",
  "AI voice conversion",
  "OBS & platform support",
  "5 military voice presets",
  "Privacy masking mode",
  "VTuber avatar output",
];

export default function PricingSection() {
  const [hovered, setHovered] = useState<string | null>(null);

  return (
    <section className={`section ${styles.section}`} id="pricing">
      <div className={`glow-orb glow-orb-cyan ${styles.orb}`} />
      <div className="container">
        <div className={styles.header}>
          <p className="section-label">Flexible Pricing</p>
          <h2 className="section-title">
            Choose your <span className="text-gradient">operation tier</span>
          </h2>
          <p className="section-subtitle">
            Pay-as-you-go credits. No subscriptions. Use only what you need.
            <br />
            <span className="font-mono" style={{ fontSize: "0.85rem", color: "var(--accent-cyan)" }}>
              6 credits per minute of active transformation
            </span>
          </p>
        </div>

        <div className={styles.grid}>
          {PLANS.map((plan) => (
            <div
              key={plan.id}
              className={`${styles.card} ${plan.popular ? styles.popular : ""} ${hovered === plan.id ? styles.cardHovered : ""}`}
              onMouseEnter={() => setHovered(plan.id)}
              onMouseLeave={() => setHovered(null)}
            >
              {plan.popular && (
                <div className={styles.popularBadge}>⭐ Most Popular</div>
              )}

              <div className={styles.planIcon}>{plan.icon}</div>
              <h3 className={styles.planName}>{plan.name}</h3>

              <div className={styles.credits}>
                <span className={styles.creditsNum}>{plan.credits.toLocaleString()}</span>
                <span className={styles.creditsLabel}>credits</span>
              </div>

              <div className={styles.price}>{plan.price}</div>

              <div className={styles.minutes}>
                ≈ {plan.minutes} minutes of transformation
              </div>

              <div className={styles.divider} />

              <ul className={styles.features}>
                {FEATURES.map((f) => (
                  <li key={f} className={styles.feature}>
                    <span className={styles.check}>✓</span>
                    {f}
                  </li>
                ))}
              </ul>

              <a
                href="/auth/signup"
                className={`btn ${plan.popular ? "btn-primary" : "btn-secondary"} ${styles.cta}`}
              >
                Get Started →
              </a>
            </div>
          ))}
        </div>

        <p className={styles.note}>
          All plans include access to all features. Credits never expire. Secure checkout via Paystack.
        </p>
      </div>
    </section>
  );
}
