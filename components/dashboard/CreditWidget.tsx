import styles from "./widgets.module.css";
import Link from "next/link";

interface Credits {
  balance: number;
  total_purchased: number;
  total_used: number;
}

const PLANS = [
  { name: "Recruit",    credits: 300,   price: "₦16,000" },
  { name: "Operative",  credits: 1000,  price: "₦50,999" },
  { name: "Specialist", credits: 2000,  price: "₦100,000" },
];

export default function CreditWidget({ credits }: { credits: Credits | null }) {
  const balance   = credits?.balance        ?? 50;
  const purchased = credits?.total_purchased ?? 50;
  const used      = credits?.total_used      ?? 0;
  const minutesLeft = Math.floor(balance / 6);
  const pct = purchased > 0 ? Math.min(100, (balance / purchased) * 100) : 100;

  return (
    <div className={`card ${styles.creditCard}`}>
      <div className={styles.creditHeader}>
        <div>
          <p className={styles.widgetLabel}>Credit Balance</p>
          <div className={styles.creditBalance}>
            <span className={styles.creditNum}>{balance.toLocaleString()}</span>
            <span className={styles.creditUnit}>credits</span>
          </div>
        </div>
        <div className={styles.creditBadge}>
          <span className="badge badge-live">ACTIVE</span>
        </div>
      </div>

      {/* Progress bar */}
      <div className={styles.creditBar}>
        <div className={styles.creditBarFill} style={{ width: `${pct}%` }} />
      </div>
      <div className={styles.creditMeta}>
        <span>≈ {minutesLeft} minutes remaining</span>
        <span>{used} used</span>
      </div>

      {/* Quick buy */}
      <div className={styles.quickBuy}>
        <p className={styles.quickBuyLabel}>Quick Top-Up</p>
        <div className={styles.quickBuyPlans}>
          {PLANS.map((p) => (
            <Link key={p.name} href="/pricing" className={styles.quickBuyPlan}>
              <span className={styles.quickBuyName}>{p.name}</span>
              <span className={styles.quickBuyCredits}>{p.credits.toLocaleString()} cr</span>
              <span className={styles.quickBuyPrice}>{p.price}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
