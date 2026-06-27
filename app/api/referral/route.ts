import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/actions";
import { createClient } from "@/lib/supabase/server";
import crypto from "crypto";
import { getPostHogClient } from "@/lib/posthog-server";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
const REFERRAL_BONUS_INVITER = 50;  // credits given to the person who referred
const REFERRAL_BONUS_INVITEE = 25;  // credits given to the new sign-up

// ── GET /api/referral — Get current user's referral code + stats
export async function GET() {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = await createClient();

  // Get or create referral code for this user
  const { data: existing } = await supabase
    .from("referrals")
    .select("code, total_referrals, total_credits_earned")
    .eq("user_id", user.id)
    .single();

  if (existing) {
    return NextResponse.json({
      code:          existing.code,
      link:          `${APP_URL}/auth/signup?ref=${existing.code}`,
      totalReferrals: existing.total_referrals,
      creditsEarned: existing.total_credits_earned,
      bonusPerReferral: REFERRAL_BONUS_INVITER,
    });
  }

  // Generate new unique code
  const code = crypto
    .createHash("sha256")
    .update(`${user.id}-${Date.now()}`)
    .digest("hex")
    .substring(0, 8)
    .toUpperCase();

  await supabase.from("referrals").insert({
    user_id:               user.id,
    code,
    total_referrals:       0,
    total_credits_earned:  0,
  });

  return NextResponse.json({
    code,
    link:            `${APP_URL}/auth/signup?ref=${code}`,
    totalReferrals:  0,
    creditsEarned:   0,
    bonusPerReferral: REFERRAL_BONUS_INVITER,
  });
}

// ── POST /api/referral — Claim a referral bonus after signup
export async function POST(request: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { referralCode } = await request.json();
  if (!referralCode) return NextResponse.json({ error: "No code provided" }, { status: 400 });

  const supabase = await createClient();

  // Prevent self-referral
  const { data: refRow } = await supabase
    .from("referrals")
    .select("user_id, code")
    .eq("code", referralCode.toUpperCase())
    .single();

  if (!refRow) return NextResponse.json({ error: "Invalid referral code" }, { status: 404 });
  if (refRow.user_id === user.id) return NextResponse.json({ error: "Self-referral not allowed" }, { status: 400 });

  // Check not already claimed
  const { data: claimed } = await supabase
    .from("referral_claims")
    .select("id")
    .eq("invitee_id", user.id)
    .single();

  if (claimed) return NextResponse.json({ error: "Already claimed" }, { status: 409 });

  // Award invitee credits
  await supabase.rpc("add_credits", {
    p_user_id:     user.id,
    p_amount:      REFERRAL_BONUS_INVITEE,
    p_plan_name:   "referral_bonus",
    p_payment_ref: `ref:${referralCode}:invitee`,
  });

  // Award inviter credits
  await supabase.rpc("add_credits", {
    p_user_id:     refRow.user_id,
    p_amount:      REFERRAL_BONUS_INVITER,
    p_plan_name:   "referral_bonus",
    p_payment_ref: `ref:${referralCode}:inviter`,
  });

  // Log the claim
  await supabase.from("referral_claims").insert({
    inviter_id:    refRow.user_id,
    invitee_id:    user.id,
    code:          referralCode.toUpperCase(),
    credits_given: REFERRAL_BONUS_INVITER + REFERRAL_BONUS_INVITEE,
  });

  // Update stats on referral row
  await supabase
    .from("referrals")
    .update({
      total_referrals:      supabase.rpc("total_referrals_inc", { p_user_id: refRow.user_id }),
      total_credits_earned: supabase.rpc("credits_earned_inc",  { p_user_id: refRow.user_id, p_amount: REFERRAL_BONUS_INVITER }),
    })
    .eq("user_id", refRow.user_id);

  const posthog = getPostHogClient();
  posthog.capture({
    distinctId: user.id,
    event: "referral_claimed",
    properties: {
      referral_code:       referralCode.toUpperCase(),
      invitee_credits:     REFERRAL_BONUS_INVITEE,
      inviter_credits:     REFERRAL_BONUS_INVITER,
      inviter_id:          refRow.user_id,
    },
  });

  return NextResponse.json({
    success:       true,
    creditsGiven:  REFERRAL_BONUS_INVITEE,
    message:       `+${REFERRAL_BONUS_INVITEE} credits added to your account!`,
  });
}
