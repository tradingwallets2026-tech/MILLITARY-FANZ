"use client";
import { useState, useRef, useCallback } from "react";
import styles from "./avatars.module.css";
import posthog from "posthog-js";
import { deleteAvatar, setDefaultAvatar } from "@/lib/actions";

interface Avatar {
  id: string;
  name: string;
  image_url: string;
  is_preset: boolean;
  is_default: boolean;
  created_at: string;
}

interface AvatarsClientProps {
  userId: string;
  initialBalance: number;
  initialAvatars: Avatar[];
}

export default function AvatarsClient({
  userId,
  initialBalance,
  initialAvatars,
}: AvatarsClientProps) {
  const [avatars, setAvatars] = useState<Avatar[]>(initialAvatars);
  const [balance, setBalance] = useState(initialBalance);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tips, setTips] = useState<string[] | null>(null);
  const [success, setSuccess] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropzoneRef = useRef<HTMLDivElement>(null);

  // ── Sync Balance ──────────────────────────────────────────────
  const syncBalance = async () => {
    try {
      const res = await fetch("/api/credits/balance");
      if (res.ok) {
        const data = await res.json();
        if (typeof data.balance === "number") {
          setBalance(data.balance);
        }
      }
    } catch (e) {
      console.warn("Failed to sync credits balance:", e);
    }
  };

  // ── File validation & preview ─────────────────────────────────
  const selectFile = (selectedFile: File) => {
    setError(null);
    setTips(null);
    setSuccess(false);

    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!allowedTypes.includes(selectedFile.type)) {
      setError("Invalid file type. Please upload a JPG, PNG, or WebP image.");
      return;
    }

    if (selectedFile.size > 5 * 1024 * 1024) {
      setError("File too large. Maximum allowed size is 5MB.");
      return;
    }

    setFile(selectedFile);
    setName(selectedFile.name.substring(0, selectedFile.name.lastIndexOf(".")) || selectedFile.name);
    
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviewUrl(reader.result as string);
    };
    reader.readAsDataURL(selectedFile);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      selectFile(e.target.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      selectFile(e.dataTransfer.files[0]);
    }
  };

  const clearFile = () => {
    setFile(null);
    setPreviewUrl(null);
    setName("");
    setError(null);
    setTips(null);
    setSuccess(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // ── Upload Handler ────────────────────────────────────────────
  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || isUploading) return;

    setIsUploading(true);
    setError(null);
    setTips(null);
    setSuccess(false);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("name", name || "My Avatar");

      const res = await fetch("/api/avatars/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Upload failed. Please try again.");
        if (data.tips) setTips(data.tips);
        posthog.capture("avatar_upload_failed", { error: data.error, user_id: userId });
        return;
      }

      setSuccess(true);
      if (data.avatar) {
        setAvatars((prev) => [data.avatar, ...prev]);
        posthog.capture("avatar_uploaded", { avatar_id: data.avatar.id, user_id: userId });
      }

      clearFile();
      await syncBalance();

    } catch (err) {
      console.error(err);
      setError("An internal error occurred during upload. Please check your network and try again.");
    } finally {
      setIsUploading(false);
    }
  };

  // ── Set Default Identity ──────────────────────────────────────
  const handleSetDefault = async (avatarId: string) => {
    try {
      const res = await setDefaultAvatar(avatarId, userId);
      if (res.error) {
        setError(res.error);
        return;
      }
      setAvatars((prev) =>
        prev.map((a) => ({
          ...a,
          is_default: a.id === avatarId,
        }))
      );
      posthog.capture("avatar_set_default", { avatar_id: avatarId, user_id: userId });
    } catch {
      setError("Failed to set default avatar.");
    }
  };

  // ── Delete Identity ───────────────────────────────────────────
  const handleDelete = async (avatarId: string) => {
    if (!confirm("Are you sure you want to delete this custom avatar?")) return;

    try {
      const res = await deleteAvatar(avatarId, userId);
      if (res.error) {
        setError(res.error);
        return;
      }
      setAvatars((prev) => prev.filter((a) => a.id !== avatarId));
      posthog.capture("avatar_deleted", { avatar_id: avatarId, user_id: userId });
    } catch {
      setError("Failed to delete avatar.");
    }
  };

  return (
    <div className={styles.root}>
      {/* ── Header ── */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Avatar Identities</h1>
          <p className={styles.sub}>
            Upload your front-facing face photos to generate AI identities. Face swap swaps your face in real-time inside the WebRTC studio session.
          </p>
        </div>
        <div className={styles.creditBadge}>
          {balance} CREDITS AVAILABLE
        </div>
      </div>

      {/* ── Two column content ── */}
      <div className={styles.layout}>
        
        {/* Left Column: List existing avatars */}
        <div className={styles.listingCard}>
          <h2 className={styles.sectionTitle}>
            <span>👥</span> Saved Avatars ({avatars.length})
          </h2>

          {avatars.length === 0 ? (
            <div className={styles.emptyListing}>
              <span style={{ fontSize: "2.5rem" }}>👤</span>
              <p>No avatars saved yet.</p>
              <p style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                Upload a face photo in the right panel to get started.
              </p>
            </div>
          ) : (
            <div className={styles.avatarList}>
              {avatars.map((av) => (
                <div
                  key={av.id}
                  className={`${styles.avatarCard} ${av.is_default ? styles.card_default : ""}`}
                >
                  <div className={`${styles.thumb} ${av.is_default ? styles.thumb_default : ""}`}>
                    {av.image_url ? (
                      <img src={av.image_url} alt={av.name} className={styles.thumbImg} />
                    ) : (
                      <span className={styles.thumbEmoji}>👤</span>
                    )}
                  </div>

                  <div className={styles.meta}>
                    <div className={styles.nameWrap}>
                      <span className={styles.name} title={av.name}>{av.name}</span>
                      {av.is_preset && <span className={styles.presetBadge}>PRESET</span>}
                      {av.is_default && <span className={styles.defaultBadge}>DEFAULT</span>}
                    </div>
                    <span className={styles.date}>
                      Added {new Date(av.created_at).toLocaleDateString()}
                    </span>
                  </div>

                  <div className={styles.actions}>
                    {!av.is_default && (
                      <button
                        onClick={() => handleSetDefault(av.id)}
                        className={`${styles.actionBtn} ${styles.setDefaultBtn}`}
                      >
                        Use Default
                      </button>
                    )}
                    {!av.is_preset && (
                      <button
                        onClick={() => handleDelete(av.id)}
                        className={styles.deleteBtn}
                        title="Delete Avatar"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Column: Upload Form */}
        <div className={styles.formCard}>
          <h2 className={styles.sectionTitle}>
            <span>📤</span> Upload Face Photo
          </h2>

          <form onSubmit={handleUpload}>
            {/* Image Preview or Dropzone */}
            {!previewUrl ? (
              <div
                className={styles.dropzone}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                ref={dropzoneRef}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  className={styles.hiddenInput}
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleFileInput}
                />
                <span className={styles.dropIcon}>📸</span>
                <span className={styles.dropText}>
                  Drag & drop face photo here
                  <span className={styles.dropSub}>JPG, PNG, or WebP (Max 5MB)</span>
                </span>
              </div>
            ) : (
              <div className={styles.previewWrap}>
                <div className={styles.previewCircle}>
                  <img src={previewUrl} alt="Face Preview" className={styles.previewImg} />
                </div>
                <span className={styles.previewName}>{file?.name}</span>
                <span className={styles.changeBtn} onClick={clearFile}>
                  Remove photo
                </span>
              </div>
            )}

            {/* Custom Name field */}
            <div className={styles.nameField}>
              <label className={styles.label}>Avatar Name</label>
              <input
                type="text"
                placeholder="e.g. Commander Alpha"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={styles.nameInput}
                disabled={isUploading}
              />
            </div>

            {/* Success state banner */}
            {success && (
              <div className={styles.successBanner}>
                🎉 Avatar uploaded successfully! It is now ready for real-time face swap.
              </div>
            )}

            {/* Error state banner */}
            {error && (
              <div className={styles.errorBanner}>
                <div>⚠️ {error}</div>
                {tips && (
                  <ul>
                    {tips.map((tip, idx) => (
                      <li key={idx}>{tip}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {/* Submit button */}
            <button
              type="submit"
              className={`${styles.btn} ${styles.btnPrimary} ${styles.uploadBtn}`}
              disabled={!file || isUploading || balance < 1}
            >
              {isUploading ? (
                <>
                  <span className={styles.spinner}></span>
                  <span>Processing face swap…</span>
                </>
              ) : (
                <span>Upload Avatar (Cost: 1 Credit)</span>
              )}
            </button>

            {balance < 1 && (
              <a href="/pricing" className={styles.lowCreditsHint}>
                Low credits. Purchase more credits to upload custom avatars.
              </a>
            )}
          </form>
        </div>

      </div>
    </div>
  );
}
