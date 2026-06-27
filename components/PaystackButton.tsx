"use client";
import { useState, useEffect } from "react";
import styles from "./PaystackButton.module.css";
import posthog from "posthog-js";

declare global {
  interface Window {
    PaystackPop?: {
      setup: (opts: PaystackSetupOptions) => { openIframe: () => void };
    };
  }
}

interface PaystackSetupOptions {
  key: string;
  email: string;
  amount: number;
  currency: string;
  ref: string;
  metadata: Record<string, unknown>;
  callback: (response: { reference: string }) => void;
  onClose: () => void;
}

const PLANS = [
  { id: "recruit",    name: "Recruit",    icon: "🪖", credits: 300,   amountNGN: 16000,  popular: false },
  { id: "operative",  name: "Operative",  icon: "🔫", credits: 1000,  amountNGN: 50999,  popular: false },
  { id: "specialist", name: "Specialist", icon: "⚔️", credits: 2000,  amountNGN: 100000, popular: true  },
  { id: "commander",  name: "Commander",  icon: "🎖️", credits: 5000,  amountNGN: 259999, popular: false },
  { id: "ghost",      name: "Ghost Unit", icon: "👻", credits: 12000, amountNGN: 599999, popular: false },
];

interface PaystackButtonProps {
  planId: string;
  userEmail: string;
  userId: string;
  onSuccess?: (reference: string, credits: number) => void;
  onClose?: () => void;
  className?: string;
}

export default function PaystackButton({
  planId,
  userEmail,
  userId,
  onSuccess,
  onClose,
  className = "",
}: PaystackButtonProps) {
  const [loading,   setLoading]   = useState(false);
  const [scriptOk,  setScriptOk]  = useState(false);

  const plan = PLANS.find((p) => p.id === planId);
  const pubKey = process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY ?? "";

  // ─── Load Paystack.js inline script ────────────────────────
  useEffect(() => {
    if (window.PaystackPop) { setScriptOk(true); return; }
    const script = document.createElement("script");
    script.src = "https://js.paystack.co/v1/inline.js";
    script.async = true;
    script.onload = () => setScriptOk(true);
    document.head.appendChild(script);
    return () => {
      try { document.head.removeChild(script); } catch {}
    };
  }, []);

  if (!plan) return null;

  const handlePay = async () => {
    if (!scriptOk || !window.PaystackPop) {
      alert("Payment system loading… please try again in a moment.");
      return;
    }
    if (!pubKey) {
      alert("Paystack is not configured yet. Add NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY to .env.local");
      return;
    }

    setLoading(true);
    posthog.capture("plan_selected", {
      plan_id:        planId,
      plan_name:      plan.name,
      credits:        plan.credits,
      amount_ngn:     plan.amountNGN,
      payment_method: "paystack",
      user_id:        userId,
    });

    // Generate reference on server (ensures metadata is signed)
    let ref = `MP-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

    try {
      const initRes = await fetch("/api/credits/purchase", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ planId }),
      });
      const initData = await initRes.json();
      if (initData.data?.reference) ref = initData.data.reference;
    } catch {
      // Use client-side ref as fallback
    }

    const handler = window.PaystackPop.setup({
      key:      pubKey,
      email:    userEmail,
      amount:   plan.amountNGN * 100, // kobo
      currency: "NGN",
      ref,
      metadata: {
        user_id:    userId,
        plan_id:    planId,
        credits:    plan.credits,
        plan_name:  plan.name,
      },
      callback: (response) => {
        setLoading(false);
        onSuccess?.(response.reference, plan.credits);
      },
      onClose: () => {
        setLoading(false);
        onClose?.();
      },
    });

    handler.openIframe();
  };

  return (
    <button
      onClick={handlePay}
      disabled={loading || !scriptOk}
      className={`btn btn-primary ${styles.btn} ${className}`}
    >
      {loading ? (
        <span className={styles.spinner} />
      ) : (
        <>
          {plan.icon} Pay ₦{plan.amountNGN.toLocaleString()}
        </>
      )}
    </button>
  );
}
