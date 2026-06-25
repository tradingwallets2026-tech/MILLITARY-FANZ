import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getUser } from "@/lib/actions";
import DashboardSidebar from "@/components/dashboard/DashboardSidebar";
import styles from "./dashboard.module.css";

export const metadata: Metadata = {
  title: "Dashboard — Military Pass",
  description: "Operator control panel",
};

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getUser();
  if (!user) redirect("/auth/login");

  return (
    <div className={styles.shell}>
      <DashboardSidebar user={user} />
      <main className={styles.main}>{children}</main>
    </div>
  );
}
