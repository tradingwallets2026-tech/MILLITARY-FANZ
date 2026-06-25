"use client";
import styles from "./admin.module.css";

interface AdminStats {
  total_users?: number;
  new_users_today?: number;
  active_users_7d?: number;
  total_revenue_kobo?: number;
  revenue_today_kobo?: number;
  total_sessions?: number;
  sessions_today?: number;
  total_credits_sold?: number;
  avg_session_minutes?: number;
}

interface RecentUser {
  id: string; username: string;
  display_name: string; created_at: string;
}

interface RecentPayment {
  id: string; user_id: string; plan_name: string;
  amount_kobo: number; currency: string;
  status: string; created_at: string;
}

interface AdminClientProps {
  userStats:      AdminStats | null;
  revenueStats:   AdminStats | null;
  sessionStats:   AdminStats | null;
  recentUsers:    RecentUser[];
  recentPayments: RecentPayment[];
}

function fmt(n: number | undefined, prefix = "") {
  if (n === undefined || n === null) return "—";
  return `${prefix}${n.toLocaleString()}`;
}

function fmtNGN(kobo: number | undefined) {
  if (!kobo) return "₦0";
  return `₦${(kobo / 100).toLocaleString("en-NG", { minimumFractionDigits: 0 })}`;
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "2-digit", month: "short", year: "numeric",
  });
}

export default function AdminClient({
  userStats, revenueStats, sessionStats, recentUsers, recentPayments,
}: AdminClientProps) {
  const stats = { ...userStats, ...revenueStats, ...sessionStats };

  const KPI_CARDS = [
    { label: "Total Users",        value: fmt(stats.total_users),            icon: "👤", color: "cyan"   },
    { label: "New Today",          value: fmt(stats.new_users_today),         icon: "📈", color: "green"  },
    { label: "Active (7d)",        value: fmt(stats.active_users_7d),         icon: "⚡", color: "amber"  },
    { label: "Total Revenue",      value: fmtNGN(stats.total_revenue_kobo),   icon: "💰", color: "green"  },
    { label: "Revenue Today",      value: fmtNGN(stats.revenue_today_kobo),   icon: "💳", color: "cyan"   },
    { label: "Total Sessions",     value: fmt(stats.total_sessions),          icon: "🎬", color: "purple" },
    { label: "Sessions Today",     value: fmt(stats.sessions_today),          icon: "🔴", color: "red"    },
    { label: "Credits Sold",       value: fmt(stats.total_credits_sold),      icon: "⚡", color: "amber"  },
    { label: "Avg Session",        value: `${stats.avg_session_minutes ?? 0}m`, icon: "⏱", color: "cyan" },
  ];

  return (
    <div className={styles.root}>
      {/* Header */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>🛡️ COMMAND CENTER</h1>
          <p className={styles.sub}>Military Pass — Admin Intelligence Panel</p>
        </div>
        <div className={styles.adminBadge}>ADMIN ACCESS</div>
      </div>

      {/* KPI Grid */}
      <div className={styles.kpiGrid}>
        {KPI_CARDS.map((c) => (
          <div key={c.label} className={`${styles.kpiCard} ${styles[`kpi_${c.color}`]}`}>
            <span className={styles.kpiIcon}>{c.icon}</span>
            <div className={styles.kpiVal}>{c.value}</div>
            <div className={styles.kpiLabel}>{c.label}</div>
          </div>
        ))}
      </div>

      {/* Tables row */}
      <div className={styles.tablesRow}>
        {/* Recent Users */}
        <div className={styles.tableCard}>
          <h2 className={styles.tableTitle}>👤 Recent Operators</h2>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Username</th>
                <th>Display Name</th>
                <th>Joined</th>
              </tr>
            </thead>
            <tbody>
              {recentUsers.length === 0 && (
                <tr><td colSpan={3} className={styles.empty}>No users yet</td></tr>
              )}
              {recentUsers.map((u) => (
                <tr key={u.id}>
                  <td className={styles.mono}>{u.username || "—"}</td>
                  <td>{u.display_name || "—"}</td>
                  <td className={styles.mono}>{fmtDate(u.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Recent Payments */}
        <div className={styles.tableCard}>
          <h2 className={styles.tableTitle}>💰 Recent Payments</h2>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Plan</th>
                <th>Amount</th>
                <th>Currency</th>
                <th>Status</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {recentPayments.length === 0 && (
                <tr><td colSpan={5} className={styles.empty}>No payments yet</td></tr>
              )}
              {recentPayments.map((p) => (
                <tr key={p.id}>
                  <td>{p.plan_name}</td>
                  <td className={styles.mono}>{fmtNGN(p.amount_kobo)}</td>
                  <td className={styles.mono}>{p.currency?.toUpperCase() ?? "NGN"}</td>
                  <td>
                    <span className={`${styles.pill} ${p.status === "success" ? styles.pillGreen : styles.pillAmber}`}>
                      {p.status}
                    </span>
                  </td>
                  <td className={styles.mono}>{fmtDate(p.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
