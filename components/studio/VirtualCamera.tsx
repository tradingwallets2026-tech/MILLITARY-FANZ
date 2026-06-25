"use client";
import { useEffect, useRef } from "react";
import { captureCanvasStream, mergeStreams } from "@/lib/webrtc";
import styles from "./VirtualCamera.module.css";

interface VirtualCameraProps {
  outputCanvas: HTMLCanvasElement | null;
  audioStream: MediaStream | null;
  isActive: boolean;
  fps?: number;
  onStreamReady?: (stream: MediaStream) => void;
}

export default function VirtualCamera({
  outputCanvas,
  audioStream,
  isActive,
  fps = 30,
  onStreamReady,
}: VirtualCameraProps) {
  const previewRef = useRef<HTMLVideoElement>(null);
  const streamRef  = useRef<MediaStream | null>(null);

  useEffect(() => {
    if (!isActive || !outputCanvas) {
      streamRef.current = null;
      if (previewRef.current) previewRef.current.srcObject = null;
      return;
    }

    // Capture transformed canvas as video stream
    const videoStream = captureCanvasStream(outputCanvas, fps);

    // Merge with transformed audio
    const combined = mergeStreams(videoStream, audioStream);
    streamRef.current = combined;

    // Show mini-preview
    if (previewRef.current) {
      previewRef.current.srcObject = combined;
      previewRef.current.play().catch(() => {});
    }

    onStreamReady?.(combined);

    return () => {
      videoStream.getTracks().forEach((t) => t.stop());
    };
  }, [isActive, outputCanvas, audioStream, fps, onStreamReady]);

  if (!isActive) return null;

  return (
    <div className={styles.root}>
      <div className={styles.label}>
        <span className={styles.liveDot} />
        VIRTUAL CAMERA ACTIVE
      </div>
      <video
        ref={previewRef}
        className={styles.preview}
        muted
        playsInline
        autoPlay
      />
      <p className={styles.hint}>
        Select this stream as your webcam source in OBS / streaming platform
      </p>
    </div>
  );
}
