import { NextRequest, NextResponse } from "next/server";
import { getUser, getUserCredits } from "@/lib/actions";

/* ─── Config ──────────────────────────────────────────────── */
const VOICE_API   = process.env.MODAL_VOICE_URL    ?? "";
const MODAL_TOKEN = process.env.MODAL_AUTH_TOKEN   ?? "";
const TIMEOUT_MS  = 30_000;

const VALID_PRESETS = new Set(["commander", "ghost", "operative", "recon", "ranger"]);

/* ─── POST /api/ai/voice ──────────────────────────────────── */
export async function POST(request: NextRequest) {
  try {
    // Auth
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Credits
    const credits = await getUserCredits(user.id);
    if (!credits || credits.balance <= 0) {
      return NextResponse.json(
        { error: "Insufficient credits", code: "NO_CREDITS" },
        { status: 402 }
      );
    }

    const body = await request.json();
    const {
      audio_b64,
      preset         = "operative",
      pitch_override  = null,
      speed_override  = null,
    } = body;

    if (!audio_b64) {
      return NextResponse.json({ error: "Missing audio_b64" }, { status: 400 });
    }
    if (!VALID_PRESETS.has(preset)) {
      return NextResponse.json(
        { error: `Invalid preset. Choose from: ${[...VALID_PRESETS].join(", ")}` },
        { status: 400 }
      );
    }

    // Dev mode — echo audio back
    if (!VOICE_API) {
      return NextResponse.json({
        audio_b64,
        latency_ms: 8,
        preset,
        dev_mode:   true,
      });
    }

    const controller = new AbortController();
    const timeoutId  = setTimeout(() => controller.abort(), TIMEOUT_MS);

    const modalRes = await fetch(`${VOICE_API}/transform`, {
      method: "POST",
      headers: {
        "Content-Type":  "application/json",
        "Authorization": `Bearer ${MODAL_TOKEN}`,
      },
      body:   JSON.stringify({ audio_b64, preset, pitch_override, speed_override }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!modalRes.ok) {
      return NextResponse.json({ error: "Voice worker error" }, { status: 502 });
    }

    const result = await modalRes.json();
    return NextResponse.json(result);

  } catch (err: unknown) {
    if (err instanceof Error && err.name === "AbortError") {
      return NextResponse.json({ error: "Voice transform timed out" }, { status: 504 });
    }
    console.error("[voice]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/* ─── GET /api/ai/voice/presets ──────────────────────────── */
export async function GET() {
  if (!VOICE_API) {
    return NextResponse.json({
      status: "dev_mode",
      presets: {
        commander:  { pitch_shift: -3, speed_factor: 0.92 },
        ghost:      { pitch_shift: -1, speed_factor: 0.88 },
        operative:  { pitch_shift:  0, speed_factor: 1.00 },
        recon:      { pitch_shift:  2, speed_factor: 1.10 },
        ranger:     { pitch_shift: -5, speed_factor: 0.85 },
      },
    });
  }
  try {
    const res  = await fetch(`${VOICE_API}/presets`);
    const data = await res.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ status: "unreachable" }, { status: 503 });
  }
}
