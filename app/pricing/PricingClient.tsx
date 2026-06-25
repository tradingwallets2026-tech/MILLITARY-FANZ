"use client";
import { useState } from "react";
import Link from "next/link";
import PaystackButton from "@/components/PaystackButton";
import StripeButton from "@/components/StripeButton";
import { useRealtimeCredits } from "@/lib/hooks/useRealtimeCredits";
import styles from "./pricing.module.css";

const PLANS = [
  {
    id:       "recruit",
    name:     "Recruit",
    icon:     "🪖",
    credits:  300,
    price:    16000,
    priceUSD: 9.99,
    minutes:  50,
    popular:  false,
    features: ["300 credits", "~50 min live", "5 voice presets", "All avatars"],
  },
  {
    id:       "operative",
    name:     "Operative",
    icon:     "🔫",
    credits:  1000,
    price:    50999,
    priceUSD: 29.99,
    minutes:  167,
    popular:  false,
    features: ["1,000 credits", "~167 min live", "5 voice presets", "All avatars", "Priority support"],
  },
  {
    id:       "specialist",
    name:     "Specialist",
    icon:     "⚔️",
    credits:  2000,
    price:    100000,
    priceUSD: 59.99,
    minutes:  333,
    popular:  true,
    features: ["2,000 credits", "~333 min live", "All presets", "Custom avatars", "Priority support", "1080p output"],
  },
  {
    id:       "commander",
    name:     "Commander",
    icon:     "🎖️",
    credits:  5000,
    price:    259999,
    priceUSD: 149.99,
    minutes:  833,
    popular:  false,
    features: ["5,000 credits", "~833 min live", "All features", "Early access", "Dedicated support"],
  },
  {
    id:       "ghost",
    name:     "Ghost Unit",
    icon:     "👻",
    credits:  12000,
    price:    599999,
    priceUSD: 349.99,
    minutes:  2000,
    popular:  false,
    features: ["12,000 credits", "~2,000 min live", "All features", "Team sharing", "API access", "White-label"],
  },
];

interface PricingClientProps {
  user:           { id: string; email: string } | null;
  initialBalance: number;
}

export default function PricingClient({ user, initialBalance }: PricingClientProps) {
  const [successPlan, setSuccessPlan] = useState<string | null>(null);
  const [justBought,  setJustBought]  = useState<number>(0);

  const { balance, refresh } = useRealtimeCredits(user?.id ?? "", initialBalance);

  const handleSuccess = async (reference: string, credits: number) => {
    setJustBought(credits);
    setSuccessPlan(reference);
    await refresh();
  };

  return (
    <div className={styles.root}>
      {/* Header */}
      <div className={styles.header}>
        <Link href="/" className={styles.backLink}>← Home</Link>
        <span className={styles.badge}>💳 Secure NGN Payments via Paystack</span>
        <h1 className={styles.title}>Choose Your Mission Tier</h1>
        <p className={styles.sub}>
          Credits power your live transformations. 6 credits = 1 minute of operation.
        </p>

        {user && (
          <div className={styles.currentBalance}>
            <span className={styles.balanceLabel}>Current Balance</span>
            <span className={styles.balanceNum}>⚡ {balance.toLocaleString()} credits</span>
          </div>
        )}
      </div>

      {/* Success toast */}
      {successPlan && (
        <div className={styles.successBanner}>
          ✅ Payment successful! <strong>+{justBought.toLocaleString()} credits</strong> added to your account.{" "}
          {user && <Link href="/studio" className={styles.studioLink}>→ Launch Studio</Link>}
        </div>
      )}

      {/* Plans grid */}
      <div className={styles.grid}>
        {PLANS.map((plan) => (
          <div
            key={plan.id}
            className={`${styles.card} ${plan.popular ? styles.popular : ""}`}
          >
            {plan.popular && <div className={styles.popularBadge}>⭐ Most Popular</div>}

            <div className={styles.cardHeader}>
              <span className={styles.planIcon}>{plan.icon}</span>
              <h2 className={styles.planName}>{plan.name}</h2>
            </div>

            <div className={styles.priceRow}>
              <span className={styles.currency}>₦</span>
              <span className={styles.amount}>
                {Math.floor(plan.price / 1000).toLocaleString()}
                <span className={styles.decimal}>,{String(plan.price % 1000).padStart(3, "0")}</span>
              </span>
            </div>

            <div className={styles.creditsRow}>
              <span className={styles.creditsNum}>{plan.credits.toLocaleString()}</span>
              <span className={styles.creditsLabel}> credits · ~{plan.minutes} min</span>
            </div>

            <ul className={styles.features}>
              {plan.features.map((f) => (
                <li key={f}>
                  <span className={styles.check}>✓</span> {f}
                </li>
              ))}
            </ul>

            <div className={styles.cardCTA}>
              {user ? (
                <>
                  <PaystackButton
                    planId={plan.id}
                    userEmail={user.email}
                    userId={user.id}
                    onSuccess={handleSuccess}
                    className={plan.popular ? styles.popularBtn : ""}
                  />
                  <StripeButton
                    planId={plan.id}
                    priceUSD={plan.priceUSD}
                    credits={plan.credits}
                    userId={user.id}
                    userEmail={user.email}
                    className={styles.stripeBtn}
                  />
                </>
              ) : (
                <Link href="/auth/signup" className={`btn btn-primary ${styles.signupBtn}`}>
                  Get Started Free
                </Link>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Rate breakdown */}
      <div className={styles.rateNote}>
        <span>⚡ 6 credits / minute</span>
        <span className={styles.rateDivider}>·</span>
        <span>~₦{Math.round(50999 / 1000).toLocaleString()} per credit (Operative)</span>
        <span className={styles.rateDivider}>·</span>
        <span>Credits never expire</span>
        <span className={styles.rateDivider}>·</span>
        <span>Secure • No subscription</span>
      </div>
    </div>
  );
}
