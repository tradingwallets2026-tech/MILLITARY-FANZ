import { redirect }      from "next/navigation";
import { getUser }       from "@/lib/actions";
import { createClient }  from "@/lib/supabase/server";
import VoiceTrainingClient from "./VoiceTrainingClient";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Voice Training — Military Pass",
  description: "Train a personal AI voice model. Upload your voice samples and get a custom voice transformer tailored exactly to your voice.",
};

export default async function VoiceTrainingPage() {
  const user = await getUser();
  if (!user) redirect("/auth/login");

  const supabase = await createClient();

  const [creditsRes, modelsRes] = await Promise.all([
    supabase.from("credits").select("balance").eq("user_id", user.id).single(),
    supabase.from("voice_models")
      .select("id, name, status, samples, n_vectors, trained_at, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
  ]);

  return (
    <VoiceTrainingClient
      userId={user.id}
      initialBalance={creditsRes.data?.balance ?? 0}
      initialModels={modelsRes.data ?? []}
    />
  );
}
