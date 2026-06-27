"use client";
import { useState, useRef, useCallback } from "react";
import styles from "./voice-training.module.css";
import posthog from "posthog-js";

interface VoiceModel {
  id:          string;
  name:        string;
  status:      "training" | "ready" | "failed";
  samples:     number;
  n_vectors:   number | null;
  trained_at:  string | null;
  created_at:  string;
}

interface VoiceTrainingClientProps {
  userId:          string;
  initialBalance:  number;
  initialModels:   VoiceModel[];
}

const TRAINING_COST     = 50;
const MAX_FILES         = 10;
const MAX_TOTAL_MB      = 50;
const MIN_DURATION_HINT = "30 seconds";
const MAX_DURATION_HINT = "10 minutes";

type TrainingPhase =
  | "idle"
  | "uploading"
  | "queued"
  | "training"
  | "done"
  | "error";

export default function VoiceTrainingClient({
  userId,
  initialBalance,
  initialModels,
}: VoiceTrainingClientProps) {
  const [models,   setModels]   = useState<VoiceModel[]>(initialModels);
  const [files,    setFiles]    = useState<File[]>([]);
  const [name,     setName]     = useState("My Voice");
  const [phase,    setPhase]    = useState<TrainingPhase>("idle");
  const [progress, setProgress] = useState(0);
  const [error,    setError]    = useState<string | null>(null);
  const [balance,  setBalance]  = useState(initialBalance);
  const [pollingId,setPolling]  = useState<string | null>(null);

  const dropRef  = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // ── File validation ───────────────────────────────────────────
  const totalMB = files.reduce((s, f) => s + f.size / 1024 / 1024, 0);
  const canTrain = (
    files.length > 0 &&
    files.length <= MAX_FILES &&
    totalMB <= MAX_TOTAL_MB &&
    balance >= TRAINING_COST &&
    phase === "idle"
  );

  // ── Drag & drop ───────────────────────────────────────────────
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const dropped = Array.from(e.dataTransfer.files).filter(
      (f) => f.type.startsWith("audio/") || f.name.endsWith(".wav") || f.name.endsWith(".mp3")
    );
    setFiles((prev) => [...prev, ...dropped].slice(0, MAX_FILES));
  }, []);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = Array.from(e.target.files ?? []);
    setFiles((prev) => [...prev, ...picked].slice(0, MAX_FILES));
  };

  const removeFile = (i: number) => {
    setFiles((prev) => prev.filter((_, idx) => idx !== i));
  };

  // ── Poll training status ──────────────────────────────────────
  const pollStatus = async (modelId: string) => {
    const timer = setInterval(async () => {
      try {
        const res  = await fetch(`/api/voice/train?model_id=${modelId}`);
        const data = await res.json();
        if (data.status === "ready") {
          clearInterval(timer);
          setPhase("done");
          setModels((prev) =>
            prev.map((m) => m.id === modelId ? { ...m, ...data } : m)
          );
        } else if (data.status === "failed") {
          clearInterval(timer);
          setPhase("error");
          setError("Training failed. Check audio quality and try again.");
        }
      } catch { /* retry next interval */ }
    }, 15_000); // poll every 15 seconds
    setPolling(modelId);
  };

  // ── Submit training ───────────────────────────────────────────
  const handleTrain = async () => {
    if (!canTrain) return;
    setPhase("uploading");
    setError(null);
    setProgress(10);

    const fd = new FormData();
    fd.append("model_name", name);
    files.forEach((f) => fd.append("audio", f));

    setProgress(40);

    posthog.capture("voice_training_started", {
      model_name:   name,
      file_count:   files.length,
      total_mb:     parseFloat(totalMB.toFixed(2)),
      credits_cost: TRAINING_COST,
      user_id:      userId,
    });

    try {
      const res  = await fetch("/api/voice/train", { method: "POST", body: fd });
      const data = await res.json();

      if (!res.ok) {
        setPhase("error");
        setError(data.error ?? "Training failed");
        posthog.captureException(new Error(data.error ?? "Voice training failed"));
        return;
      }

      setProgress(70);
      setBalance((b) => b - TRAINING_COST);

      // Add model to list immediately (status: training)
      const newModel: VoiceModel = {
        id:         data.model_id,
        name,
        status:     "training",
        samples:    files.length,
        n_vectors:  null,
        trained_at: null,
        created_at: new Date().toISOString(),
      };
      setModels((prev) => [newModel, ...prev]);

      setPhase("queued");
      setProgress(100);
      setFiles([]);
      setName("My Voice");

      // Start polling
      await pollStatus(data.model_id);

    } catch (err) {
      setPhase("error");
      setError("Network error. Please try again.");
    }
  };

  // ── Delete model ──────────────────────────────────────────────
  const deleteModel = async (modelId: string) => {
    await fetch("/api/voice/models", {
      method:  "DELETE",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ modelId }),
    });
    setModels((prev) => prev.filter((m) => m.id !== modelId));
    posthog.capture("voice_model_deleted", { model_id: modelId, user_id: userId });
  };

  // ── Render ────────────────────────────────────────────────────
  const PHASE_MSGS: Record<TrainingPhase, string> = {
    idle:      "",
    uploading: "Uploading audio files…",
    queued:    "Training job queued on A10G GPU…",
    training:  "Training in progress (~5–10 minutes)…",
    done:      "✅ Voice model trained successfully!",
    error:     error ?? "Training failed",
  };

  return (
    <div className={styles.root}>
      {/* Header */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>🎙️ Personal Voice Training</h1>
          <p className={styles.sub}>
            Upload your voice recordings and train a custom AI voice model.
            Use it as a preset in the live studio — perfectly matched to your voice.
          </p>
        </div>
        <div className={styles.creditBadge}>
          ⚡ {balance.toLocaleString()} credits
        </div>
      </div>

      <div className={styles.layout}>
        {/* ─ Left: Training form ─ */}
        <div className={styles.formCard}>
          <h2 className={styles.sectionTitle}>Upload Voice Samples</h2>

          {/* Requirements */}
          <div className={styles.requirements}>
            {[
              { icon: "🎤", text: `${MIN_DURATION_HINT} – ${MAX_DURATION_HINT} total audio` },
              { icon: "🎵", text: "WAV or MP3 format" },
              { icon: "🔇", text: "Quiet room, minimal background noise" },
              { icon: "📢", text: "Natural speaking voice — no music" },
              { icon: "📁", text: `Max ${MAX_FILES} files, ${MAX_TOTAL_MB}MB total` },
              { icon: "⚡", text: `Training costs ${TRAINING_COST} credits` },
            ].map((r) => (
              <div key={r.text} className={styles.req}>
                <span>{r.icon}</span>
                <span>{r.text}</span>
              </div>
            ))}
          </div>

          {/* Drop zone */}
          <div
            ref={dropRef}
            className={`${styles.dropzone} ${files.length > 0 ? styles.dropzoneHasFiles : ""}`}
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            onClick={() => inputRef.current?.click()}
          >
            <input
              ref={inputRef}
              type="file"
              accept="audio/*,.wav,.mp3,.m4a,.ogg,.flac"
              multiple
              className={styles.hiddenInput}
              onChange={handleFileInput}
            />
            {files.length === 0 ? (
              <>
                <span className={styles.dropIcon}>🎤</span>
                <p className={styles.dropText}>
                  Drag & drop audio files here
                  <span className={styles.dropSub}>or click to browse</span>
                </p>
              </>
            ) : (
              <div className={styles.fileList} onClick={(e) => e.stopPropagation()}>
                {files.map((f, i) => (
                  <div key={i} className={styles.fileRow}>
                    <span className={styles.fileIcon}>🎵</span>
                    <span className={styles.fileName}>{f.name}</span>
                    <span className={styles.fileSize}>
                      {(f.size / 1024 / 1024).toFixed(1)}MB
                    </span>
                    <button className={styles.removeBtn} onClick={() => removeFile(i)}>×</button>
                  </div>
                ))}
                {files.length < MAX_FILES && (
                  <button
                    className={styles.addMoreBtn}
                    onClick={() => inputRef.current?.click()}
                  >
                    + Add more
                  </button>
                )}
              </div>
            )}
          </div>

          {/* File stats */}
          {files.length > 0 && (
            <div className={styles.fileStats}>
              <span>{files.length} file{files.length > 1 ? "s" : ""}</span>
              <span>{totalMB.toFixed(1)}MB / {MAX_TOTAL_MB}MB</span>
              {totalMB > MAX_TOTAL_MB && (
                <span className={styles.overLimit}>⚠ Over limit</span>
              )}
            </div>
          )}

          {/* Model name */}
          <div className={styles.nameField}>
            <label className={styles.label}>Model Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={48}
              className={styles.nameInput}
              placeholder="e.g. Commander Voice"
            />
          </div>

          {/* Progress bar */}
          {phase !== "idle" && phase !== "error" && (
            <div className={styles.progressWrap}>
              <div className={styles.progressBar} style={{ width: `${progress}%` }} />
              <p className={styles.progressMsg}>{PHASE_MSGS[phase]}</p>
            </div>
          )}

          {/* Error */}
          {error && <div className={styles.errorBanner}>⚠️ {error}</div>}

          {/* Submit */}
          <button
            className={`btn btn-primary ${styles.trainBtn}`}
            onClick={handleTrain}
            disabled={!canTrain}
          >
            {phase === "uploading" || phase === "queued" ? (
              <span className={styles.spinner} />
            ) : (
              <>⚡ Train My Voice Model ({TRAINING_COST} credits)</>
            )}
          </button>

          {balance < TRAINING_COST && (
            <a href="/pricing" className={styles.lowCreditsHint}>
              ⚡ Not enough credits — Buy more →
            </a>
          )}
        </div>

        {/* ─ Right: Trained models ─ */}
        <div className={styles.modelsCard}>
          <h2 className={styles.sectionTitle}>
            Your Voice Models
            <span className={styles.modelCount}>{models.length}</span>
          </h2>

          {models.length === 0 ? (
            <div className={styles.emptyModels}>
              <span style={{ fontSize: "2.5rem" }}>🎙️</span>
              <p>No models yet. Upload audio samples to train your first voice.</p>
            </div>
          ) : (
            <div className={styles.modelList}>
              {models.map((m) => (
                <div
                  key={m.id}
                  className={`${styles.modelCard} ${styles[`model_${m.status}`]}`}
                >
                  <div className={styles.modelHeader}>
                    <span className={styles.modelName}>{m.name}</span>
                    <span className={`${styles.modelBadge} ${styles[`badge_${m.status}`]}`}>
                      {m.status === "training" ? "⏳ Training" : m.status === "ready" ? "✅ Ready" : "❌ Failed"}
                    </span>
                  </div>

                  <div className={styles.modelMeta}>
                    <span>🎵 {m.samples} sample{m.samples !== 1 ? "s" : ""}</span>
                    {m.n_vectors && <span>📊 {m.n_vectors.toLocaleString()} vectors</span>}
                    {m.trained_at && (
                      <span>🕐 {new Date(m.trained_at).toLocaleDateString()}</span>
                    )}
                  </div>

                  {m.status === "training" && (
                    <div className={styles.trainingAnim}>
                      <div className={styles.trainDot} />
                      <div className={styles.trainDot} />
                      <div className={styles.trainDot} />
                      <span>Training in progress…</span>
                    </div>
                  )}

                  {m.status === "ready" && (
                    <div className={styles.modelActions}>
                      <a href={`/studio?voiceModelId=${m.id}`} className="btn btn-primary" style={{ fontSize: "0.8rem" }}>
                        🎬 Use in Studio
                      </a>
                      <button
                        className="btn btn-ghost"
                        onClick={() => deleteModel(m.id)}
                        style={{ fontSize: "0.8rem", color: "#f87171" }}
                      >
                        🗑 Delete
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
