import { NextResponse }  from "next/server";
import { createClient }  from "@/lib/supabase/server";
import { getUser }       from "@/lib/actions";

// ── GET /api/voice/models — List user's trained voice models ──────
export async function GET() {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("voice_models")
    .select("id, name, status, samples, n_vectors, trained_at, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ models: data ?? [] });
}

// ── DELETE /api/voice/models — Delete a trained voice model ───────
export async function DELETE(request: Request) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { modelId } = await request.json();
  if (!modelId) return NextResponse.json({ error: "modelId required" }, { status: 400 });

  const supabase = await createClient();

  const { error } = await supabase
    .from("voice_models")
    .delete()
    .eq("id", modelId)
    .eq("user_id", user.id); // RLS: only own models

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
