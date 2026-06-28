import { NextRequest, NextResponse } from "next/server";
import { getUser, getUserCredits } from "@/lib/actions";

/* ─── Config ─────────────────────────────────────────────────── */
const FACE_SWAP_API   = process.env.MODAL_FACE_SWAP_URL ?? "";
const MODAL_TOKEN     = process.env.MODAL_AUTH_TOKEN    ?? "";
const MAX_FRAME_BYTES = 512 * 1024;   // 512KB max per frame
const TIMEOUT_MS      = 60_000;       // 60s timeout (for cold starts)

export type QualityMode = "fast" | "balanced" | "ultra";

/* ─── POST /api/ai/face-swap ──────────────────────────────────── */
export async function POST(request: NextRequest) {
  try {
    // 1. Auth
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Credit gate
    const credits = await getUserCredits(user.id);
    if (!credits || credits.balance <= 0) {
      return NextResponse.json(
        { error: "Insufficient credits", code: "NO_CREDITS" },
        { status: 402 }
      );
    }

    // 3. Parse body
    const body = await request.json();
    const {
      frame_b64,
      avatar_embedding,
      enhance    = true,
      align_skin = true,
      quality    = "balanced" as QualityMode,
    } = body;

    if (!frame_b64) {
      return NextResponse.json({ error: "Missing frame_b64" }, { status: 400 });
    }
    if (!avatar_embedding || !Array.isArray(avatar_embedding)) {
      return NextResponse.json({ error: "Missing avatar_embedding" }, { status: 400 });
    }
    if (avatar_embedding.length !== 512) {
      return NextResponse.json(
        { error: "avatar_embedding must be exactly 512 dimensions" },
        { status: 400 }
      );
    }
    if (!["fast", "balanced", "ultra"].includes(quality)) {
      return NextResponse.json(
        { error: "quality must be fast | balanced | ultra" },
        { status: 400 }
      );
    }

    // 4. Frame size guard
    const frameSizeBytes = Buffer.byteLength(frame_b64, "base64");
    if (frameSizeBytes > MAX_FRAME_BYTES) {
      return NextResponse.json(
        { error: `Frame too large: ${(frameSizeBytes / 1024).toFixed(1)}KB. Max: 512KB` },
        { status: 413 }
      );
    }

    // 5. Dev mode passthrough
    if (!FACE_SWAP_API) {
      return NextResponse.json({
        result_b64:    frame_b64,
        latency_ms:    15,
        faces_detected: 1,
        dev_mode:      true,
        quality,
        align_skin,
        enhance,
      });
    }

    // 6. Forward to Modal with all quality parameters
    const controller = new AbortController();
    const timeoutId  = setTimeout(() => controller.abort(), TIMEOUT_MS);

    const modalRes = await fetch(FACE_SWAP_API, {
      method:  "POST",
      headers: {
        "Content-Type":  "application/json",
        "Authorization": `Bearer ${MODAL_TOKEN}`,
      },
      body: JSON.stringify({
        auth_token:       MODAL_TOKEN,
        action:           "swap",
        frame_b64,
        avatar_embedding,
        enhance,
        align_skin,
        quality,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!modalRes.ok) {
      const errText = await modalRes.text();
      console.error("[face-swap] Modal error:", errText);
      return NextResponse.json(
        { error: "AI worker error", details: errText },
        { status: 502 }
      );
    }

    const result = await modalRes.json();
    return NextResponse.json({ ...result, quality, align_skin });

  } catch (err: unknown) {
    if (err instanceof Error && err.name === "AbortError") {
      return NextResponse.json({ error: "Face swap timed out" }, { status: 504 });
    }
    console.error("[face-swap]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/* ─── GET /api/ai/face-swap — health ─────────────────────────── */
export async function GET() {
  if (!FACE_SWAP_API) {
    return NextResponse.json({ status: "dev_mode", worker: "not_configured" });
  }
  try {
    const res  = await fetch(FACE_SWAP_API, {
      method:  "POST",
      headers: {
        "Content-Type":  "application/json",
        "Authorization": `Bearer ${MODAL_TOKEN}`,
      },
      body:    JSON.stringify({ auth_token: MODAL_TOKEN, action: "health" }),
      signal:  AbortSignal.timeout(5000),
    });
    const data = await res.json();
    return NextResponse.json({ status: "operational", ...data });
  } catch {
    return NextResponse.json({ status: "unreachable" }, { status: 503 });
  }
}
