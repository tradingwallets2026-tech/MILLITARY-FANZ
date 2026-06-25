import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/actions";

export async function GET(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { createClient } = await import("@/lib/supabase/server");
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("credits")
      .select("balance, total_purchased, total_used")
      .eq("user_id", user.id)
      .single();

    if (error) return NextResponse.json({ balance: 0, total_purchased: 0, total_used: 0 });

    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { action, amount } = await request.json();

    const { createClient } = await import("@/lib/supabase/server");
    const supabase = await createClient();

    if (action === "deduct") {
      // Deduct credits from an active session
      const { data: current } = await supabase
        .from("credits")
        .select("balance")
        .eq("user_id", user.id)
        .single();

      if (!current || current.balance < amount) {
        return NextResponse.json({ error: "Insufficient credits" }, { status: 402 });
      }

      const { error } = await supabase
        .from("credits")
        .update({
          balance:    current.balance - amount,
          total_used: supabase.from("credits").select("total_used"),
        })
        .eq("user_id", user.id);

      if (error) return NextResponse.json({ error: error.message }, { status: 500 });

      // Log transaction
      await supabase.from("credit_transactions").insert({
        user_id:      user.id,
        amount:       -amount,
        tx_type:      "deduction",
        balance_after: current.balance - amount,
        description:  "Live transformation session",
      });

      return NextResponse.json({ balance: current.balance - amount });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch {
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
