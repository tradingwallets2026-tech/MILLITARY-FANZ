import { redirect } from "next/navigation";
import { getUser, getUserAvatars, getUserCredits } from "@/lib/actions";
import StudioClient from "./StudioClient";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Operator Studio — Military Pass",
  description: "Real-time AI face and voice transformation studio. Go live with a completely transformed identity.",
};

export default async function StudioPage() {
  const user = await getUser();
  if (!user) redirect("/auth/login");

  const [avatarsResult, credits] = await Promise.all([
    getUserAvatars(user.id),
    getUserCredits(user.id),
  ]);

  const avatars = avatarsResult ?? [];
  const balance = credits?.balance ?? 0;

  return (
    <StudioClient
      avatars={avatars}
      initialBalance={balance}
      userId={user.id}
    />
  );
}
