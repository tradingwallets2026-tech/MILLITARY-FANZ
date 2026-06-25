import styles from "./HowItWorksSection.module.css";

const STEPS = [
  {
    num: "01",
    icon: "👤",
    title: "Upload Face",
    desc: "Upload your base identity image or pick a preset operator avatar from our library.",
  },
  {
    num: "02",
    icon: "🧠",
    title: "AI Processing",
    desc: "Military Pass AI models prepare your realtime transformation profile in the cloud.",
  },
  {
    num: "03",
    icon: "🔄",
    title: "Realtime Sync",
    desc: "Face and motion sync to your live camera feed at up to 30 frames per second.",
  },
  {
    num: "04",
    icon: "🎙️",
    title: "Voice Matching",
    desc: "Apply a military voice style for your chosen operator persona. 5 presets available.",
  },
  {
    num: "05",
    icon: "📡",
    title: "Stream Live",
    desc: "Push output to OBS, meetings, TikTok Live, or any creator platform — instantly.",
  },
];

export default function HowItWorksSection() {
  return (
    <section className={`section ${styles.section}`} id="how-it-works">
      <div className="container">
        <div className={styles.header}>
          <p className="section-label">Simple Process</p>
          <h2 className="section-title">
            How <span className="text-gradient">Military Pass</span> Works
          </h2>
          <p className="section-subtitle">
            Go from zero to livestream in minutes. No technical setup required.
          </p>
        </div>

        <div className={styles.steps}>
          {STEPS.map((step, i) => (
            <div key={step.num} className={styles.step}>
              {/* Connector line */}
              {i < STEPS.length - 1 && <div className={styles.connector} />}

              <div className={styles.stepNumber}>
                <span className={styles.numText}>{step.num}</span>
              </div>

              <div className={styles.stepContent}>
                <div className={styles.stepIcon}>{step.icon}</div>
                <h3 className={`heading-sm ${styles.stepTitle}`}>{step.title}</h3>
                <p className={`text-muted ${styles.stepDesc}`}>{step.desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Dashboard mock preview */}
        <div className={styles.dashPreview}>
          <div className={styles.dashHeader}>
            <div className={styles.dashDots}>
              <span style={{ background: "#ef4444" }} />
              <span style={{ background: "#f59e0b" }} />
              <span style={{ background: "#22c55e" }} />
            </div>
            <span className={styles.dashTitle}>🎖️ Military Pass — Operator Studio</span>
            <div className={styles.dashBadges}>
              <span className="badge badge-live">LIVE</span>
              <span className="badge badge-ai">AI SYNC</span>
            </div>
          </div>

          <div className={styles.dashBody}>
            <div className={styles.dashSidebar}>
              {["Realtime", "Characters", "Integrations", "Settings"].map((tab) => (
                <div key={tab} className={`${styles.sideTab} ${tab === "Realtime" ? styles.activeTab : ""}`}>
                  {tab}
                </div>
              ))}
            </div>

            <div className={styles.dashMain}>
              <div className={styles.dashPanel}>
                <div className={styles.dashPanelLabel}>🔒 Private Camera Feed</div>
                <div className={styles.dashPanelScreen}>
                  <div className={styles.dashScanLine} />
                  <div className={styles.dashFaceBox} />
                </div>
              </div>

              <div className={styles.dashArrow}>→</div>

              <div className={styles.dashPanel}>
                <div className={styles.dashPanelLabel} style={{ color: "var(--accent-cyan)" }}>
                  📡 What Others See
                </div>
                <div className={`${styles.dashPanelScreen} ${styles.dashPanelActive}`}>
                  <div className={styles.dashScanLine} style={{ animationDelay: "1s" }} />
                  <div className={`${styles.dashFaceBox} ${styles.dashFaceActive}`} />
                </div>
              </div>
            </div>

            <div className={styles.dashStatus}>
              <div className={styles.dashStatusItem}>
                <span className="badge badge-live" style={{ fontSize: "0.6rem" }}>LIVE</span>
                Virtual Camera Active
              </div>
              <div className={styles.dashStatusItem}>
                <span className="badge badge-voice" style={{ fontSize: "0.6rem" }}>VOICE</span>
                Commander Preset
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
