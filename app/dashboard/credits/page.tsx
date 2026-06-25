import { redirect } from "next/navigation";
import { getUser, getUserCredits, getCreditTransactions, getPaymentHistory } from "@/lib/actions";
import styles from "./credits.module.css";

const PLANS = [
  { id: "recruit",    name: "Recruit",    icon: "🪖", credits: 300,   price: "₦16,000",  minutes: "~50",   popular: false },
  { id: "operative",  name: "Operative",  icon: "🔫", credits: 1000,  price: "₦50,999",  minutes: "~167",  popular: false },
  { id: "specialist", name: "Specialist", icon: "⚔️", credits: 2000,  price: "₦100,000", minutes: "~333",  popular: true  },
  { id: "commander",  name: "Commander",  icon: "🎖️", credits: 5000,  price: "₦259,999", minutes: "~833",  popular: false },
  { id: "ghost",      name: "Ghost Unit", icon: "👻", credits: 12000, price: "₦599,999", minutes: "~2,000",popular: false },
];

export default async function CreditsPage() {
  const user = await getUser();
  if (!user) redirect("/auth/login");

  const [credits, transactions, payments] = await Promise.all([
    getUserCredits(user.id),
    getCreditTransactions(user.id, 10),
    getPaymentHistory(user.id),
  ]);

  const balance = credits?.balance ?? 50;
  const minutesLeft = Math.floor(balance / 6);

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Credit <span className="text-gradient">Management</span></h1>
        <p className={styles.sub}>6 credits per minute of active transformation</p>
      </div>

      {/* Balance Card */}
      <div className={styles.balanceRow}>
        <div className={`card ${styles.balanceCard}`}>
          <p className={styles.balanceLabel}>Current Balance</p>
          <div className={styles.balanceNum}>{balance.toLocaleString()}</div>
          <p className={styles.balanceSub}>≈ {minutesLeft} minutes of transformation remaining</p>
          <div className={styles.balanceStats}>
            <div className={styles.stat}>
              <span className={styles.statVal}>{(credits?.total_purchased ?? 50).toLocaleString()}</span>
              <span className={styles.statKey}>Purchased</span>
            </div>
            <div className={styles.stat}>
              <span className={styles.statVal}>{(credits?.total_used ?? 0).toLocaleString()}</span>
              <span className={styles.statKey}>Used</span>
            </div>
            <div className={styles.stat}>
              <span className={styles.statVal} style={{ color: "var(--accent-cyan)" }}>6</span>
              <span className={styles.statKey}>Per Minute</span>
            </div>
          </div>
        </div>

        {/* Recent Transactions */}
        <div className={`card ${styles.txCard}`}>
          <p className={styles.txTitle}>Recent Transactions</p>
          {transactions.length === 0 ? (
            <p className={styles.txEmpty}>No transactions yet.</p>
          ) : (
            <div className={styles.txList}>
              {transactions.map((tx: {
                id: string;
                tx_type: string;
                amount: number;
                balance_after: number;
                description?: string;
                created_at: string;
              }) => (
                <div key={tx.id} className={styles.txRow}>
                  <div className={styles.txIcon}>
                    {tx.tx_type === "purchase" ? "💳" :
                     tx.tx_type === "bonus"    ? "🎁" :
                     tx.tx_type === "deduction"? "⚡" : "↩️"}
                  </div>
                  <div className={styles.txInfo}>
                    <span className={styles.txDesc}>{tx.description ?? tx.tx_type}</span>
                    <span className={styles.txDate}>
                      {new Date(tx.created_at).toLocaleDateString("en-NG", { day: "2-digit", month: "short" })}
                    </span>
                  </div>
                  <span
                    className={styles.txAmount}
                    style={{ color: tx.amount > 0 ? "var(--accent-green)" : "var(--accent-red)" }}
                  >
                    {tx.amount > 0 ? "+" : ""}{tx.amount}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Plans Grid */}
      <div className={styles.plansHeader}>
        <h2 className={styles.plansTitle}>Top Up Credits</h2>
        <p className={styles.plansSub}>One-time purchase. Credits never expire. Secure via Paystack.</p>
      </div>

      <div className={styles.plansGrid}>
        {PLANS.map((plan) => (
          <div key={plan.id} className={`${styles.planCard} ${plan.popular ? styles.planPopular : ""}`}>
            {plan.popular && <div className={styles.popularBadge}>⭐ Most Popular</div>}
            <div className={styles.planIcon}>{plan.icon}</div>
            <h3 className={styles.planName}>{plan.name}</h3>
            <div className={styles.planCredits}>{plan.credits.toLocaleString()}</div>
            <div className={styles.planUnit}>credits</div>
            <div className={styles.planPrice}>{plan.price}</div>
            <div className={styles.planMinutes}>{plan.minutes} minutes</div>
            <PurchaseButton planId={plan.id} />
          </div>
        ))}
      </div>

      {/* Payment History */}
      {payments.length > 0 && (
        <div className={`card ${styles.historyCard}`}>
          <p className={styles.txTitle}>Payment History</p>
          <table className={styles.historyTable}>
            <thead>
              <tr>
                <th>Date</th><th>Plan</th><th>Credits</th><th>Amount</th><th>Status</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((p: {
                id: string;
                created_at: string;
                plan_name?: string;
                credits_granted: number;
                amount_kobo: number;
                status: string;
              }) => (
                <tr key={p.id}>
                  <td>{new Date(p.created_at).toLocaleDateString("en-NG")}</td>
                  <td>{p.plan_name ?? "—"}</td>
                  <td style={{ color: "var(--accent-cyan)" }}>{p.credits_granted.toLocaleString()}</td>
                  <td>₦{(p.amount_kobo / 100).toLocaleString()}</td>
                  <td>
                    <span className={`badge ${p.status === "success" ? "badge-live" : "badge-ai"}`}
                      style={{ fontSize: "0.6rem" }}>
                      {p.status.toUpperCase()}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* Client component for purchase button */
function PurchaseButton({ planId }: { planId: string }) {
  return (
    <form action={`/api/credits/purchase`} method="POST">
      <input type="hidden" name="planId" value={planId} />
      <a
        href={`/pricing#${planId}`}
        className="btn btn-primary"
        style={{ width: "100%", justifyContent: "center", fontSize: "0.85rem", marginTop: "16px" }}
      >
        Purchase →
      </a>
    </form>
  );
}
