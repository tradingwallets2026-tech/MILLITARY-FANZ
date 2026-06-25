import { NextResponse } from "next/server";

interface WorkerStatus {
  name: string;
  url: string;
  status: "operational" | "degraded" | "offline" | "dev_mode";
  latency_ms?: number;
  details?: Record<string, unknown>;
}

/* ─── GET /api/ai/status ─────────────────────────────────── */
export async function GET() {
  const FACE_SWAP_API = process.env.MODAL_FACE_SWAP_URL ?? "";
  const VOICE_API     = process.env.MODAL_VOICE_URL     ?? "";
  const MODAL_TOKEN   = process.env.MODAL_AUTH_TOKEN    ?? "";

  const headers = { Authorization: `Bearer ${MODAL_TOKEN}` };

  async function checkWorker(name: string, url: string): Promise<WorkerStatus> {
    if (!url) return { name, url: "not_configured", status: "dev_mode" };

    const t0 = Date.now();
    try {
      const res     = await fetch(`${url}/health`, { headers, signal: AbortSignal.timeout(3000) });
      const latency = Date.now() - t0;
      if (res.ok) {
        const details = await res.json();
        return { name, url, status: "operational", latency_ms: latency, details };
      }
      return { name, url, status: "degraded", latency_ms: latency };
    } catch {
      return { name, url, status: "offline" };
    }
  }

  const [faceStatus, voiceStatus] = await Promise.all([
    checkWorker("face_swap", FACE_SWAP_API),
    checkWorker("voice",     VOICE_API),
  ]);

  const allOk       = [faceStatus, voiceStatus].every((w) => w.status !== "offline");
  const anyDevMode  = [faceStatus, voiceStatus].some((w)  => w.status === "dev_mode");
  const overallStatus = anyDevMode ? "dev_mode" : allOk ? "operational" : "degraded";

  return NextResponse.json({
    status:    overallStatus,
    timestamp: new Date().toISOString(),
    workers: {
      face_swap: faceStatus,
      voice:     voiceStatus,
    },
    platform: {
      nextjs:   process.env.npm_package_version ?? "unknown",
      node:     process.version,
    },
  });
}
