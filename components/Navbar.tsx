"use client";
import { useState, useEffect } from "react";
import styles from "./Navbar.module.css";

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <nav className={`${styles.nav} ${scrolled ? styles.scrolled : ""}`}>
      <div className={`container ${styles.inner}`}>
        {/* Logo */}
        <a href="/" className={styles.logo}>
          <span className={styles.logoIcon}>🎖️</span>
          <span className={styles.logoText}>
            Military<span className={styles.logoAccent}>Pass</span>
          </span>
        </a>

        {/* Desktop Nav Links */}
        <ul className={styles.links}>
          {["Home", "Features", "Pricing", "FAQ", "Docs"].map((item) => (
            <li key={item}>
              <a href={`#${item.toLowerCase()}`} className={styles.link}>
                {item}
              </a>
            </li>
          ))}
        </ul>

        {/* CTA Buttons */}
        <div className={styles.actions}>
          <a href="/auth/login" className={`btn btn-secondary ${styles.loginBtn}`}>
            Log In
          </a>
          <a href="/auth/signup" className={`btn btn-primary ${styles.startBtn}`}>
            Get Started
          </a>
          <a href="#demo" className={`btn btn-ghost ${styles.demoBtn}`}>
            <span className="badge badge-live" style={{ padding: "2px 8px", fontSize: "0.65rem" }}>LIVE</span>
            Demo
          </a>
        </div>

        {/* Mobile Burger */}
        <button
          className={`${styles.burger} ${menuOpen ? styles.burgerOpen : ""}`}
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Toggle menu"
        >
          <span /><span /><span />
        </button>
      </div>

      {/* Mobile Menu */}
      {menuOpen && (
        <div className={styles.mobileMenu}>
          {["Home", "Features", "Pricing", "FAQ", "Docs"].map((item) => (
            <a
              key={item}
              href={`#${item.toLowerCase()}`}
              className={styles.mobileLink}
              onClick={() => setMenuOpen(false)}
            >
              {item}
            </a>
          ))}
          <div className={styles.mobileCtas}>
            <a href="/auth/login" className="btn btn-secondary">Log In</a>
            <a href="/auth/signup" className="btn btn-primary">Get Started</a>
          </div>
        </div>
      )}
    </nav>
  );
}
