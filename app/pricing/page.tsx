import { redirect } from "next/navigation";
import { getUser, getUserCredits } from "@/lib/actions";
import PricingClient from "./PricingClient";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Buy Credits — Military Pass",
  description: "Top up your Military Pass credits. Choose a plan and go live instantly with AI face and voice transformation.",
};

export default async function PricingPage() {
  const user    = await getUser();
  const credits = user ? await getUserCredits(user.id) : null;

  return (
    <PricingClient
      user={user ? { id: user.id, email: user.email ?? "" } : null}
      initialBalance={credits?.balance ?? 0}
    />
  );
}
