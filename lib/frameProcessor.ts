/**
 * Military Pass — Frame Processor
 * =================================
 * Manages the real-time video frame capture → AI face swap → canvas render loop.
 *
 * Architecture:
 *   30fps rAF loop → capture JPEG from source canvas
 *   → POST /api/ai/face-swap (async, non-blocking)
 *   → On response: draw to output canvas
 *
 * Frame dropping: if the API is slower than 30fps, older
 * in-flight requests are cancelled and newer frames take priority.
 * This maintains low latency at the cost of some frames.
 *
 * Quality modes:
 *   fast     — swap only, ~30ms latency
 *   balanced — swap + skin alignment + GFPGAN (default), ~80ms
 *   ultra    — full pipeline + Poisson blend, ~160ms
 */

export type FrameStats = {
  fps:           number;
  avgLatencyMs:  number;
  frameCount:    number;
  droppedFrames: number;
  isProcessing:  boolean;
};

export type QualityMode = "fast" | "balanced" | "ultra";

export type FrameProcessorOptions = {
  jpegQuality?:   number;        // JPEG quality 0.0–1.0 (default 0.8)
  maxConcurrent?: number;        // Max in-flight requests (default 2)
  targetFps?:     number;        // Target FPS (default 30)
  quality?:       QualityMode;   // AI quality mode (default "balanced")
  alignSkin?:     boolean;       // Skin tone histogram matching (default true)
  enhance?:       boolean;       // GFPGAN face restoration (default true)
  onStats?:       (stats: FrameStats) => void;
  onError?:       (error: string) => void;
};

export class FrameProcessor {
  private sourceCanvas: HTMLCanvasElement | null = null;
  private outputCanvas: HTMLCanvasElement | null = null;
  private avatarEmbedding: number[] | null = null;

  private jpegQuality:   number      = 0.8;
  private targetFps:     number      = 30;
  private maxConcurrent: number      = 2;
  private quality:       QualityMode = "balanced";
  private alignSkin:     boolean     = true;
  private enhance:       boolean     = true;

  private rafHandle:     number | null = null;
  private lastFrameTime: number        = 0;
  private inFlight:      number        = 0;

  // Stats tracking
  private frameCount:   number   = 0;
  private droppedFrames:number   = 0;
  private latencies:    number[] = [];
  private fpsCounter:   number   = 0;
  private fpsTimer:     number   = 0;
  private currentFps:   number   = 0;

  private onStats?: (stats: FrameStats) => void;
  private onError?: (error: string) => void;
  private isRunning: boolean = false;

  constructor(opts: FrameProcessorOptions = {}) {
    this.jpegQuality   = opts.jpegQuality   ?? 0.8;
    this.maxConcurrent = opts.maxConcurrent ?? 2;
    this.targetFps     = opts.targetFps     ?? 30;
    this.quality       = opts.quality       ?? "balanced";
    this.alignSkin     = opts.alignSkin     ?? true;
    this.enhance       = opts.enhance       ?? true;
    this.onStats       = opts.onStats;
    this.onError       = opts.onError;
  }

  /** Attach source and output canvases */
  init(source: HTMLCanvasElement, output: HTMLCanvasElement) {
    this.sourceCanvas = source;
    this.outputCanvas = output;
  }

  /** Set the 512-dim face embedding from the selected avatar */
  setAvatarEmbedding(embedding: number[]) {
    if (embedding.length !== 512) {
      this.onError?.("Avatar embedding must be 512 dimensions");
      return;
    }
    this.avatarEmbedding = embedding;
  }

  /** Update AI quality mode at runtime */
  setQualityMode(quality: QualityMode) {
    this.quality = quality;
    // Adjust JPEG quality to match: lower quality = faster JPEG too
    this.jpegQuality = quality === "fast" ? 0.7 : quality === "balanced" ? 0.82 : 0.92;
  }

  /** Toggle skin tone alignment */
  setAlignSkin(enabled: boolean) { this.alignSkin = enabled; }

  /** Toggle GFPGAN face enhancement */
  setEnhance(enabled: boolean) { this.enhance = enabled; }

  /** Adjust JPEG compression quality directly (0.4–1.0) */
  setJpegQuality(quality: number) {
    this.jpegQuality = Math.max(0.4, Math.min(1.0, quality));
  }

  /** Start the frame processing loop */
  start() {
    if (this.isRunning) return;
    this.isRunning    = true;
    this.fpsTimer     = performance.now();
    this.rafHandle    = requestAnimationFrame(this._loop.bind(this));
  }

  /** Stop the frame processing loop */
  stop() {
    this.isRunning = false;
    if (this.rafHandle !== null) {
      cancelAnimationFrame(this.rafHandle);
      this.rafHandle = null;
    }
    this.inFlight      = 0;
    this.frameCount    = 0;
    this.droppedFrames = 0;
    this.latencies     = [];
  }

  /** Return current performance stats */
  getStats(): FrameStats {
    const avg = this.latencies.length > 0
      ? this.latencies.reduce((a, b) => a + b, 0) / this.latencies.length
      : 0;
    return {
      fps:           this.currentFps,
      avgLatencyMs:  Math.round(avg),
      frameCount:    this.frameCount,
      droppedFrames: this.droppedFrames,
      isProcessing:  this.isRunning,
    };
  }

  // ─── Private ─────────────────────────────────────────────────────

  private _loop(now: number) {
    if (!this.isRunning) return;
    this.rafHandle = requestAnimationFrame(this._loop.bind(this));

    const interval = 1000 / this.targetFps;
    if (now - this.lastFrameTime < interval) return;
    this.lastFrameTime = now;

    // FPS tracking
    this.fpsCounter++;
    if (now - this.fpsTimer >= 1000) {
      this.currentFps = this.fpsCounter;
      this.fpsCounter = 0;
      this.fpsTimer   = now;
      this.onStats?.(this.getStats());
    }

    if (!this.sourceCanvas || !this.outputCanvas || !this.avatarEmbedding) return;

    // Drop frame if too many in-flight
    if (this.inFlight >= this.maxConcurrent) {
      this.droppedFrames++;
      return;
    }

    this._captureAndProcess();
  }

  private async _captureAndProcess() {
    if (!this.sourceCanvas || !this.outputCanvas || !this.avatarEmbedding) return;

    const frameB64 = this.sourceCanvas
      .toDataURL("image/jpeg", this.jpegQuality)
      .replace(/^data:image\/jpeg;base64,/, "");

    this.inFlight++;
    const t0 = performance.now();

    try {
      const res = await fetch("/api/ai/face-swap", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          frame_b64:        frameB64,
          avatar_embedding: this.avatarEmbedding,
          quality:          this.quality,
          align_skin:       this.alignSkin,
          enhance:          this.enhance,
        }),
      });

      if (!res.ok) {
        if (res.status === 402) this.onError?.("NO_CREDITS");
        else if (res.status !== 504) {
          // 504 timeout — just drop frame silently
          const body = await res.json().catch(() => ({}));
          console.warn("[FrameProcessor] API error:", res.status, body.error);
        }
        return;
      }

      const data = await res.json();
      const resultKey = data.result_b64 ?? data.frame_b64;
      if (resultKey) {
        this._drawFrame(resultKey);
        const latency = performance.now() - t0;
        this.latencies.push(latency);
        if (this.latencies.length > 60) this.latencies.shift();
        this.frameCount++;
      }

    } catch (err) {
      // Network error — silently drop frame
      console.warn("[FrameProcessor] Network error:", err);
    } finally {
      this.inFlight--;
    }
  }

  private _drawFrame(b64: string) {
    if (!this.outputCanvas) return;
    const ctx = this.outputCanvas.getContext("2d");
    if (!ctx) return;

    const img = new Image();
    img.onload = () => {
      ctx.drawImage(img, 0, 0, this.outputCanvas!.width, this.outputCanvas!.height);
    };
    img.src = `data:image/jpeg;base64,${b64}`;
  }
}
