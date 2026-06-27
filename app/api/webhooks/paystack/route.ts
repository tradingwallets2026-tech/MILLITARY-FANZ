import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { getPostHogClient } from "@/lib/posthog-server";

export async function POST(request: NextRequest) {
  try {
    const paystackSecret = process.env.PAYSTACK_SECRET_KEY;
    if (!paystackSecret) {
      return NextResponse.json({ error: "Not configured" }, { status: 503 });
    }

    // Verify Paystack HMAC signature
    const body      = await request.text();
    const signature = request.headers.get("x-paystack-signature") ?? "";
    const hash      = crypto
      .createHmac("sha512", paystackSecret)
      .update(body)
      .digest("hex");

    if (hash !== signature) {
      console.warn("[paystack/webhook] Invalid signature");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const event = JSON.parse(body);

    if (event.event === "charge.success") {
      const { reference, metadata } = event.data;
      const userId  = metadata?.user_id;
      const credits = metadata?.credits;
      const planName = metadata?.plan_name;

      if (!userId || !credits) {
        return NextResponse.json({ error: "Missing metadata" }, { status: 400 });
      }

      const posthog = getPostHogClient();
      posthog.capture({
        distinctId: userId,
        event: "credit_purchase_completed",
        properties: {
          plan_name:      planName,
          credits:        credits,
          payment_method: "paystack",
          paystack_ref:   reference,
        },
      });

      try {
        const { createClient } = await import("@/lib/supabase/server");
        const supabase = await createClient();

        // Update payment record
        await supabase
          .from("payments")
          .update({ status: "success" })
          .eq("paystack_ref", reference);

        // Grant credits — use RPC for atomic update
        const { error: creditError } = await supabase.rpc("add_credits", {
          p_user_id:    userId,
          p_amount:     credits,
          p_plan_name:  planName,
          p_payment_ref: reference,
        });

        if (creditError) {
          // Fallback: direct update
          await supabase
            .from("credits")
            .update({
              balance: supabase.from("credits").select("balance"),
            })
            .eq("user_id", userId);

          console.error("[paystack/webhook] credit RPC error:", creditError.message);
        }
      } catch (dbErr) {
        console.error("[paystack/webhook] DB error:", dbErr);
      }
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error("[paystack/webhook]", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
