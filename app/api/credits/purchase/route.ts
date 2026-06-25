import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/actions";

const PLANS: Record<string, { credits: number; amountKobo: number; name: string }> = {
  recruit:    { credits: 300,   amountKobo: 1_600_000, name: "Recruit" },
  operative:  { credits: 1000,  amountKobo: 5_099_900, name: "Operative" },
  specialist: { credits: 2000,  amountKobo: 10_000_000, name: "Specialist" },
  commander:  { credits: 5000,  amountKobo: 25_999_900, name: "Commander" },
  ghost:      { credits: 12000, amountKobo: 59_999_900, name: "Ghost Unit" },
};

export async function POST(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { planId } = await request.json();
    const plan = PLANS[planId];
    if (!plan) {
      return NextResponse.json({ error: "Invalid plan ID" }, { status: 400 });
    }

    const paystackSecret = process.env.PAYSTACK_SECRET_KEY;
    if (!paystackSecret) {
      return NextResponse.json(
        { error: "Payment gateway not configured" },
        { status: 503 }
      );
    }

    // Create Paystack payment session
    const reference = `MILPASS-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

    const paystackRes = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${paystackSecret}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: user.email,
        amount: plan.amountKobo,          // In kobo (NGN × 100)
        currency: "NGN",
        reference,
        callback_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/credits?payment=success`,
        metadata: {
          user_id: user.id,
          plan_id: planId,
          plan_name: plan.name,
          credits: plan.credits,
          custom_fields: [
            { display_name: "Plan",    variable_name: "plan",    value: plan.name },
            { display_name: "Credits", variable_name: "credits", value: plan.credits },
          ],
        },
      }),
    });

    const paystackData = await paystackRes.json();

    if (!paystackData.status) {
      return NextResponse.json({ error: paystackData.message }, { status: 400 });
    }

    // Record pending payment in DB
    try {
      const { createClient } = await import("@/lib/supabase/server");
      const supabase = await createClient();
      await supabase.from("payments").insert({
        user_id: user.id,
        paystack_ref: reference,
        amount_kobo: plan.amountKobo,
        currency: "NGN",
        credits_granted: plan.credits,
        plan_name: plan.name,
        status: "pending",
      });
    } catch { /* Non-fatal: webhook will handle credit grant */ }

    return NextResponse.json({
      authorization_url: paystackData.data.authorization_url,
      reference,
      access_code: paystackData.data.access_code,
    });
  } catch (err) {
    console.error("[credits/purchase]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
