"use client";
import { useState } from "react";
import styles from "./widgets.module.css";

interface VoiceProfile {
  id: string;
  name: string;
  style?: string;
  pitch_shift?: number;
  speed_factor?: number;
  is_preset: boolean;
  is_default: boolean;
}

const STYLE_ICONS: Record<string, string> = {
  "military-deep":   "🎖️",
  "ghost-whisper":   "👻",
  "tactical-clear":  "📡",
  "recon-sharp":     "🔭",
  "ranger-gruff":    "🪖",
};

export default function VoiceSelector({ voices }: { voices: VoiceProfile[] }) {
  const [selected, setSelected] = useState<string | null>(
    voices.find((v) => v.is_default)?.id ?? voices[0]?.id ?? null
  );

  const defaultVoices: VoiceProfile[] = [
    { id: "v1", name: "Commander",  style: "military-deep",  pitch_shift: -3, speed_factor: 0.92, is_preset: true, is_default: true  },
    { id: "v2", name: "Ghost",      style: "ghost-whisper",  pitch_shift: -1, speed_factor: 0.88, is_preset: true, is_default: false },
    { id: "v3", name: "Operative",  style: "tactical-clear", pitch_shift:  0, speed_factor: 1.00, is_preset: true, is_default: false },
    { id: "v4", name: "Recon",      style: "recon-sharp",    pitch_shift:  2, speed_factor: 1.10, is_preset: true, is_default: false },
    { id: "v5", name: "Ranger",     style: "ranger-gruff",   pitch_shift: -5, speed_factor: 0.85, is_preset: true, is_default: false },
  ];

  const display = voices.length > 0 ? voices : defaultVoices;
  const active  = display.find((v) => v.id === selected);

  return (
    <div className={`card ${styles.voiceCard}`}>
      <div className={styles.cardHeader}>
        <p className={styles.widgetLabel}>Voice Selector</p>
        <a href="/dashboard/voices" className="btn btn-ghost" style={{ padding: "4px 12px", fontSize: "0.78rem" }}>
          Manage →
        </a>
      </div>

      <div className={styles.voiceList}>
        {display.map((v) => (
          <button
            key={v.id}
            className={`${styles.voiceItem} ${selected === v.id ? styles.voiceActive : ""}`}
            onClick={() => setSelected(v.id)}
          >
            <div className={styles.voiceIconWrap}>
              <span>{STYLE_ICONS[v.style ?? ""] ?? "🎙️"}</span>
            </div>
            <div className={styles.voiceInfo}>
              <span className={styles.voiceName}>{v.name}</span>
              <span className={styles.voiceMeta}>
                Pitch: {v.pitch_shift ?? 0 > 0 ? "+" : ""}{v.pitch_shift ?? 0} · Speed: {v.speed_factor ?? 1}x
              </span>
            </div>
            {v.is_preset && (
              <span className={styles.voicePresetBadge}>Preset</span>
            )}
            {selected === v.id && (
              <span className={styles.voiceCheck}>✓</span>
            )}
          </button>
        ))}
      </div>

      {active && (
        <div className={styles.voiceActive_bar}>
          <div className={styles.voiceWaveform}>
            {[...Array(20)].map((_, i) => (
              <div
                key={i}
                className={styles.voiceBar}
                style={{ animationDelay: `${i * 0.05}s`, height: `${Math.random() * 24 + 6}px` }}
              />
            ))}
          </div>
          <span className={styles.voiceActiveName}>
            {STYLE_ICONS[active.style ?? ""] ?? "🎙️"} {active.name} active
          </span>
        </div>
      )}
    </div>
  );
}
