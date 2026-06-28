"use client";
import { useState, useEffect } from "react";
import styles from "./StudioControls.module.css";
import type { VoicePreset } from "@/lib/audioProcessor";

interface Avatar {
  id: string;
  name: string;
  image_url: string;
  embedding?: number[] | null;
}

interface VoiceModel {
  id:     string;
  name:   string;
  status: "training" | "ready" | "failed";
}

interface StudioControlsProps {
  avatars:            Avatar[];
  selectedAvatarId:   string | null;
  selectedVoice:      VoicePreset | "custom";
  resolution:         "480p" | "720p" | "1080p";
  quality:            "fast" | "balanced" | "ultra";
  alignSkin:          boolean;
  enhance:            boolean;
  isRunning:          boolean;
  isPaused:           boolean;
  creditsExhausted:   boolean;
  onAvatarSelect:     (avatar: Avatar) => void;
  onVoiceSelect:      (preset: VoicePreset | "custom") => void;
  onVoiceModelSelect: (modelId: string | null) => void;
  onResolutionChange: (r: "480p" | "720p" | "1080p") => void;
  onQualityChange:    (q: "fast" | "balanced" | "ultra") => void;
  onAlignSkinToggle:  (v: boolean) => void;
  onEnhanceToggle:    (v: boolean) => void;
  onStart:            () => void;
  onPause:            () => void;
  onStop:             () => void;
}

const VOICE_PRESETS: { id: VoicePreset; label: string; icon: string; desc: string }[] = [
  { id: "commander", label: "Commander",  icon: "🎖️", desc: "Deep & authoritative" },
  { id: "ghost",     label: "Ghost",      icon: "👻", desc: "Soft whisper style"   },
  { id: "operative", label: "Operative",  icon: "🔫", desc: "Clear & tactical"     },
  { id: "recon",     label: "Recon",      icon: "⚡", desc: "Sharp & energetic"    },
  { id: "ranger",    label: "Ranger",     icon: "🪖", desc: "Gruff & weathered"    },
];

const QUALITY_OPTIONS: { id: "fast"|"balanced"|"ultra"; label: string; desc: string; latency: string }[] = [
  { id: "fast",     label: "Fast",     desc: "Swap only",              latency: "~30ms"  },
  { id: "balanced", label: "Balanced", desc: "Swap + skin + GFPGAN",   latency: "~80ms"  },
  { id: "ultra",    label: "Ultra",    desc: "Full pipeline",          latency: "~160ms" },
];

const PRESET_AVATAR_EMOJIS: Record<string, string> = {
  "Ghost": "👻", "Commander": "🎖️", "Operative": "🔫", "Ranger": "🪖",
};

export default function StudioControls({
  avatars, selectedAvatarId, selectedVoice, resolution, quality,
  alignSkin, enhance, isRunning, isPaused, creditsExhausted,
  onAvatarSelect, onVoiceSelect, onVoiceModelSelect,
  onResolutionChange, onQualityChange, onAlignSkinToggle, onEnhanceToggle,
  onStart, onPause, onStop,
}: StudioControlsProps) {
  const [tab,          setTab]          = useState<"avatar" | "voice" | "settings">("avatar");
  const [voiceModels,  setVoiceModels]  = useState<VoiceModel[]>([]);
  const [selectedModel,setSelectedModel]= useState<string | null>(null);

  const canStart = selectedAvatarId && !creditsExhausted;

  // Load user's trained voice models
  useEffect(() => {
    fetch("/api/voice/models")
      .then((r) => r.json())
      .then((d) => setVoiceModels((d.models ?? []).filter((m: VoiceModel) => m.status === "ready")))
      .catch(() => {});
  }, []);

  const handleVoiceModelSelect = (modelId: string) => {
    setSelectedModel(modelId);
    onVoiceModelSelect(modelId);
    onVoiceSelect("custom");
  };

  return (
    <div className={styles.root}>
      {/* Tab bar */}
      <div className={styles.tabs}>
        {(["avatar", "voice", "settings"] as const).map((t) => (
          <button
            key={t}
            className={`${styles.tab} ${tab === t ? styles.tabActive : ""}`}
            onClick={() => setTab(t)}
          >
            {t === "avatar" ? "👤 Avatar" : t === "voice" ? "🎙️ Voice" : "⚙️ Settings"}
          </button>
        ))}
      </div>

      <div className={styles.tabContent}>
        {/* ─ Avatar tab ─ */}
        {tab === "avatar" && (
          <div className={styles.avatarGrid}>
            {avatars.length === 0 ? (
              <p className={styles.empty}>
                No avatars yet.{" "}
                <a href="/dashboard/avatars">Upload one →</a>
              </p>
            ) : (
              avatars.map((av) => (
                <button
                  key={av.id}
                  className={`${styles.avatarCard} ${selectedAvatarId === av.id ? styles.avatarSelected : ""}`}
                  onClick={() => onAvatarSelect(av)}
                  title={av.name}
                >
                  {av.image_url.startsWith("http") ? (
                    <img src={av.image_url} alt={av.name} className={styles.avatarImg} />
                  ) : (
                    <span className={styles.avatarEmoji}>
                      {PRESET_AVATAR_EMOJIS[av.name] ?? "🪖"}
                    </span>
                  )}
                  <span className={styles.avatarName}>{av.name}</span>
                  {selectedAvatarId === av.id && (
                    <span className={styles.avatarCheck}>✓</span>
                  )}
                </button>
              ))
            )}
          </div>
        )}

        {/* ─ Voice tab ─ */}
        {tab === "voice" && (
          <div className={styles.voiceList}>
            {/* Built-in presets */}
            <p className={styles.voiceGroupLabel}>Built-in Presets</p>
            {VOICE_PRESETS.map((v) => (
              <button
                key={v.id}
                className={`${styles.voiceRow} ${selectedVoice === v.id ? styles.voiceSelected : ""}`}
                onClick={() => { onVoiceSelect(v.id); setSelectedModel(null); onVoiceModelSelect(null); }}
              >
                <span className={styles.voiceIcon}>{v.icon}</span>
                <div className={styles.voiceInfo}>
                  <span className={styles.voiceLabel}>{v.label}</span>
                  <span className={styles.voiceDesc}>{v.desc}</span>
                </div>
                {selectedVoice === v.id && <span className={styles.voiceCheck}>✓</span>}
              </button>
            ))}

            {/* Custom trained models */}
            {voiceModels.length > 0 && (
              <>
                <div className={styles.voiceDivider} />
                <p className={styles.voiceGroupLabel}>🧠 Your Trained Models</p>
                {voiceModels.map((m) => (
                  <button
                    key={m.id}
                    className={`${styles.voiceRow} ${selectedModel === m.id ? styles.voiceSelected : ""}`}
                    onClick={() => handleVoiceModelSelect(m.id)}
                  >
                    <span className={styles.voiceIcon}>🎤</span>
                    <div className={styles.voiceInfo}>
                      <span className={styles.voiceLabel}>{m.name}</span>
                      <span className={styles.voiceDesc}>Personal RVC model</span>
                    </div>
                    {selectedModel === m.id && <span className={styles.voiceCheck}>✓</span>}
                  </button>
                ))}
              </>
            )}

            <a href="/dashboard/voice-training" className={styles.trainLink}>
              ➕ Train custom voice →
            </a>
          </div>
        )}

        {/* ─ Settings tab ─ */}
        {tab === "settings" && (
          <div className={styles.settings}>
            {/* Resolution */}
            <div className={styles.settingRow}>
              <span className={styles.settingLabel}>Resolution</span>
              <div className={styles.resBtns}>
                {(["480p", "720p", "1080p"] as const).map((r) => (
                  <button
                    key={r}
                    className={`${styles.resBtn} ${resolution === r ? styles.resBtnActive : ""}`}
                    onClick={() => onResolutionChange(r)}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>

            {/* Quality mode */}
            <div className={styles.settingSection}>
              <span className={styles.settingLabel}>AI Quality Mode</span>
              <div className={styles.qualityBtns}>
                {QUALITY_OPTIONS.map((q) => (
                  <button
                    key={q.id}
                    className={`${styles.qualityBtn} ${quality === q.id ? styles.qualityActive : ""}`}
                    onClick={() => onQualityChange(q.id)}
                    title={`${q.desc} — ${q.latency}`}
                  >
                    <span className={styles.qualityLabel}>{q.label}</span>
                    <span className={styles.qualityLatency}>{q.latency}</span>
                  </button>
                ))}
              </div>
              <p className={styles.qualityHint}>
                {QUALITY_OPTIONS.find(q => q.id === quality)?.desc}
              </p>
            </div>

            {/* Toggles */}
            <div className={styles.toggleRow}>
              <div className={styles.toggleInfo}>
                <span className={styles.settingLabel}>Skin Tone Alignment</span>
                <span className={styles.toggleHint}>Match skin color to source frame</span>
              </div>
              <button
                className={`${styles.toggle} ${alignSkin ? styles.toggleOn : ""}`}
                onClick={() => onAlignSkinToggle(!alignSkin)}
              >
                <span className={styles.toggleKnob} />
              </button>
            </div>

            <div className={styles.toggleRow}>
              <div className={styles.toggleInfo}>
                <span className={styles.settingLabel}>GFPGAN Enhancement</span>
                <span className={styles.toggleHint}>AI face restoration & sharpening</span>
              </div>
              <button
                className={`${styles.toggle} ${enhance ? styles.toggleOn : ""}`}
                onClick={() => onEnhanceToggle(!enhance)}
              >
                <span className={styles.toggleKnob} />
              </button>
            </div>

            {/* Info rows */}
            <div className={styles.settingRow}>
              <span className={styles.settingLabel}>Frame Rate</span>
              <span className={styles.settingVal}>30 FPS</span>
            </div>
            <div className={styles.settingRow}>
              <span className={styles.settingLabel}>Audio</span>
              <span className={styles.settingVal}>16kHz Mono</span>
            </div>
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div className={styles.actions}>
        {!isRunning ? (
          <button
            className={`btn btn-primary ${styles.startBtn} ${!canStart ? styles.startDisabled : ""}`}
            onClick={onStart}
            disabled={!canStart}
          >
            {creditsExhausted
              ? "⚡ Buy Credits"
              : !selectedAvatarId
              ? "Select Avatar First"
              : "▶ Start Transformation"}
          </button>
        ) : (
          <>
            <button className={`btn btn-ghost ${styles.pauseBtn}`} onClick={onPause}>
              {isPaused ? "▶ Resume" : "⏸ Pause"}
            </button>
            <button className={`btn btn-ghost ${styles.stopBtn}`} onClick={onStop}>
              ⏹ Stop
            </button>
          </>
        )}
      </div>
    </div>
  );
}
