"use server";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

/* ─── Supabase config guard ──────────────────────────────── */
function isSupabaseConfigured() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  return url.startsWith("http://") || url.startsWith("https://");
}

async function safeClient() {
  if (!isSupabaseConfigured()) throw new Error("SUPABASE_NOT_CONFIGURED");
  return createClient();
}

/* ─── AUTH ──────────────────────────────────────────────── */
export async function signUp(formData: FormData) {
  if (!isSupabaseConfigured())
    return { error: "Supabase not configured. Add credentials to .env.local" };

  const supabase = await createClient();
  const email    = formData.get("email")    as string;
  const password = formData.get("password") as string;
  const username = formData.get("username") as string;

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { username, full_name: username },
      emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/callback`,
    },
  });

  if (error) return { error: error.message };
  redirect("/dashboard?welcome=1");
}

export async function signIn(formData: FormData) {
  if (!isSupabaseConfigured())
    return { error: "Supabase not configured. Add credentials to .env.local" };

  const supabase = await createClient();
  const email    = formData.get("email")    as string;
  const password = formData.get("password") as string;

  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) return { error: error.message };
  redirect("/dashboard");
}

export async function signOut() {
  if (!isSupabaseConfigured()) redirect("/");
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}

/* ─── USER ──────────────────────────────────────────────── */
export async function getUser() {
  if (!isSupabaseConfigured()) return null;
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    return user;
  } catch { return null; }
}

export async function getUserProfile(userId: string) {
  try {
    const supabase = await safeClient();
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();
    return data;
  } catch { return null; }
}

export async function updateProfile(userId: string, updates: {
  username?: string;
  display_name?: string;
  bio?: string;
  website?: string;
}) {
  try {
    const supabase = await safeClient();
    const { error } = await supabase
      .from("profiles")
      .update(updates)
      .eq("id", userId);
    if (error) return { error: error.message };
    revalidatePath("/dashboard");
    return { success: true };
  } catch { return { error: "Service unavailable" }; }
}

/* ─── CREDITS ───────────────────────────────────────────── */
export async function getUserCredits(userId: string) {
  try {
    const supabase = await safeClient();
    const { data } = await supabase
      .from("credits")
      .select("balance, total_purchased, total_used")
      .eq("user_id", userId)
      .single();
    return data;
  } catch { return null; }
}

export async function getCreditTransactions(userId: string, limit = 20) {
  try {
    const supabase = await safeClient();
    const { data } = await supabase
      .from("credit_transactions")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(limit);
    return data || [];
  } catch { return []; }
}

/* ─── AVATARS ───────────────────────────────────────────── */
export async function getUserAvatars(userId: string) {
  try {
    const supabase = await safeClient();
    const { data } = await supabase
      .from("avatars")
      .select("*")
      .or(`user_id.eq.${userId},is_preset.eq.true`)
      .order("is_preset", { ascending: false })
      .order("created_at", { ascending: false });
    return data || [];
  } catch { return []; }
}

export async function setDefaultAvatar(avatarId: string, userId: string) {
  try {
    const supabase = await safeClient();
    await supabase.from("avatars").update({ is_default: false }).eq("user_id", userId);
    await supabase.from("avatars").update({ is_default: true }).eq("id", avatarId);
    revalidatePath("/dashboard");
    return { success: true };
  } catch { return { error: "Failed to set default avatar" }; }
}

export async function deleteAvatar(avatarId: string, userId: string) {
  try {
    const supabase = await safeClient();
    const { error } = await supabase
      .from("avatars")
      .delete()
      .eq("id", avatarId)
      .eq("user_id", userId);
    if (error) return { error: error.message };
    revalidatePath("/dashboard");
    return { success: true };
  } catch { return { error: "Failed to delete avatar" }; }
}

/* ─── VOICE PROFILES ────────────────────────────────────── */
export async function getUserVoiceProfiles(userId: string) {
  try {
    const supabase = await safeClient();
    const { data } = await supabase
      .from("voice_profiles")
      .select("*")
      .or(`user_id.eq.${userId},is_preset.eq.true`)
      .order("is_preset", { ascending: false })
      .order("created_at", { ascending: false });
    return data || [];
  } catch { return []; }
}

export async function setDefaultVoice(voiceId: string, userId: string) {
  try {
    const supabase = await safeClient();
    await supabase.from("voice_profiles").update({ is_default: false }).eq("user_id", userId);
    await supabase.from("voice_profiles").update({ is_default: true }).eq("id", voiceId);
    revalidatePath("/dashboard");
    return { success: true };
  } catch { return { error: "Failed to set default voice" }; }
}

/* ─── SESSIONS ──────────────────────────────────────────── */
export async function getRecentSessions(userId: string) {
  try {
    const supabase = await safeClient();
    const { data } = await supabase
      .from("transform_sessions")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(5);
    return data || [];
  } catch { return []; }
}

export async function getAllSessions(userId: string) {
  try {
    const supabase = await safeClient();
    const { data } = await supabase
      .from("transform_sessions")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(50);
    return data || [];
  } catch { return []; }
}

export async function createSession(params: {
  userId: string;
  avatarId?: string;
  voiceProfileId?: string;
}) {
  try {
    const supabase = await safeClient();
    const { data, error } = await supabase
      .from("transform_sessions")
      .insert({
        user_id: params.userId,
        avatar_id: params.avatarId ?? null,
        voice_profile_id: params.voiceProfileId ?? null,
        status: "initializing",
        started_at: new Date().toISOString(),
      })
      .select()
      .single();
    if (error) return { error: error.message };
    return { session: data };
  } catch { return { error: "Failed to create session" }; }
}

export async function endSession(sessionId: string, stats: {
  duration_seconds: number;
  credits_used: number;
  frames_processed: number;
  avg_latency_ms?: number;
}) {
  try {
    const supabase = await safeClient();
    const { error } = await supabase
      .from("transform_sessions")
      .update({
        status: "ended",
        ended_at: new Date().toISOString(),
        ...stats,
      })
      .eq("id", sessionId);
    if (error) return { error: error.message };
    return { success: true };
  } catch { return { error: "Failed to end session" }; }
}

/* ─── PAYMENTS ──────────────────────────────────────────── */
export async function getPaymentHistory(userId: string) {
  try {
    const supabase = await safeClient();
    const { data } = await supabase
      .from("payments")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(20);
    return data || [];
  } catch { return []; }
}
