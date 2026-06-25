import styles from "./FeaturesSection.module.css";

const FEATURES = [
  {
    icon: "⚡",
    title: "Realtime Face Swap",
    desc: "Transform your identity in milliseconds during calls and streams using military-grade AI inference.",
    accent: "var(--accent-cyan)",
  },
  {
    icon: "🎙️",
    title: "Voice Changer",
    desc: "AI-powered voice styling designed for live operator sessions. 5 military presets available.",
    accent: "var(--accent-purple)",
  },
  {
    icon: "🛡️",
    title: "Privacy Masking",
    desc: "Hide your real identity while maintaining full expressive performance and natural motion.",
    accent: "var(--accent-green)",
  },
  {
    icon: "🎭",
    title: "VTuber Mode",
    desc: "Launch virtual personas with cinematic avatar-ready output. Full head tracking included.",
    accent: "var(--accent-amber)",
  },
  {
    icon: "📡",
    title: "Streaming Support",
    desc: "Built for OBS, TikTok Live, Zoom, Google Meet and all major creator platforms.",
    accent: "var(--accent-cyan)",
  },
  {
    icon: "🧠",
    title: "AI Identity Engine",
    desc: "One cloud platform for face and voice transformation workflows. Zero local GPU needed.",
    accent: "var(--accent-purple)",
  },
];

export default function FeaturesSection() {
  return (
    <section className={`section ${styles.features}`} id="features">
      <div className={`glow-orb glow-orb-purple ${styles.orb}`} />
      <div className="container">
        <div className={styles.header}>
          <p className="section-label">Powerful Features</p>
          <h2 className="section-title">
            Everything you need to <span className="text-gradient">transform</span>
          </h2>
          <p className="section-subtitle">
            Military Pass combines the most advanced open-source AI models into a single,
            browser-based platform — no setup, no GPU required.
          </p>
        </div>

        <div className={styles.grid}>
          {FEATURES.map((f, i) => (
            <div
              key={f.title}
              className={`card ${styles.card}`}
              style={{ animationDelay: `${i * 0.1}s` }}
            >
              <div
                className={styles.iconWrap}
                style={{ background: `${f.accent}18`, border: `1px solid ${f.accent}33` }}
              >
                <span className={styles.icon}>{f.icon}</span>
              </div>
              <h3 className={`heading-sm ${styles.cardTitle}`}>{f.title}</h3>
              <p className={`text-muted ${styles.cardDesc}`}>{f.desc}</p>
              <div className={styles.cardAccent} style={{ background: f.accent }} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
