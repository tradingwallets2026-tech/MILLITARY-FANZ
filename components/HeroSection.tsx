"use client";
import { useEffect, useRef } from "react";
import styles from "./HeroSection.module.css";

const PLATFORMS = [
  { name: "WhatsApp", emoji: "💬" },
  { name: "TikTok", emoji: "🎵" },
  { name: "Facebook", emoji: "👤" },
  { name: "Zoom", emoji: "📹" },
  { name: "Google Meet", emoji: "🎯" },
  { name: "OBS Studio", emoji: "📡" },
  { name: "YouTube", emoji: "▶️" },
  { name: "Twitch", emoji: "🎮" },
];

export default function HeroSection() {
  const scanRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let frame = 0;
    const interval = setInterval(() => {
      frame++;
      if (scanRef.current) {
        scanRef.current.style.top = `${(frame % 100)}%`;
      }
    }, 30);
    return () => clearInterval(interval);
  }, []);

  return (
    <section className={styles.hero} id="home">
      {/* Background glow orbs */}
      <div className={`glow-orb glow-orb-purple ${styles.orb1}`} />
      <div className={`glow-orb glow-orb-cyan ${styles.orb2}`} />
      <div className={`grid-bg ${styles.gridBg}`} />

      <div className="container">
        <div className={styles.layout}>
          {/* ── Left Column ── */}
          <div className={styles.left}>
            <div className={`badge badge-ai ${styles.platformBadge}`}>
              ✦ Futuristic Realtime AI Platform
            </div>

            <h1 className={`heading-xl ${styles.headline}`}>
              Transform
              <br />
              Your Face &amp;
              <br />
              <span className="text-gradient">Voice In Real</span>
              <br />
              <span className="text-gradient">Time With AI</span>
            </h1>

            <p className={styles.subheadline}>
              Military-grade AI-powered identity transformation for streamers,
              operators and virtual personalities.
            </p>

            <div className={styles.ctaRow}>
              <a href="/auth/signup" className="btn btn-primary">
                🚀 Start Operating
              </a>
              <a href="#demo" className="btn btn-secondary">
                ▶ Watch Demo
              </a>
            </div>

            {/* Quick Feature Chips */}
            <div className={styles.chips}>
              <div className={styles.chip}>
                <span className={styles.chipDot} style={{ background: "var(--accent-cyan)" }} />
                Realtime Engine
                <span className={styles.chipSub}>Low-latency face &amp; voice sync</span>
              </div>
              <div className={styles.chip}>
                <span className={styles.chipDot} style={{ background: "var(--accent-purple)" }} />
                Operator Mode
                <span className={styles.chipSub}>Built for streaming workflows</span>
              </div>
              <div className={styles.chip}>
                <span className={styles.chipDot} style={{ background: "var(--accent-green)" }} />
                Privacy Layer
                <span className={styles.chipSub}>Identity masking by design</span>
              </div>
            </div>
          </div>

          {/* ── Right Column — Live Preview ── */}
          <div className={styles.right}>
            <div className={styles.previewCard}>
              <div className={styles.previewHeader}>
                <span className={styles.previewTitle}>Transformation Engine</span>
                <span className={`badge badge-live`}>LIVE</span>
              </div>

              <div className={styles.panels}>
                {/* Camera Input Panel */}
                <div className={styles.panel}>
                  <div className={styles.panelLabel}>Camera Input</div>
                  <div className={`${styles.panelScreen} ${styles.panelInput}`}>
                    <div className={styles.faceOutline}>
                      <div className={styles.faceCircle} />
                      <div className={styles.faceLine} />
                      <div className={styles.faceEyes}>
                        <span /><span />
                      </div>
                    </div>
                    <div className={styles.scanLine} ref={scanRef} />
                    <div className={styles.panelCorner} data-pos="tl" />
                    <div className={styles.panelCorner} data-pos="tr" />
                    <div className={styles.panelCorner} data-pos="bl" />
                    <div className={styles.panelCorner} data-pos="br" />
                  </div>
                </div>

                <div className={styles.arrow}>→</div>

                {/* Live Output Panel */}
                <div className={styles.panel}>
                  <div className={styles.panelLabel} style={{ color: "var(--accent-cyan)" }}>
                    Live Output
                  </div>
                  <div className={`${styles.panelScreen} ${styles.panelOutput}`}>
                    <div className={styles.faceOutline}>
                      <div className={`${styles.faceCircle} ${styles.faceCircleAlt}`} />
                      <div className={styles.faceLine} />
                      <div className={styles.faceEyes}>
                        <span style={{ background: "var(--accent-cyan)" }} />
                        <span style={{ background: "var(--accent-cyan)" }} />
                      </div>
                    </div>
                    <div className={styles.scanLine} style={{ animationDelay: "1.5s" }} />
                    <div className={styles.panelCorner} data-pos="tl" style={{ borderColor: "var(--accent-cyan)" }} />
                    <div className={styles.panelCorner} data-pos="tr" style={{ borderColor: "var(--accent-cyan)" }} />
                    <div className={styles.panelCorner} data-pos="bl" style={{ borderColor: "var(--accent-cyan)" }} />
                    <div className={styles.panelCorner} data-pos="br" style={{ borderColor: "var(--accent-cyan)" }} />
                  </div>
                </div>
              </div>

              <div className={styles.previewStatus}>
                <p className={styles.statusText}>
                  🔵 Holographic AI scan active. Realtime output locked for streaming.
                </p>
                <div className={styles.statusBadges}>
                  <span className="badge badge-live">LIVE</span>
                  <span className="badge badge-ai">AI SYNC</span>
                  <span className="badge badge-voice">VOICE ON</span>
                  <span className="badge badge-operator">OPERATOR</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Platform Logos Strip ── */}
        <div className={styles.platformStrip}>
          <p className={styles.platformLabel}>Works with your favorite platforms</p>
          <div className={styles.logoScroll}>
            <div className={styles.logoTrack}>
              {[...PLATFORMS, ...PLATFORMS].map((p, i) => (
                <div key={i} className={styles.logoItem}>
                  <span className={styles.logoEmoji}>{p.emoji}</span>
                  <span className={styles.logoName}>{p.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
