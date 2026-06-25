"use client";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { signOut } from "@/lib/actions";
import styles from "@/app/dashboard/dashboard.module.css";

const NAV = [
  { section: "Operations", links: [
    { href: "/dashboard",         icon: "🏠", label: "Overview" },
    { href: "/studio",            icon: "🎬", label: "Live Studio" },
    { href: "/dashboard/avatars", icon: "👤", label: "Avatars" },
    { href: "/dashboard/voices",  icon: "🎙️", label: "Voice Profiles" },
    { href: "/dashboard/sessions",icon: "📊", label: "Sessions" },
  ]},
  { section: "Account", links: [
    { href: "/dashboard/credits", icon: "💎", label: "Credits" },
    { href: "/pricing",           icon: "🏷️", label: "Buy Credits" },
    { href: "/dashboard/settings",icon: "⚙️", label: "Settings" },
  ]},
];

export default function DashboardSidebar({ user }: { user: { email?: string; user_metadata?: { username?: string; full_name?: string } } }) {
  const pathname = usePathname();
  const name = user.user_metadata?.username || user.user_metadata?.full_name || user.email?.split("@")[0] || "Operator";
  const initial = name.charAt(0).toUpperCase();

  return (
    <aside className={styles.sidebar}>
      <Link href="/" className={styles.sidebarLogo}>
        <span style={{ fontSize: "1.2rem" }}>🎖️</span>
        <span className={styles.sidebarLogoText}>
          Military<span style={{ color: "var(--accent-cyan)" }}>Pass</span>
        </span>
      </Link>

      <nav className={styles.sidebarNav}>
        {NAV.map((section) => (
          <div key={section.section}>
            <div className={styles.sidebarSection}>{section.section}</div>
            {section.links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`${styles.sidebarLink} ${pathname === link.href ? styles.sidebarLinkActive : ""}`}
              >
                <span className={styles.sidebarIcon}>{link.icon}</span>
                {link.label}
              </Link>
            ))}
          </div>
        ))}
      </nav>

      <div className={styles.sidebarBottom}>
        <div className={styles.sidebarUser}>
          <div className={styles.sidebarAvatar}>{initial}</div>
          <div>
            <div className={styles.sidebarUserName}>{name}</div>
            <div className={styles.sidebarUserEmail}>{user.email}</div>
          </div>
        </div>
        <form action={signOut}>
          <button type="submit" className={`btn btn-ghost ${styles.sidebarLink}`} style={{ width: "100%", borderRadius: "8px" }}>
            <span className={styles.sidebarIcon}>🚪</span> Sign Out
          </button>
        </form>
      </div>
    </aside>
  );
}
