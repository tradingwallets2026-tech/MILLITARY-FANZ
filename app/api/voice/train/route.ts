import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/actions";
import { randomUUID } from "crypto";

const MODAL_VOICE_TRAIN_URL = process.env.MODAL_VOICE_TRAIN_URL ?? "";
const MODAL_AUTH_TOKEN      = process.env.MODAL_AUTH_TOKEN ?? "";

// ── POST /api/voice/train — Start training job ────────────────────
export async function POST(request: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await request.formData();
  const files    = formData.getAll("audio") as File[];
  const modelName= (formData.get("model_name") as string) ?? "My Voice";

  if (!files || files.length === 0) {
    return NextResponse.json({ error: "No audio files provided" }, { status: 400 });
  }
  if (files.length > 10) {
    return NextResponse.json({ error: "Maximum 10 audio files per training run" }, { status: 400 });
  }

  // Validate file sizes (max 50MB total)
  const totalBytes = files.reduce((s, f) => s + f.size, 0);
  if (totalBytes > 50 * 1024 * 1024) {
    return NextResponse.json({ error: "Total audio size exceeds 50MB limit" }, { status: 400 });
  }

  const supabase = await createClient();

  // Check user has enough credits (training costs 50 credits)
  const TRAINING_COST = 50;
  const { data: credits } = await supabase
    .from("credits")
    .select("balance")
    .eq("user_id", user.id)
    .single();

  if (!credits || credits.balance < TRAINING_COST) {
    return NextResponse.json({
      error:   "Insufficient credits",
      required: TRAINING_COST,
      balance:  credits?.balance ?? 0,
    }, { status: 402 });
  }

  const modelId = randomUUID();

  // Create voice_model record (status: training)
  const { data: model, error: dbErr } = await supabase
    .from("voice_models")
    .insert({
      id:       modelId,
      user_id:  user.id,
      name:     modelName,
      status:   "training",
      samples:  files.length,
    })
    .select()
    .single();

  if (dbErr) {
    return NextResponse.json({ error: dbErr.message }, { status: 500 });
  }

  // Deduct credits
  await supabase.rpc("deduct_credits", {
    p_user_id: user.id,
    p_amount:  TRAINING_COST,
    p_note:    `voice_training:${modelId}`,
  });

  // Convert files to base64 for Modal
  const audioSamples: string[] = [];
  for (const file of files) {
    const buf = await file.arrayBuffer();
    audioSamples.push(Buffer.from(buf).toString("base64"));
  }

  // Fire-and-forget training job (Modal handles async)
  if (MODAL_VOICE_TRAIN_URL) {
    fetch(MODAL_VOICE_TRAIN_URL, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({
        auth_token:    MODAL_AUTH_TOKEN,
        action:        "train",
        model_id:      modelId,
        audio_samples: audioSamples,
        sample_rate:   16000,
      }),
    })
      .then(async (res) => {
        const result = await res.json();
        // Update DB when training completes
        await supabase
          .from("voice_models")
          .update({
            status:    result.success ? "ready" : "failed",
            n_vectors: result.n_vectors,
            trained_at: new Date().toISOString(),
            meta:       result,
          })
          .eq("id", modelId);
      })
      .catch(async (err) => {
        await supabase
          .from("voice_models")
          .update({ status: "failed", meta: { error: err.message } })
          .eq("id", modelId);
      });
  } else {
    // Dev mode: simulate training delay
    setTimeout(async () => {
      await supabase
        .from("voice_models")
        .update({ status: "ready", n_vectors: 5000, trained_at: new Date().toISOString() })
        .eq("id", modelId);
    }, 10_000);
  }

  return NextResponse.json({
    model_id:     modelId,
    status:       "training",
    credits_used: TRAINING_COST,
    message:      "Training started! Check status in 5–10 minutes.",
  }, { status: 202 });
}

// ── GET /api/voice/train?model_id=xxx — Poll training status ──────
export async function GET(request: NextRequest) {
  const user    = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const modelId = request.nextUrl.searchParams.get("model_id");
  if (!modelId) return NextResponse.json({ error: "model_id required" }, { status: 400 });

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("voice_models")
    .select("*")
    .eq("id", modelId)
    .eq("user_id", user.id)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Model not found" }, { status: 404 });
  }

  return NextResponse.json(data);
}
