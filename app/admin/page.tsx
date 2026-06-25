import { redirect }          from "next/navigation";
import { getUser }           from "@/lib/actions";
import { createClient }      from "@/lib/supabase/server";
import AdminClient           from "./AdminClient";
import type { Metadata }     from "next";

export const metadata: Metadata = {
  title: "Admin — Military Pass",
  description: "Admin dashboard — revenue, analytics, session metrics.",
};

export default async function AdminPage() {
  const user = await getUser();
  if (!user) redirect("/auth/login");

  const supabase = await createClient();

  // Check admin flag on profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  if (!profile?.is_admin) redirect("/dashboard");

  // ── Aggregate metrics ─────────────────────────────────────
  const [
    { data: userStats },
    { data: revenueStats },
    { data: sessionStats },
    { data: recentUsers },
    { data: recentPayments },
  ] = await Promise.all([
    supabase.rpc("admin_user_stats"),
    supabase.rpc("admin_revenue_stats"),
    supabase.rpc("admin_session_stats"),
    supabase
      .from("profiles")
      .select("id, username, display_name, created_at")
      .order("created_at", { ascending: false })
      .limit(10),
    supabase
      .from("payments")
      .select("id, user_id, plan_name, amount_kobo, currency, status, created_at")
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  return (
    <AdminClient
      userStats={userStats}
      revenueStats={revenueStats}
      sessionStats={sessionStats}
      recentUsers={recentUsers ?? []}
      recentPayments={recentPayments ?? []}
    />
  );
}
