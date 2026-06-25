import styles from "./widgets.module.css";

const QUICK = [
  { icon: "🎬", label: "Open Studio",   href: "/studio",            accent: "var(--accent-cyan)",   desc: "Start live transformation" },
  { icon: "👤", label: "Add Avatar",    href: "/dashboard/avatars", accent: "var(--accent-purple)", desc: "Upload your face image" },
  { icon: "🎙️", label: "Set Voice",     href: "/dashboard/voices",  accent: "var(--accent-green)",  desc: "Choose voice preset" },
  { icon: "💳", label: "Buy Credits",   href: "/pricing",           accent: "var(--accent-gold)",   desc: "Top up your account" },
];

export default function QuickStart() {
  return (
    <div className={`card ${styles.quickStart}`}>
      <p className={styles.widgetLabel}>Quick Actions</p>
      <div className={styles.quickGrid}>
        {QUICK.map((q) => (
          <a key={q.label} href={q.href} className={styles.quickItem}>
            <div
              className={styles.quickIcon}
              style={{ background: `${q.accent}18`, border: `1px solid ${q.accent}40` }}
            >
              <span style={{ fontSize: "1.2rem" }}>{q.icon}</span>
            </div>
            <div className={styles.quickMeta}>
              <span className={styles.quickLabel} style={{ color: q.accent }}>{q.label}</span>
              <span className={styles.quickDesc}>{q.desc}</span>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}
