import styles from "./FooterSection.module.css";

const NAV_LINKS = [
  { label: "Home", href: "#home" },
  { label: "Features", href: "#features" },
  { label: "Pricing", href: "#pricing" },
  { label: "FAQ", href: "#faq" },
  { label: "Docs", href: "/docs" },
];
const LEGAL_LINKS = [
  { label: "About", href: "/about" },
  { label: "Contact", href: "/contact" },
  { label: "Terms", href: "/terms" },
  { label: "Privacy", href: "/privacy" },
  { label: "Refund Policy", href: "/refund" },
];

export default function FooterSection() {
  return (
    <footer className={styles.footer}>
      {/* Final CTA */}
      <section className={`section ${styles.cta}`}>
        <div className={`glow-orb glow-orb-purple ${styles.ctaOrb}`} />
        <div className="container">
          <div className={styles.ctaBox}>
            <h2 className={styles.ctaTitle}>
              Start Your First <span className="text-gradient">Transformation</span> Today
            </h2>
            <p className={styles.ctaSub}>
              No setup required. Works instantly in your browser. Zero GPU needed.
            </p>
            <a href="/auth/signup" className={`btn btn-primary ${styles.ctaBtn}`}>
              🚀 Get Started Free
            </a>
          </div>
        </div>
      </section>

      {/* Footer body */}
      <div className={styles.body}>
        <div className="container">
          <div className={styles.inner}>
            {/* Brand */}
            <div className={styles.brand}>
              <a href="/" className={styles.logo}>
                <span>🎖️</span>
                <span className={styles.logoText}>
                  Military<span style={{ color: "var(--accent-cyan)" }}>Pass</span>
                </span>
              </a>
              <p className={styles.tagline}>
                Real-Time AI Face &amp; Voice Transformation.
                <br />
                Transform. Operate. Dominate.
              </p>
              <div className={styles.socials}>
                <a href="#" className={styles.social} aria-label="Twitter">𝕏</a>
                <a href="#" className={styles.social} aria-label="TikTok">🎵</a>
                <a href="#" className={styles.social} aria-label="YouTube">▶</a>
                <a href="#" className={styles.social} aria-label="Discord">💬</a>
              </div>
            </div>

            {/* Nav links */}
            <div className={styles.col}>
              <h4 className={styles.colTitle}>Platform</h4>
              <ul className={styles.colLinks}>
                {NAV_LINKS.map((l) => (
                  <li key={l.label}>
                    <a href={l.href} className={styles.colLink}>{l.label}</a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Legal links */}
            <div className={styles.col}>
              <h4 className={styles.colTitle}>Company</h4>
              <ul className={styles.colLinks}>
                {LEGAL_LINKS.map((l) => (
                  <li key={l.label}>
                    <a href={l.href} className={styles.colLink}>{l.label}</a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Status */}
            <div className={styles.col}>
              <h4 className={styles.colTitle}>System Status</h4>
              <div className={styles.statusItem}>
                <span className="badge badge-live" style={{ fontSize: "0.6rem" }}>LIVE</span>
                AI Inference — Operational
              </div>
              <div className={styles.statusItem}>
                <span className="badge badge-ai" style={{ fontSize: "0.6rem" }}>OK</span>
                Voice Engine — Online
              </div>
              <div className={styles.statusItem}>
                <span className="badge badge-ai" style={{ fontSize: "0.6rem" }}>OK</span>
                Streaming API — Online
              </div>
            </div>
          </div>

          <div className={styles.bottom}>
            <p className={styles.copy}>© 2026 Military Pass. All rights reserved.</p>
            <p className={styles.poweredBy}>
              Powered by{" "}
              <span style={{ color: "var(--accent-cyan)" }}>InsightFace</span>
              {" · "}
              <span style={{ color: "var(--accent-purple)" }}>RVC v2</span>
              {" · "}
              <span style={{ color: "var(--accent-green)" }}>Modal.com GPU</span>
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
