"use client";
import { useRef, useEffect, useState } from "react";
import { AudioProcessor, VoicePreset, AudioStats } from "@/lib/audioProcessor";
import styles from "./AudioProcessor.module.css";

interface AudioProcessorComponentProps {
  stream:               MediaStream | null;
  preset:               VoicePreset;
  voiceModelId?:        string | null;
  isActive:             boolean;
  onOutputStreamReady?: (stream: MediaStream) => void;
  onStatsUpdate?:       (stats: AudioStats) => void;
  onError?:             (error: string) => void;
}

export default function AudioProcessorComponent({
  stream,
  preset,
  voiceModelId = null,
  isActive,
  onOutputStreamReady,
  onStatsUpdate,
  onError,
}: AudioProcessorComponentProps) {
  const processorRef = useRef<AudioProcessor | null>(null);
  const [stats, setStats] = useState<AudioStats>({
    chunksProcessed: 0,
    avgLatencyMs: 0,
    isCapturing: false,
    currentPreset: "operative",
    bufferHealth: "good",
  });

  // ─── Init processor ────────────────────────────────────────────
  useEffect(() => {
    processorRef.current = new AudioProcessor({
      sampleRate: 16000,
      chunkMs: 200,
      onStats: (s) => { setStats(s); onStatsUpdate?.(s); },
      onError: (e) => { onError?.(e); },
    });

    return () => {
      processorRef.current?.stopCapture();
    };
  }, [onStatsUpdate, onError]);

  // ─── Start/stop when isActive or stream changes ──────────────
  useEffect(() => {
    const proc = processorRef.current;
    if (!proc) return;

    if (isActive && stream) {
      proc.startCapture(stream, preset).then(() => {
        const outStream = proc.getOutputStream();
        if (outStream) onOutputStreamReady?.(outStream);
      });
    } else {
      proc.stopCapture();
    }
  }, [isActive, stream]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Update preset mid-session ────────────────────────────────
  useEffect(() => {
    processorRef.current?.setPreset(preset);
  }, [preset]);

  // ─── Update custom voice model mid-session ────────────────────
  useEffect(() => {
    processorRef.current?.setVoiceModel(voiceModelId ?? null);
  }, [voiceModelId]);


  const healthColor =
    stats.bufferHealth === "good"     ? "var(--accent-green)"  :
    stats.bufferHealth === "strained" ? "var(--accent-amber)"  :
                                        "var(--accent-red)";

  if (!isActive) return null;

  return (
    <div className={styles.root}>
      {/* Waveform bars */}
      <div className={styles.waveform}>
        {Array.from({ length: 12 }).map((_, i) => (
          <div
            key={i}
            className={styles.bar}
            style={{
              animationDelay: `${i * 0.08}s`,
              animationDuration: `${0.4 + (i % 5) * 0.1}s`,
            }}
          />
        ))}
      </div>

      {/* Stats */}
      <div className={styles.stats}>
        <span style={{ color: healthColor }}>●</span>
        <span>{stats.avgLatencyMs}ms</span>
        <span className={styles.div}>|</span>
        <span>{stats.chunksProcessed} chunks</span>
        <span className={styles.div}>|</span>
        <span style={{ color: "var(--accent-cyan)", textTransform: "uppercase" }}>
          {preset}
        </span>
      </div>
    </div>
  );
}
