"use client";
import { useRef, useEffect, useCallback, useState } from "react";
import { FrameProcessor, FrameStats, QualityMode } from "@/lib/frameProcessor";
import styles from "./CameraFeed.module.css";

interface CameraFeedProps {
  avatarEmbedding: number[] | null;
  isProcessing:    boolean;
  resolution:      "480p" | "720p" | "1080p";
  quality?:        QualityMode;
  alignSkin?:      boolean;
  enhance?:        boolean;
  onOutputReady?:  (canvas: HTMLCanvasElement) => void;
  onStreamReady?:  (stream: MediaStream) => void;
  onStatsUpdate?:  (stats: FrameStats) => void;
  onError?:        (error: string) => void;
}

const RESOLUTIONS = {
  "480p":  { width: 854,  height: 480  },
  "720p":  { width: 1280, height: 720  },
  "1080p": { width: 1920, height: 1080 },
};

export default function CameraFeed({
  avatarEmbedding,
  isProcessing,
  resolution  = "720p",
  quality     = "balanced",
  alignSkin   = true,
  enhance     = true,
  onOutputReady,
  onStreamReady,
  onStatsUpdate,
  onError,
}: CameraFeedProps) {
  const sourceVideoRef  = useRef<HTMLVideoElement>(null);
  const sourceCanvasRef = useRef<HTMLCanvasElement>(null);
  const outputCanvasRef = useRef<HTMLCanvasElement>(null);
  const processorRef    = useRef<FrameProcessor | null>(null);
  const streamRef       = useRef<MediaStream | null>(null);
  const drawIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [camError, setCamError] = useState<string | null>(null);
  const [stats,    setStats]    = useState<FrameStats>({
    fps: 0, avgLatencyMs: 0, frameCount: 0, droppedFrames: 0, isProcessing: false,
  });

  const res = RESOLUTIONS[resolution];

  // ─── Start camera ─────────────────────────────────────────────────
  const startCamera = useCallback(async () => {
    try {
      setCamError(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width:      { ideal: res.width  },
          height:     { ideal: res.height },
          frameRate:  { ideal: 30 },
          facingMode: "user",
        },
        audio: true,
      });

      streamRef.current = stream;

      if (sourceVideoRef.current) {
        sourceVideoRef.current.srcObject = stream;
        await sourceVideoRef.current.play();
      }

      // Notify parent of stream (for AudioProcessor)
      onStreamReady?.(stream);

      // Draw video → source canvas at 30fps
      drawIntervalRef.current = setInterval(() => {
        const video  = sourceVideoRef.current;
        const canvas = sourceCanvasRef.current;
        if (!video || !canvas || video.readyState < 2) return;
        const ctx = canvas.getContext("2d");
        if (ctx) ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      }, 33);

      // Notify parent that output canvas is ready
      if (outputCanvasRef.current) onOutputReady?.(outputCanvasRef.current);

    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Camera access denied";
      setCamError(msg);
      onError?.(msg);
    }
  }, [res, onOutputReady, onStreamReady, onError]);

  // ─── Setup frame processor ────────────────────────────────────────
  useEffect(() => {
    processorRef.current = new FrameProcessor({
      jpegQuality:   0.82,
      maxConcurrent: 2,
      targetFps:     30,
      quality,
      alignSkin,
      enhance,
      onStats: (s) => { setStats(s); onStatsUpdate?.(s); },
      onError: (e) => { onError?.(e); },
    });

    const source = sourceCanvasRef.current;
    const output = outputCanvasRef.current;
    if (source && output) {
      processorRef.current.init(source, output);
    }

    startCamera();

    return () => {
      processorRef.current?.stop();
      streamRef.current?.getTracks().forEach((t) => t.stop());
      if (drawIntervalRef.current) clearInterval(drawIntervalRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // intentionally run once on mount

  // ─── Sync quality/skin/enhance changes at runtime ─────────────────
  useEffect(() => {
    if (!processorRef.current) return;
    processorRef.current.setQualityMode(quality);
    processorRef.current.setAlignSkin(alignSkin);
    processorRef.current.setEnhance(enhance);
  }, [quality, alignSkin, enhance]);

  // ─── Update avatar embedding ──────────────────────────────────────
  useEffect(() => {
    if (avatarEmbedding && processorRef.current) {
      processorRef.current.setAvatarEmbedding(avatarEmbedding);
    }
  }, [avatarEmbedding]);

  // ─── Start/stop processing loop ───────────────────────────────────
  useEffect(() => {
    if (!processorRef.current) return;
    if (isProcessing && avatarEmbedding) {
      processorRef.current.setAvatarEmbedding(avatarEmbedding);
      processorRef.current.start();
    } else {
      processorRef.current.stop();
      // Mirror source to output when paused/stopped
      const source = sourceCanvasRef.current;
      const output = outputCanvasRef.current;
      if (source && output) {
        const ctx = output.getContext("2d");
        ctx?.drawImage(source, 0, 0, output.width, output.height);
      }
    }
  }, [isProcessing, avatarEmbedding]);

  return (
    <div className={styles.root}>
      {/* Source panel */}
      <div className={styles.panel}>
        <div className={styles.panelLabel}>
          <span className={styles.dot} />
          SOURCE FEED
        </div>
        <div className={styles.canvasWrap}>
          {camError ? (
            <div className={styles.camError}>
              <span style={{ fontSize: "2rem" }}>📷</span>
              <p>{camError}</p>
              <button className="btn btn-ghost" onClick={startCamera}>Retry</button>
            </div>
          ) : (
            <>
              <video ref={sourceVideoRef} className={styles.hiddenVideo} muted playsInline />
              <canvas
                ref={sourceCanvasRef}
                width={res.width} height={res.height}
                className={styles.canvas}
              />
            </>
          )}
        </div>
      </div>

      {/* Output panel */}
      <div className={styles.panel}>
        <div className={styles.panelLabel}>
          {isProcessing ? (
            <><span className={`${styles.dot} ${styles.dotLive}`} />AI OUTPUT — LIVE</>
          ) : (
            <><span className={styles.dot} />AI OUTPUT — STANDBY</>
          )}
        </div>
        <div className={styles.canvasWrap}>
          <canvas
            ref={outputCanvasRef}
            width={res.width} height={res.height}
            className={styles.canvas}
          />
          {!isProcessing && (
            <div className={styles.standbyOverlay}>
              <span style={{ fontSize: "2.5rem" }}>🎖️</span>
              <p>Select avatar + press START</p>
            </div>
          )}
        </div>
      </div>

      {/* Stats HUD */}
      {isProcessing && (
        <div className={styles.statsHUD}>
          <span>{stats.fps} FPS</span>
          <span className={styles.statsDivider}>|</span>
          <span>{stats.avgLatencyMs}ms</span>
          <span className={styles.statsDivider}>|</span>
          <span>{stats.frameCount.toLocaleString()} frames</span>
          {stats.droppedFrames > 0 && (
            <><span className={styles.statsDivider}>|</span>
            <span style={{ color: "var(--accent-amber)" }}>↓{stats.droppedFrames} dropped</span></>
          )}
          <span className={styles.statsDivider}>|</span>
          <span style={{ color: "var(--accent-purple)", textTransform: "uppercase" }}>{quality}</span>
        </div>
      )}
    </div>
  );
}
