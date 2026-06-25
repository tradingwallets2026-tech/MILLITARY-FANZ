import styles from "./TestimonialsSection.module.css";

const TESTIMONIALS = [
  {
    initials: "A",
    name: "Ayo Streams",
    platform: "TikTok",
    platformIcon: "🎵",
    followers: "128K",
    quote:
      "Military Pass gave my livestream identity a professional, tactical edge. The face swap is flawless — my audience had no idea.",
    color: "var(--accent-purple)",
  },
  {
    initials: "M",
    name: "Maya VT",
    platform: "YouTube",
    platformIcon: "▶️",
    followers: "74K",
    quote:
      "The realtime face + voice combo made my VTuber workflow seamless. No more expensive capture cards — Military Pass just works.",
    color: "var(--accent-cyan)",
  },
  {
    initials: "K",
    name: "Kofi Live",
    platform: "Twitch",
    platformIcon: "🎮",
    followers: "52K",
    quote:
      "Best privacy-preserving creator tool I have ever used for live demos. The Commander voice preset is genuinely impressive.",
    color: "var(--accent-green)",
  },
];

export default function TestimonialsSection() {
  return (
    <section className={`section ${styles.section}`} id="testimonials">
      <div className="container">
        <div className={styles.header}>
          <p className="section-label">Testimonials</p>
          <h2 className="section-title">
            Trusted by <span className="text-gradient">operator communities</span>
          </h2>
        </div>

        <div className={styles.grid}>
          {TESTIMONIALS.map((t) => (
            <div key={t.name} className={`card ${styles.card}`}>
              <div className={styles.quoteIcon}>"</div>
              <p className={styles.quote}>{t.quote}</p>

              <div className={styles.footer}>
                <div
                  className={styles.avatar}
                  style={{ background: `${t.color}22`, border: `1px solid ${t.color}44` }}
                >
                  <span style={{ color: t.color }}>{t.initials}</span>
                </div>
                <div className={styles.info}>
                  <div className={styles.name}>{t.name}</div>
                  <div className={styles.meta}>
                    <span>{t.platformIcon} {t.platform}</span>
                    <span className={styles.dot}>·</span>
                    <span style={{ color: t.color }}>{t.followers} followers</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
