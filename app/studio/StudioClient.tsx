"use client";
import { useState, useCallback, useRef } from "react";
import posthog from "posthog-js";
import CameraFeed              from "@/components/studio/CameraFeed";
import AudioProcessorComponent from "@/components/studio/AudioProcessorComponent";
import StudioControls          from "@/components/studio/StudioControls";
import CreditMeter             from "@/components/studio/CreditMeter";
import VirtualCamera           from "@/components/studio/VirtualCamera";
import type { VoicePreset }    from "@/lib/audioProcessor";
import type { FrameStats }     from "@/lib/frameProcessor";
import styles                  from "./studio.module.css";

interface Avatar {
  id: string; name: string;
  image_url: string; embedding?: number[] | null;
}

interface StudioClientProps {
  avatars:        Avatar[];
  initialBalance: number;
  userId:         string;
}

export default function StudioClient({ avatars, initialBalance, userId }: StudioClientProps) {
  /* ── Core state ─────────────────────────────────────────────── */
  const [selectedAvatar,    setSelectedAvatar]    = useState<Avatar | null>(null);
  const [selectedVoice,     setSelectedVoice]     = useState<VoicePreset | "custom">("operative");
  const [voiceModelId,      setVoiceModelId]      = useState<string | null>(null);
  const [resolution,        setResolution]        = useState<"480p" | "720p" | "1080p">("720p");

  /* ── AI quality controls ─────────────────────────────────────── */
  const [quality,           setQuality]           = useState<"fast" | "balanced" | "ultra">("balanced");
  const [alignSkin,         setAlignSkin]         = useState(true);
  const [enhance,           setEnhance]           = useState(true);

  /* ── Session state ───────────────────────────────────────────── */
  const [isRunning,         setIsRunning]         = useState(false);
  const [isPaused,          setIsPaused]          = useState(false);
  const [creditsLeft,       setCreditsLeft]       = useState(initialBalance);
  const [creditsExhausted,  setCreditsExhausted]  = useState(initialBalance <= 0);
  const [sessionId,         setSessionId]         = useState<string | null>(null);

  /* ── Media state ─────────────────────────────────────────────── */
  const [outputCanvas,      setOutputCanvas]      = useState<HTMLCanvasElement | null>(null);
  const [mediaStream,       setMediaStream]       = useState<MediaStream | null>(null);
  const [audioOutStream,    setAudioOutStream]    = useState<MediaStream | null>(null);
  const [frameStats,        setFrameStats]        = useState<FrameStats | null>(null);
  const [studioError,       setStudioError]       = useState<string | null>(null);

  const sessionStartRef = useRef<number>(0);
  const frameCountRef   = useRef<number>(0);

  /* ── Handlers ────────────────────────────────────────────────── */

  const handleStart = useCallback(async () => {
    if (!selectedAvatar) return;
    setStudioError(null);

    try {
      const res  = await fetch("/api/sessions", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          avatarId:       selectedAvatar.id,
          voiceProfileId: voiceModelId,
        }),
      });
      const data = await res.json();
      if (data.session) setSessionId(data.session.id);
    } catch { /* non-blocking */ }

    sessionStartRef.current = Date.now();
    setIsRunning(true);
    setIsPaused(false);
    posthog.capture("studio_session_started", {
      avatar_id:   selectedAvatar.id,
      avatar_name: selectedAvatar.name,
      voice_preset: selectedVoice,
      resolution,
      quality,
      user_id: userId,
    });
  }, [selectedAvatar, voiceModelId, selectedVoice, resolution, quality, userId]);

  const handlePause = useCallback(() => {
    setIsPaused((p) => !p);
  }, []);

  const handleStop = useCallback(async () => {
    setIsRunning(false);
    setIsPaused(false);

    if (sessionId) {
      const duration    = Math.floor((Date.now() - sessionStartRef.current) / 1000);
      const creditsUsed = initialBalance - creditsLeft;

      await fetch("/api/sessions", {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          sessionId,
          stats: {
            duration_seconds: duration,
            credits_used:     creditsUsed,
            frames_processed: frameCountRef.current,
            avg_latency_ms:   frameStats?.avgLatencyMs ?? 0,
          },
        }),
      }).catch(() => {});

      posthog.capture("studio_session_ended", {
        duration_seconds:  duration,
        credits_used:      creditsUsed,
        frames_processed:  frameCountRef.current,
        avg_latency_ms:    frameStats?.avgLatencyMs ?? 0,
        resolution,
        quality,
        user_id: userId,
      });

      setSessionId(null);
    }
  }, [sessionId, creditsLeft, initialBalance, frameStats, resolution, quality, userId]);

  const handleExhausted = useCallback(() => {
    setCreditsExhausted(true);
    setIsRunning(false);
    posthog.capture("credits_exhausted", { user_id: userId });
  }, [userId]);

  const handleError = useCallback((err: string) => {
    if (err === "NO_CREDITS") {
      handleExhausted();
    } else {
      setStudioError(err);
    }
  }, [handleExhausted]);

  const handleStatsUpdate = useCallback((stats: FrameStats) => {
    setFrameStats(stats);
    frameCountRef.current = stats.frameCount;
  }, []);

  const handleAvatarSelect = useCallback((avatar: Avatar | null) => {
    setSelectedAvatar(avatar);
    if (avatar) {
      posthog.capture("avatar_selected", { avatar_id: avatar.id, avatar_name: avatar.name, user_id: userId });
    }
  }, [userId]);

  const isProcessing = isRunning && !isPaused && !!selectedAvatar?.embedding;

  /* ── Render ──────────────────────────────────────────────────── */
  return (
    <div className={styles.studioRoot}>
      {/* Top bar */}
      <div className={styles.topBar}>
        <div className={styles.topLeft}>
          <a href="/dashboard" className={styles.backBtn}>← Dashboard</a>
          <div className={styles.studioTitle}>
            <span className={styles.titleIcon}>🎬</span>
            <span>OPERATOR STUDIO</span>
            {isRunning && <span className={styles.livePill}>● LIVE</span>}
          </div>
        </div>

        {/* Quality mode indicator */}
        <div className={styles.qualityIndicator}>
          <span className={styles.qualityDot} data-quality={quality} />
          <span className={styles.qualityLabel}>{quality.toUpperCase()}</span>
        </div>

        {/* Audio processor status bar */}
        <AudioProcessorComponent
          stream={mediaStream}
          preset={selectedVoice === "custom" ? "operative" : selectedVoice}
          voiceModelId={voiceModelId}
          isActive={isProcessing}
          onOutputStreamReady={setAudioOutStream}
          onError={handleError}
        />
      </div>

      {/* Main layout */}
      <div className={styles.mainLayout}>
        {/* Camera feeds (left, large) */}
        <div className={styles.feedArea}>
          {studioError && studioError !== "NO_CREDITS" && (
            <div className={styles.errorBanner}>
              ⚠️ {studioError}
              <button onClick={() => setStudioError(null)} className={styles.errorClose}>×</button>
            </div>
          )}

          <CameraFeed
            avatarEmbedding={selectedAvatar?.embedding ?? null}
            isProcessing={isProcessing}
            resolution={resolution}
            quality={quality}
            alignSkin={alignSkin}
            enhance={enhance}
            onOutputReady={setOutputCanvas}
            onStreamReady={setMediaStream}
            onStatsUpdate={handleStatsUpdate}
            onError={handleError}
          />

          {/* Virtual camera output */}
          <VirtualCamera
            outputCanvas={outputCanvas}
            audioStream={audioOutStream}
            isActive={isRunning}
            fps={30}
          />
        </div>

        {/* Right sidebar */}
        <div className={styles.sidebar}>
          <CreditMeter
            initialBalance={initialBalance}
            isRunning={isRunning && !isPaused}
            sessionId={sessionId}
            onCreditDeducted={setCreditsLeft}
            onExhausted={handleExhausted}
          />

          <div className={styles.controlsWrap}>
            <StudioControls
              avatars={avatars}
              selectedAvatarId={selectedAvatar?.id ?? null}
              selectedVoice={selectedVoice}
              resolution={resolution}
              quality={quality}
              alignSkin={alignSkin}
              enhance={enhance}
              isRunning={isRunning}
              isPaused={isPaused}
              creditsExhausted={creditsExhausted}
              onAvatarSelect={handleAvatarSelect}
              onVoiceSelect={setSelectedVoice}
              onVoiceModelSelect={setVoiceModelId}
              onResolutionChange={setResolution}
              onQualityChange={setQuality}
              onAlignSkinToggle={setAlignSkin}
              onEnhanceToggle={setEnhance}
              onStart={handleStart}
              onPause={handlePause}
              onStop={handleStop}
            />
          </div>
        </div>
      </div>

      {/* Credits exhausted modal */}
      {creditsExhausted && (
        <div className={styles.exhaustedModal}>
          <div className={styles.exhaustedCard}>
            <span style={{ fontSize: "3rem" }}>⚡</span>
            <h2 className={styles.exhaustedTitle}>Credits Depleted</h2>
            <p className={styles.exhaustedSub}>
              Your session has been paused. Top up to continue transforming.
            </p>
            <div className={styles.exhaustedActions}>
              <a href="/dashboard/credits" className="btn btn-primary">
                💳 Buy Credits
              </a>
              <button
                className="btn btn-ghost"
                onClick={() => { setCreditsExhausted(false); setCreditsLeft(0); }}
              >
                Continue Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
