import { redirect } from "next/navigation";
import {
  getUser,
  getUserCredits,
  getUserAvatars,
  getUserVoiceProfiles,
  getRecentSessions,
} from "@/lib/actions";
import CreditWidget from "@/components/dashboard/CreditWidget";
import AvatarGallery from "@/components/dashboard/AvatarGallery";
import VoiceSelector from "@/components/dashboard/VoiceSelector";
import RecentSessions from "@/components/dashboard/RecentSessions";
import QuickStart from "@/components/dashboard/QuickStart";
import styles from "./dashboard.module.css";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ welcome?: string }>;
}) {
  const user = await getUser();
  if (!user) redirect("/auth/login");

  const params = await searchParams;
  const isWelcome = params?.welcome === "1";

  // Parallel data fetch
  const [credits, avatars, voices, sessions] = await Promise.all([
    getUserCredits(user.id),
    getUserAvatars(user.id),
    getUserVoiceProfiles(user.id),
    getRecentSessions(user.id),
  ]);

  const displayName =
    user.user_metadata?.username ||
    user.user_metadata?.full_name ||
    user.email?.split("@")[0] ||
    "Operator";

  return (
    <div className={styles.page}>
      {/* Welcome Banner */}
      {isWelcome && (
        <div className={styles.welcomeBanner}>
          🎖️ Welcome to Military Pass, <strong>{displayName}</strong>!
          You&apos;ve received{" "}
          <span style={{ color: "var(--accent-cyan)" }}>50 free credits</span> to get started.
        </div>
      )}

      {/* Header */}
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>
            Operator <span className="text-gradient">Command Center</span>
          </h1>
          <p className={styles.pageSubtitle}>
            Welcome back, <span style={{ color: "var(--accent-cyan)" }}>{displayName}</span>
          </p>
        </div>
        <a href="/studio" className={`btn btn-primary ${styles.launchBtn}`}>
          ▶ Launch Studio
        </a>
      </div>

      {/* Top Row */}
      <div className={styles.topRow}>
        <CreditWidget credits={credits} />
        <QuickStart />
      </div>

      {/* Content Grid */}
      <div className={styles.contentGrid}>
        <div className={styles.leftCol}>
          <AvatarGallery avatars={avatars} />
          <VoiceSelector voices={voices} />
        </div>
        <div className={styles.rightCol}>
          <RecentSessions sessions={sessions} />
          <div className={styles.statsRow}>
            <div className="card">
              <p className="font-mono" style={{ fontSize: "0.72rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "8px" }}>Total Sessions</p>
              <p style={{ fontFamily: "var(--font-heading)", fontSize: "2.5rem", fontWeight: 700, color: "var(--accent-cyan)" }}>
                {sessions.length}
              </p>
            </div>
            <div className="card">
              <p className="font-mono" style={{ fontSize: "0.72rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "8px" }}>Credits Remaining</p>
              <p style={{ fontFamily: "var(--font-heading)", fontSize: "2.5rem", fontWeight: 700, color: "var(--accent-green)" }}>
                {credits?.balance ?? 50}
              </p>
            </div>
            <div className="card">
              <p className="font-mono" style={{ fontSize: "0.72rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "8px" }}>Avatars Saved</p>
              <p style={{ fontFamily: "var(--font-heading)", fontSize: "2.5rem", fontWeight: 700, color: "var(--accent-purple)" }}>
                {avatars.filter((a: { is_preset: boolean }) => !a.is_preset).length}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
