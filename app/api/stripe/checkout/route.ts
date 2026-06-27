import { NextResponse } from "next/server";
import Stripe from "stripe";
import { getUser } from "@/lib/actions";
import { getPostHogClient } from "@/lib/posthog-server";

const PLANS: Record<string, { name: string; credits: number; priceUSD: number }> = {
  recruit:    { name: "Recruit",    credits: 300,   priceUSD: 999   },
  operative:  { name: "Operative",  credits: 1000,  priceUSD: 2999  },
  specialist: { name: "Specialist", credits: 2000,  priceUSD: 5999  },
  commander:  { name: "Commander",  credits: 5000,  priceUSD: 14999 },
  ghost:      { name: "Ghost Unit", credits: 12000, priceUSD: 34999 },
};

export async function POST(request: Request) {
  try {
    const stripeKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeKey) {
      return NextResponse.json({ error: "Stripe not configured" }, { status: 503 });
    }

    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body   = await request.json();
    const planId = body.planId as string;
    const plan   = PLANS[planId];

    if (!plan) {
      return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2026-06-24.dahlia" });
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

    const session = await stripe.checkout.sessions.create({
      mode:                 "payment",
      payment_method_types: ["card"],
      customer_email:       user.email,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency:     "usd",
            unit_amount:  plan.priceUSD,
            product_data: {
              name:        `Military Pass — ${plan.name}`,
              description: `${plan.credits.toLocaleString()} credits (~${Math.floor(plan.credits / 6)} minutes)`,
              images:      [`${appUrl}/og-image.jpg`],
            },
          },
        },
      ],
      metadata: {
        user_id:   user.id,
        plan_id:   planId,
        credits:   plan.credits.toString(),
        plan_name: plan.name,
        currency:  "usd",
      },
      success_url: `${appUrl}/dashboard/credits?stripe=success&credits=${plan.credits}`,
      cancel_url:  `${appUrl}/pricing?stripe=cancelled`,
    });

    const posthog = getPostHogClient();
    posthog.capture({
      distinctId: user.id,
      event: "credit_purchase_initiated",
      properties: {
        plan_id:        planId,
        plan_name:      plan.name,
        credits:        plan.credits,
        price_usd:      plan.priceUSD / 100,
        payment_method: "stripe",
        session_id:     session.id,
      },
    });

    return NextResponse.json({ url: session.url, sessionId: session.id });
  } catch (err: unknown) {
    console.error("[stripe/checkout]", err);
    return NextResponse.json({ error: "Stripe error" }, { status: 500 });
  }
}
