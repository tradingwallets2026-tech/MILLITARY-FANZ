import { redirect } from "next/navigation";
import { getUser, getUserAvatars } from "@/lib/actions";
import { createClient } from "@/lib/supabase/server";
import AvatarsClient from "./AvatarsClient";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Avatar Identities — Military Pass",
  description: "Upload your face photos to generate real-time AI avatars for your live tactical transformation sessions.",
};

export default async function AvatarsPage() {
  const user = await getUser();
  if (!user) redirect("/auth/login");

  const supabase = await createClient();

  const [creditsRes, avatars] = await Promise.all([
    supabase.from("credits").select("balance").eq("user_id", user.id).single(),
    getUserAvatars(user.id),
  ]);

  return (
    <AvatarsClient
      userId={user.id}
      initialBalance={creditsRes.data?.balance ?? 0}
      initialAvatars={avatars}
    />
  );
}
