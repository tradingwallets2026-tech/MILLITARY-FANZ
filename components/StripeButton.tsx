"use client";
import { useState } from "react";
import posthog from "posthog-js";
import styles from "./StripeButton.module.css";

export interface StripeButtonProps {
  planId:      string;
  priceUSD?:   number;   // Informational — displayed on button label
  credits?:    number;   // Passed to checkout session metadata
  userId?:     string;   // Passed to checkout session metadata
  userEmail?:  string;   // Prefills Stripe Checkout email field
  className?:  string;
  label?:      string;
}

export default function StripeButton({
  planId,
  priceUSD,
  credits,
  userId,
  userEmail,
  className = "",
  label,
}: StripeButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    setLoading(true);
    posthog.capture("plan_selected", {
      plan_id:        planId,
      credits,
      price_usd:      priceUSD,
      payment_method: "stripe",
      user_id:        userId,
    });
    try {
      const res  = await fetch("/api/stripe/checkout", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ planId, credits, userId, userEmail }),
      });
      const data = await res.json();

      if (data.url) {
        window.location.href = data.url; // Redirect to Stripe Checkout
      } else {
        alert(data.error ?? "Payment error. Please try again.");
        setLoading(false);
      }
    } catch {
      alert("Network error. Please try again.");
      setLoading(false);
    }
  };

  const buttonLabel = label
    ?? (priceUSD ? `💳 Pay $${priceUSD} USD` : "💳 Pay USD");

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className={`btn btn-ghost ${styles.btn} ${className}`}
      title="Pay in USD via Stripe"
    >
      {loading ? (
        <span className={styles.spinner} />
      ) : (
        <>{buttonLabel}</>
      )}
    </button>
  );
}
