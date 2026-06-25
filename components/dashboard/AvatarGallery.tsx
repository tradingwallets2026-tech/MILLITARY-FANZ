"use client";
import { useState } from "react";
import styles from "./widgets.module.css";

interface Avatar {
  id: string;
  name: string;
  image_url: string;
  is_preset: boolean;
  is_default: boolean;
}

const PLACEHOLDER_AVATARS = [
  { id: "preset-1", name: "Ghost",      is_preset: true,  is_default: false, image_url: "", emoji: "👻" },
  { id: "preset-2", name: "Commander",  is_preset: true,  is_default: false, image_url: "", emoji: "🎖️" },
  { id: "preset-3", name: "Operative",  is_preset: true,  is_default: false, image_url: "", emoji: "🔫" },
  { id: "preset-4", name: "Ranger",     is_preset: true,  is_default: false, image_url: "", emoji: "🪖" },
];

export default function AvatarGallery({ avatars }: { avatars: Avatar[] }) {
  const [selected, setSelected] = useState<string | null>(null);
  const displayAvatars = avatars.length > 0 ? avatars : PLACEHOLDER_AVATARS;

  return (
    <div className={`card ${styles.galleryCard}`}>
      <div className={styles.cardHeader}>
        <p className={styles.widgetLabel}>Avatar Gallery</p>
        <a href="/dashboard/avatars" className="btn btn-ghost" style={{ padding: "4px 12px", fontSize: "0.78rem" }}>
          Manage →
        </a>
      </div>

      <div className={styles.avatarGrid}>
        {(displayAvatars as (Avatar & { emoji?: string })[]).map((av) => (
          <button
            key={av.id}
            className={`${styles.avatarCard} ${selected === av.id ? styles.avatarSelected : ""}`}
            onClick={() => setSelected(av.id)}
          >
            <div className={styles.avatarThumb}>
              {av.image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={av.image_url} alt={av.name} className={styles.avatarImg} />
              ) : (
                <span className={styles.avatarEmoji}>{av.emoji ?? "👤"}</span>
              )}
              {av.is_preset && (
                <span className={styles.presetBadge}>PRESET</span>
              )}
              {selected === av.id && (
                <div className={styles.avatarCheckmark}>✓</div>
              )}
            </div>
            <span className={styles.avatarName}>{av.name}</span>
          </button>
        ))}

        {/* Add new */}
        <a href="/dashboard/avatars" className={styles.avatarAdd}>
          <span style={{ fontSize: "1.6rem", color: "var(--text-muted)" }}>+</span>
          <span className={styles.avatarName} style={{ color: "var(--text-muted)" }}>Upload</span>
        </a>
      </div>
    </div>
  );
}
