import styles from "./widgets.module.css";

interface Session {
  id: string;
  status: string;
  duration_seconds: number;
  credits_used: number;
  frames_processed: number;
  created_at: string;
}

function fmtDuration(s: number) {
  if (!s) return "0s";
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return m > 0 ? `${m}m ${sec}s` : `${sec}s`;
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("en-NG", {
    day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
  });
}

const STATUS_BADGE: Record<string, string> = {
  active:       "badge-live",
  ended:        "badge-ai",
  error:        "badge-voice",
  initializing: "badge-ai",
  paused:       "badge-ai",
};

export default function RecentSessions({ sessions }: { sessions: Session[] }) {
  if (sessions.length === 0) {
    return (
      <div className={`card ${styles.sessionsCard}`}>
        <p className={styles.widgetLabel}>Recent Sessions</p>
        <div className={styles.emptyState}>
          <span style={{ fontSize: "2.5rem" }}>📡</span>
          <p>No sessions yet.</p>
          <a href="/studio" className="btn btn-primary" style={{ marginTop: "12px", fontSize: "0.85rem" }}>
            Start First Session
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className={`card ${styles.sessionsCard}`}>
      <div className={styles.cardHeader}>
        <p className={styles.widgetLabel}>Recent Sessions</p>
        <a href="/dashboard/sessions" className="btn btn-ghost" style={{ padding: "4px 12px", fontSize: "0.78rem" }}>
          View All →
        </a>
      </div>

      <div className={styles.sessionsList}>
        {sessions.map((s) => (
          <div key={s.id} className={styles.sessionRow}>
            <div className={styles.sessionIcon}>🎬</div>
            <div className={styles.sessionInfo}>
              <div className={styles.sessionMeta}>
                <span className={`badge ${STATUS_BADGE[s.status] ?? "badge-ai"}`} style={{ fontSize: "0.6rem" }}>
                  {s.status.toUpperCase()}
                </span>
                <span className={styles.sessionDate}>{fmtDate(s.created_at)}</span>
              </div>
              <div className={styles.sessionStats}>
                <span>⏱ {fmtDuration(s.duration_seconds)}</span>
                <span>💎 {s.credits_used} credits</span>
                <span>🖼 {s.frames_processed} frames</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
