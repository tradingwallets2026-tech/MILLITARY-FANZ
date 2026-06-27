"use client";
import { useState } from "react";
import styles from "./FAQSection.module.css";

const FAQS = [
  {
    q: "What is Military Pass?",
    a: "Military Pass is a browser-based, cloud-powered AI platform that transforms your face and voice in real-time during livestreams, calls, and recordings. No software installation required — it runs entirely in your browser using cloud GPU inference.",
  },
  {
    q: "Is voice changing truly realtime?",
    a: "Yes. Our RVC v2 voice conversion engine processes audio chunks with sub-200ms latency. The output is near-instantaneous and suitable for live conversations, streaming, and calls.",
  },
  {
    q: "Can I stream with OBS Studio?",
    a: "Absolutely. Military Pass outputs a virtual camera stream that OBS can capture via Browser Source. You can then stream to TikTok, YouTube, Twitch, or any RTMP destination directly from OBS.",
  },
  {
    q: "Does it work on mobile?",
    a: "The landing page and dashboard are fully mobile-responsive. The live transformation studio is optimized for desktop and laptop browsers, as it requires stable WebRTC camera access and consistent bandwidth for cloud inference.",
  },
  {
    q: "How many credits per minute?",
    a: "Active transformation costs 6 credits per minute. Credits are only consumed while the AI transformation engine is running. You can pause at any time to stop credit usage.",
  },
  {
    q: "Is my identity and camera feed private?",
    a: "Yes. Camera frames are sent over encrypted HTTPS to our cloud GPU worker, processed, and immediately discarded. We never store your raw camera footage. Your privacy is protected by design.",
  },
  {
    q: "Do credits expire?",
    a: "No. Credits never expire. Purchase at any time and use them at your own pace. Your credit balance is stored securely in your account indefinitely.",
  },
  {
    q: "What AI models power the face swap?",
    a: "We use InsightFace's inswapper_128 model for face swapping, enhanced with GFPGAN v1.4 for face restoration and quality enhancement. Voice conversion uses RVC v2 (Retrieval-based Voice Conversion).",
  },
];

export default function FAQSection() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <section className={`section ${styles.section}`} id="faq">
      <div className="container">
        <div className={styles.layout}>
          <div className={styles.left}>
            <p className="section-label">FAQ</p>
            <h2 className="section-title">
              Answers for <span className="text-gradient">operators</span> &amp; streaming teams
            </h2>
            <p className="section-subtitle">
              Everything you need to know before your first deployment.
            </p>
            <div className={styles.support}>
              <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>
                Still have questions?
              </p>
              <a href="mailto:support@militarypass.com" className="btn btn-ghost" style={{ marginTop: "12px" }}>
                📧 Contact Support
              </a>
              <button
                onClick={() => {
                  // Intentionally call an undefined function to trigger an uncaught ReferenceError
                  // for testing Sentry integration in production.
                  try {
                    // @ts-ignore
                    myUndefinedFunction();
                  } catch (err) {
                    throw err;
                  }
                }}
                className="btn btn-ghost"
                style={{ marginTop: "12px", border: "1px dashed var(--accent-red)", color: "var(--accent-red)" }}
              >
                🚨 Test Sentry Integration
              </button>
            </div>
          </div>

          <div className={styles.right}>
            {FAQS.map((faq, i) => (
              <div key={i} className={`${styles.item} ${open === i ? styles.itemOpen : ""}`}>
                <button
                  className={styles.question}
                  onClick={() => setOpen(open === i ? null : i)}
                  aria-expanded={open === i}
                >
                  <span>{faq.q}</span>
                  <span className={styles.chevron}>{open === i ? "−" : "+"}</span>
                </button>
                {open === i && (
                  <div className={styles.answer}>
                    <p>{faq.a}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
