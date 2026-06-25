import { redirect } from "next/navigation";
import { getUser, getAllSessions } from "@/lib/actions";
import styles from "./sessions.module.css";

function fmtDuration(s: number) {
  if (!s) return "0s";
  const m = Math.floor(s / 60), sec = s % 60;
  return m > 0 ? `${m}m ${sec}s` : `${sec}s`;
}

function fmtDate(d: string) {
  return new Date(d).toLocaleString("en-NG", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

const STATUS_COLOR: Record<string, string> = {
  active: "badge-live", ended: "badge-ai",
  error: "badge-voice", initializing: "badge-ai", paused: "badge-ai",
};

export default async function SessionsPage() {
  const user = await getUser();
  if (!user) redirect("/auth/login");

  const sessions = await getAllSessions(user.id);

  const totalMinutes   = sessions.reduce((a: number, s: { duration_seconds: number }) => a + (s.duration_seconds ?? 0), 0) / 60;
  const totalCredits   = sessions.reduce((a: number, s: { credits_used: number }) => a + (s.credits_used ?? 0), 0);
  const totalFrames    = sessions.reduce((a: number, s: { frames_processed: number }) => a + (s.frames_processed ?? 0), 0);
  const avgLatency     = sessions.length > 0
    ? (sessions.reduce((a: number, s: { avg_latency_ms: number }) => a + (s.avg_latency_ms ?? 0), 0) / sessions.filter((s: { avg_latency_ms: number }) => s.avg_latency_ms).length || 0)
    : 0;

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Session <span className="text-gradient">History</span></h1>
        <p className={styles.sub}>{sessions.length} transformation sessions total</p>
      </div>

      {/* Stats */}
      <div className={styles.statsRow}>
        {[
          { label: "Total Sessions",   val: sessions.length,            color: "var(--accent-cyan)"   },
          { label: "Total Minutes",    val: totalMinutes.toFixed(1),    color: "var(--accent-purple)" },
          { label: "Credits Used",     val: totalCredits.toLocaleString(), color: "var(--accent-amber)" },
          { label: "Frames Processed", val: totalFrames.toLocaleString(), color: "var(--accent-green)" },
          { label: "Avg Latency (ms)", val: avgLatency > 0 ? avgLatency.toFixed(0) : "—", color: "var(--accent-cyan)" },
        ].map((s) => (
          <div key={s.label} className="card">
            <p className={styles.statLabel}>{s.label}</p>
            <p className={styles.statVal} style={{ color: s.color }}>{s.val}</p>
          </div>
        ))}
      </div>

      {/* Sessions Table */}
      {sessions.length === 0 ? (
        <div className={`card ${styles.empty}`}>
          <span style={{ fontSize: "3rem" }}>📡</span>
          <p>No sessions yet. Open the studio to begin.</p>
          <a href="/studio" className="btn btn-primary" style={{ marginTop: "16px" }}>▶ Launch Studio</a>
        </div>
      ) : (
        <div className="card">
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Status</th><th>Date</th><th>Duration</th>
                <th>Credits</th><th>Frames</th><th>Avg Latency</th>
              </tr>
            </thead>
            <tbody>
              {sessions.map((s: {
                id: string; status: string; created_at: string;
                duration_seconds: number; credits_used: number;
                frames_processed: number; avg_latency_ms?: number;
              }) => (
                <tr key={s.id}>
                  <td>
                    <span className={`badge ${STATUS_COLOR[s.status] ?? "badge-ai"}`} style={{ fontSize: "0.6rem" }}>
                      {s.status.toUpperCase()}
                    </span>
                  </td>
                  <td className={styles.dateCell}>{fmtDate(s.created_at)}</td>
                  <td>{fmtDuration(s.duration_seconds)}</td>
                  <td style={{ color: "var(--accent-amber)" }}>{s.credits_used}</td>
                  <td style={{ color: "var(--accent-green)" }}>{(s.frames_processed ?? 0).toLocaleString()}</td>
                  <td style={{ color: "var(--text-secondary)" }}>
                    {s.avg_latency_ms ? `${s.avg_latency_ms.toFixed(0)}ms` : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
