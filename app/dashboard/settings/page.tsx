import { redirect } from "next/navigation";
import { getUser, getUserProfile } from "@/lib/actions";
import SettingsForm from "./SettingsForm";
import styles from "./settings.module.css";

export default async function SettingsPage() {
  const user = await getUser();
  if (!user) redirect("/auth/login");

  const profile = await getUserProfile(user.id);

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Account <span className="text-gradient">Settings</span></h1>
        <p className={styles.sub}>Manage your operator profile and preferences.</p>
      </div>

      <div className={styles.layout}>
        {/* Profile Settings */}
        <div className={`card ${styles.section}`}>
          <h2 className={styles.sectionTitle}>👤 Operator Profile</h2>
          <SettingsForm user={user} profile={profile} />
        </div>

        {/* Account Info */}
        <div className={styles.sidebar}>
          <div className={`card ${styles.infoCard}`}>
            <h2 className={styles.sectionTitle}>🔐 Account Security</h2>
            <div className={styles.infoItem}>
              <span className={styles.infoKey}>Email</span>
              <span className={styles.infoVal}>{user.email}</span>
            </div>
            <div className={styles.infoItem}>
              <span className={styles.infoKey}>Auth Provider</span>
              <span className={styles.infoVal}>Email / Password</span>
            </div>
            <div className={styles.infoItem}>
              <span className={styles.infoKey}>Account ID</span>
              <span className={styles.infoVal} style={{ fontFamily: "var(--font-mono)", fontSize: "0.72rem" }}>
                {user.id.slice(0, 16)}...
              </span>
            </div>
            <div className={styles.infoItem}>
              <span className={styles.infoKey}>Member Since</span>
              <span className={styles.infoVal}>
                {user.created_at ? new Date(user.created_at).toLocaleDateString("en-NG", { month: "long", year: "numeric" }) : "—"}
              </span>
            </div>
            <a href="/auth/reset-password" className="btn btn-ghost" style={{ marginTop: "16px", fontSize: "0.85rem" }}>
              🔑 Change Password
            </a>
          </div>

          <div className={`card ${styles.infoCard}`}>
            <h2 className={styles.sectionTitle}>⚠️ Danger Zone</h2>
            <p style={{ fontSize: "0.88rem", color: "var(--text-muted)", marginBottom: "16px" }}>
              Permanently delete your account and all associated data. This cannot be undone.
            </p>
            <button className="btn btn-ghost" style={{ color: "var(--accent-red)", borderColor: "rgba(239,68,68,0.3)", fontSize: "0.85rem" }}>
              🗑️ Delete Account
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
