import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@/lib/supabase/server";
import { getPostHogClient } from "@/lib/posthog-server";

export async function POST(request: NextRequest) {
  const stripeKey    = process.env.STRIPE_SECRET_KEY    ?? "";
  const webhookSecret= process.env.STRIPE_WEBHOOK_SECRET ?? "";

  if (!stripeKey) {
    return NextResponse.json({ error: "Stripe not configured" }, { status: 503 });
  }

  const stripe  = new Stripe(stripeKey, { apiVersion: "2026-06-24.dahlia" });
  const rawBody = await request.text();
  const sig     = request.headers.get("stripe-signature") ?? "";

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Webhook signature verification failed";
    console.error("[stripe/webhook] Signature error:", msg);
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session  = event.data.object as Stripe.Checkout.Session;
    const meta     = session.metadata ?? {};
    const userId   = meta.user_id;
    const planId   = meta.plan_id;
    const credits  = parseInt(meta.credits ?? "0", 10);
    const planName = meta.plan_name;
    const stripeRef = session.id;

    if (!userId || !credits) {
      console.error("[stripe/webhook] Missing metadata:", meta);
      return NextResponse.json({ error: "Missing metadata" }, { status: 400 });
    }

    try {
      const supabase = await createClient();

      // Use the same atomic add_credits RPC as Paystack
      const { error: rpcError } = await supabase.rpc("add_credits", {
        p_user_id:     userId,
        p_amount:      credits,
        p_plan_name:   planName,
        p_payment_ref: `stripe:${stripeRef}`,
      });

      if (rpcError) {
        console.error("[stripe/webhook] RPC error:", rpcError);
        return NextResponse.json({ error: rpcError.message }, { status: 500 });
      }

      // Log payment record
      const amountUSD = session.amount_total ?? 0;
      await supabase.from("payments").insert({
        user_id:         userId,
        paystack_ref:    `stripe:${stripeRef}`,
        amount_kobo:     amountUSD,
        plan_id:         planId,
        plan_name:       planName,
        credits_granted: credits,
        currency:        "usd",
        status:          "success",
      });

      const posthog = getPostHogClient();
      posthog.capture({
        distinctId: userId,
        event: "credit_purchase_completed",
        properties: {
          plan_id:        planId,
          plan_name:      planName,
          credits:        credits,
          amount_usd:     (amountUSD / 100).toFixed(2),
          payment_method: "stripe",
          stripe_session: stripeRef,
        },
      });

      console.log(`[stripe/webhook] ✅ +${credits} credits for user ${userId} (${planName})`);
      return NextResponse.json({ received: true, credits_added: credits });
    } catch (err) {
      console.error("[stripe/webhook] DB error:", err);
      return NextResponse.json({ error: "Database error" }, { status: 500 });
    }
  }

  // Acknowledge other events
  return NextResponse.json({ received: true, event: event.type });
}
