// Military Pass — Send Invoice Email
// Supabase Edge Function (Deno runtime)
// Deploy: supabase functions deploy send-invoice
//
// Triggers via:
//   supabase.functions.invoke("send-invoice", { body: { userId, paymentId } })
//   OR database webhook on payments INSERT WHERE status = 'success'

import { serve }       from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient }from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL  = Deno.env.get("SUPABASE_URL")              ?? "";
const SERVICE_KEY   = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const RESEND_API_KEY= Deno.env.get("RESEND_API_KEY")            ?? "";
const FROM_EMAIL    = "invoices@militarypass.com";

serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  try {
    const { userId, paymentId } = await req.json();

    if (!userId || !paymentId) {
      return new Response(JSON.stringify({ error: "Missing userId or paymentId" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

    // Fetch payment record
    const { data: payment, error: payErr } = await supabase
      .from("payments")
      .select("*, profiles(email:id, display_name, username)")
      .eq("id", paymentId)
      .eq("user_id", userId)
      .single();

    if (payErr || !payment) {
      return new Response(JSON.stringify({ error: "Payment not found" }), {
        status: 404, headers: { "Content-Type": "application/json" },
      });
    }

    // Determine currency + amount display
    const currency  = payment.currency?.toLowerCase() ?? "ngn";
    const amount    = currency === "usd"
      ? `$${(payment.amount_kobo / 100).toFixed(2)}`
      : `₦${(payment.amount_kobo / 100).toLocaleString("en-NG")}`;

    const profile   = Array.isArray(payment.profiles)
      ? payment.profiles[0]
      : payment.profiles;
    const name      = profile?.display_name ?? profile?.username ?? "Operator";

    // Build invoice HTML
    const invoiceHtml = buildInvoiceHtml({
      invoiceId:    payment.id.substring(0, 8).toUpperCase(),
      date:         new Date(payment.created_at).toLocaleDateString("en-GB"),
      name,
      plan:         payment.plan_name,
      credits:      payment.credits_granted ?? 0,
      amount,
      ref:          payment.paystack_ref,
    });

    // Send via Resend (https://resend.com)
    if (!RESEND_API_KEY) {
      console.log("[send-invoice] No RESEND_API_KEY — invoice not sent (dev mode)");
      return new Response(JSON.stringify({ sent: false, reason: "no_resend_key" }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    // Fetch email from Supabase Auth admin API using the Service Role Key
    const { data: authUser, error: authErr } = await supabase.auth.admin.getUserById(userId);
    if (authErr || !authUser?.user?.email) {
      console.error("[send-invoice] Failed to get user email:", authErr);
      return new Response(JSON.stringify({ error: "User email not found in auth.users" }), {
        status: 404, headers: { "Content-Type": "application/json" },
      });
    }
    const userEmail = authUser.user.email;

    const emailRes = await fetch("https://api.resend.com/emails", {
      method:  "POST",
      headers: {
        "Content-Type":  "application/json",
        "Authorization": `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from:    FROM_EMAIL,
        to:      [userEmail], // Send to actual user email address resolved via Auth Admin API
        subject: `🎖️ Military Pass Invoice — ${payment.plan_name} Plan`,
        html:    invoiceHtml,
      }),
    });

    const emailData = await emailRes.json();

    if (!emailRes.ok) {
      console.error("[send-invoice] Resend error:", emailData);
      return new Response(JSON.stringify({ error: "Email send failed", details: emailData }), {
        status: 502, headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ sent: true, emailId: emailData.id }), {
      headers: { "Content-Type": "application/json" },
    });

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { "Content-Type": "application/json" },
    });
  }
});

// ─── Invoice HTML template ────────────────────────────────────────
function buildInvoiceHtml(d: {
  invoiceId: string; date: string; name: string;
  plan: string; credits: number; amount: string; ref: string;
}) {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <style>
    body { font-family: Arial, sans-serif; background: #0a0a0f; color: #e2e8f0; margin: 0; padding: 40px 20px; }
    .card { max-width: 560px; margin: 0 auto; background: #12121a; border: 1px solid #2a2a3a; border-radius: 16px; padding: 40px; }
    .logo { font-size: 1.4rem; font-weight: 800; color: #00d4ff; letter-spacing: 0.12em; margin-bottom: 32px; }
    h1 { font-size: 1.6rem; margin: 0 0 8px; color: #f8fafc; }
    .meta { font-size: 0.8rem; color: #64748b; margin-bottom: 32px; font-family: monospace; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
    th { text-align: left; font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.08em; color: #64748b; padding: 8px 0; border-bottom: 1px solid #2a2a3a; }
    td { padding: 10px 0; font-size: 0.9rem; color: #cbd5e1; border-bottom: 1px solid #1e1e2e; }
    .total-row td { font-size: 1.1rem; font-weight: 700; color: #00d4ff; border-bottom: none; padding-top: 16px; }
    .footer { font-size: 0.75rem; color: #475569; text-align: center; margin-top: 32px; border-top: 1px solid #2a2a3a; padding-top: 20px; }
    .ref { font-family: monospace; font-size: 0.7rem; color: #475569; word-break: break-all; }
  </style>
</head>
<body>
  <div class="card">
    <div class="logo">🎖️ MILITARY PASS</div>
    <h1>Payment Invoice</h1>
    <div class="meta">
      Invoice #MP-${d.invoiceId} &nbsp;·&nbsp; ${d.date}
    </div>

    <table>
      <tr><th>Description</th><th>Credits</th><th>Amount</th></tr>
      <tr>
        <td>${d.name} — ${d.plan} Plan</td>
        <td>⚡ ${d.credits.toLocaleString()}</td>
        <td>${d.amount}</td>
      </tr>
      <tr class="total-row">
        <td colspan="2">Total Paid</td>
        <td>${d.amount}</td>
      </tr>
    </table>

    <p class="ref">Reference: ${d.ref}</p>

    <div class="footer">
      Thank you for your service, Operator.<br/>
      Military Pass · militarypass.com
    </div>
  </div>
</body>
</html>`;
}
