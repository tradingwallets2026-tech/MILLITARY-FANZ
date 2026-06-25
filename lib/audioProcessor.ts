/**
 * Military Pass — Audio Processor
 * =================================
 * Manages real-time voice capture → AI voice transform → playback.
 *
 * Architecture:
 *   MediaStream → AudioContext → ScriptProcessor (3200 samples = 200ms @ 16kHz)
 *   → Float32Array → base64 → POST /api/ai/voice
 *   → Response base64 PCM → AudioContext.decodeAudioData → play
 *
 * Low-latency playback via a scheduled circular buffer:
 *   Each processed chunk is scheduled for playback at the exact
 *   time the previous chunk ends, preventing gaps and overlaps.
 */

export type VoicePreset = "commander" | "ghost" | "operative" | "recon" | "ranger" | "custom";

export type AudioStats = {
  chunksProcessed: number;
  avgLatencyMs: number;
  isCapturing: boolean;
  currentPreset: VoicePreset;
  bufferHealth: "good" | "strained" | "lagging";
};

export type AudioProcessorOptions = {
  sampleRate?: number;      // Default: 16000
  chunkMs?: number;         // Chunk size in ms (default: 200)
  onStats?: (stats: AudioStats) => void;
  onError?: (error: string) => void;
};

export class AudioProcessor {
  private ctx: AudioContext | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private scriptNode: ScriptProcessorNode | null = null;
  private outputStream: MediaStream | null = null;
  private outputDestination: MediaStreamAudioDestinationNode | null = null;

  private preset: VoicePreset = "operative";
  private voiceModelId: string | null = null;
  private sampleRate: number = 16000;
  private chunkMs: number = 200;
  private chunkSamples: number = 3200; // 16000 * 0.2

  private isCapturing: boolean = false;
  private nextPlayTime: number = 0;
  private chunksProcessed: number = 0;
  private latencies: number[] = [];

  private onStats?: (stats: AudioStats) => void;
  private onError?: (error: string) => void;

  constructor(opts: AudioProcessorOptions = {}) {
    this.sampleRate  = opts.sampleRate ?? 16000;
    this.chunkMs     = opts.chunkMs    ?? 200;
    this.chunkSamples = Math.floor(this.sampleRate * this.chunkMs / 1000);
    this.onStats     = opts.onStats;
    this.onError     = opts.onError;
  }

  /** Start capturing and transforming audio from the given stream */
  async startCapture(stream: MediaStream, preset: VoicePreset = "operative") {
    if (this.isCapturing) await this.stopCapture();

    this.preset = preset;

    // Create AudioContext at target sample rate
    this.ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)({
      sampleRate: this.sampleRate,
      latencyHint: "interactive",
    });

    // Output destination for virtual camera audio track
    this.outputDestination = this.ctx.createMediaStreamDestination();
    this.outputStream = this.outputDestination.stream;

    // Source from camera mic
    const audioTrack = stream.getAudioTracks()[0];
    if (!audioTrack) {
      this.onError?.("No audio track in stream");
      return;
    }

    const micStream = new MediaStream([audioTrack]);
    this.sourceNode = this.ctx.createMediaStreamSource(micStream);

    // ScriptProcessor for chunk extraction
    // Buffer size = chunk samples (200ms at 16kHz = 3200 samples)
    this.scriptNode = this.ctx.createScriptProcessor(
      this.chunkSamples,
      1, // mono input
      1  // mono output
    );

    this.nextPlayTime = this.ctx.currentTime;
    this.isCapturing  = true;

    this.scriptNode.onaudioprocess = (event) => {
      if (!this.isCapturing) return;

      // Extract PCM Float32 from input buffer — cast to ArrayBuffer for strict TS
      const inputData = event.inputBuffer.getChannelData(0);
      const pcmChunk  = new Float32Array(inputData.buffer as ArrayBuffer);

      // Convert to base64
      const b64 = this._float32ToBase64(pcmChunk);

      // Send for transformation (async, fire-and-forget with scheduling)
      this._transformAndPlay(b64);
    };

    this.sourceNode.connect(this.scriptNode);
    this.scriptNode.connect(this.outputDestination);

    await this.ctx.resume();
  }

  /** Stop capturing and release all resources */
  async stopCapture() {
    this.isCapturing = false;

    this.scriptNode?.disconnect();
    this.sourceNode?.disconnect();
    this.scriptNode = null;
    this.sourceNode = null;

    if (this.ctx && this.ctx.state !== "closed") {
      await this.ctx.close();
    }
    this.ctx = null;
    this.outputStream = null;
  }

  /** Switch voice preset mid-session */
  setPreset(preset: VoicePreset) {
    this.preset = preset;
  }

  /** Set custom trained voice model ID */
  setVoiceModel(modelId: string | null) {
    this.voiceModelId = modelId;
  }

  /** Get the transformed audio output stream (for VirtualCamera) */
  getOutputStream(): MediaStream | null {
    return this.outputStream;
  }

  /** Return current audio stats */
  getStats(): AudioStats {
    const avg = this.latencies.length > 0
      ? this.latencies.reduce((a, b) => a + b, 0) / this.latencies.length
      : 0;

    const health: AudioStats["bufferHealth"] =
      avg < 150  ? "good"     :
      avg < 250  ? "strained" : "lagging";

    return {
      chunksProcessed: this.chunksProcessed,
      avgLatencyMs:    Math.round(avg),
      isCapturing:     this.isCapturing,
      currentPreset:   this.preset,
      bufferHealth:    health,
    };
  }

  // ─── Private ──────────────────────────────────────────────────────

  private async _transformAndPlay(audioB64: string) {
    if (!this.ctx || !this.isCapturing) return;

    const t0 = performance.now();

    try {
      const res = await fetch("/api/ai/voice", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          audio_b64: audioB64,
          preset:    this.preset === "custom" ? "operative" : this.preset,
          model_id:  this.preset === "custom" ? this.voiceModelId : null,
        }),
      });

      if (!res.ok) {
        if (res.status === 402) this.onError?.("NO_CREDITS");
        return;
      }

      const data = await res.json();
      if (!data.audio_b64 || !this.ctx) return;

      // Decode base64 PCM back to Float32Array
      const pcm = this._base64ToFloat32(data.audio_b64);

      // Create AudioBuffer from PCM data
      const buffer = this.ctx.createBuffer(1, pcm.length, this.sampleRate);
      buffer.copyToChannel(pcm, 0);

      // Schedule playback using precise timing to avoid gaps
      const source = this.ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(this.outputDestination!);

      const now = this.ctx.currentTime;
      if (this.nextPlayTime < now) {
        // If we've fallen behind, catch up immediately
        this.nextPlayTime = now + 0.02; // 20ms ahead
      }
      source.start(this.nextPlayTime);
      this.nextPlayTime += buffer.duration;

      const latency = performance.now() - t0;
      this.latencies.push(latency);
      if (this.latencies.length > 20) this.latencies.shift();
      this.chunksProcessed++;

      // Emit stats every 5 chunks
      if (this.chunksProcessed % 5 === 0) {
        this.onStats?.(this.getStats());
      }

    } catch {
      // Silently drop chunk on network error
    }
  }

  private _float32ToBase64(float32: Float32Array): string {
    const bytes  = new Uint8Array(float32.buffer);
    let binary   = "";
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  private _base64ToFloat32(b64: string): Float32Array<ArrayBuffer> {
    const binary  = atob(b64);
    const bytes   = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    // .slice(0) produces a concrete ArrayBuffer (not SharedArrayBuffer)
    // required by AudioBuffer.copyToChannel() in strict TypeScript
    return new Float32Array(bytes.buffer.slice(0) as ArrayBuffer);
  }
}
