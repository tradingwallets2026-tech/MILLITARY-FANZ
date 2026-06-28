import { NextRequest, NextResponse } from "next/server";
import { getUser, getUserCredits } from "@/lib/actions";
import { getPostHogClient } from "@/lib/posthog-server";

const FACE_SWAP_API  = process.env.MODAL_FACE_SWAP_URL ?? "";
const MODAL_TOKEN    = process.env.MODAL_AUTH_TOKEN    ?? "";
const MAX_SIZE_BYTES = 5 * 1024 * 1024;  // 5MB

/* ─── POST /api/avatars/upload ────────────────────────────────── */
export async function POST(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const credits = await getUserCredits(user.id);
    if (!credits || credits.balance < 1) {
      return NextResponse.json(
        { error: "You need at least 1 credit to upload an avatar" },
        { status: 402 }
      );
    }

    const formData = await request.formData();
    const file     = formData.get("file") as File | null;
    const name     = (formData.get("name") as string) ?? "My Avatar";

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "Invalid file type. Upload a JPG, PNG, or WebP image." },
        { status: 415 }
      );
    }
    if (file.size > MAX_SIZE_BYTES) {
      return NextResponse.json(
        { error: `File too large: ${(file.size / 1024 / 1024).toFixed(1)}MB. Max: 5MB` },
        { status: 413 }
      );
    }

    const buffer = await file.arrayBuffer();
    const b64    = Buffer.from(buffer).toString("base64");

    let embedding:    number[] | null = null;
    let faceDetected: boolean         = false;
    let enhancedB64:  string          = b64;  // store enhanced image if GFPGAN ran

    if (FACE_SWAP_API) {
      // ── Step 1: GFPGAN enhance the avatar photo (ultra quality)
      console.log("[avatar/upload] Running GFPGAN enhancement…");
      try {
        const enhanceRes = await fetch(FACE_SWAP_API, {
          method:  "POST",
          headers: {
            "Content-Type":  "application/json",
            "Authorization": `Bearer ${MODAL_TOKEN}`,
          },
          body:   JSON.stringify({
            auth_token: MODAL_TOKEN,
            action:     "enhance",
            image_b64:  b64,
            quality:    "ultra",
          }),
          signal: AbortSignal.timeout(120_000),
        });
        const enhData = await enhanceRes.json();
        if (enhData.result_b64) {
          enhancedB64 = enhData.result_b64;
          console.log("[avatar/upload] GFPGAN enhancement complete.");
        }
      } catch (e) {
        console.warn("[avatar/upload] GFPGAN skipped:", e);
      }

      // ── Step 2: Extract 512-dim face embedding from enhanced image
      console.log("[avatar/upload] Extracting face embedding…");
      const embedRes = await fetch(FACE_SWAP_API, {
        method:  "POST",
        headers: {
          "Content-Type":  "application/json",
          "Authorization": `Bearer ${MODAL_TOKEN}`,
        },
        body:   JSON.stringify({
          auth_token: MODAL_TOKEN,
          action:     "extract_embedding",
          image_b64:  enhancedB64,
        }),
        signal: AbortSignal.timeout(120_000),
      });

      const embedData = await embedRes.json();

      if (embedData.error) {
        return NextResponse.json({ error: embedData.error }, { status: 422 });
      }

      embedding    = embedData.embedding;
      faceDetected = !!embedding;

      if (embedData.face_score !== undefined) {
        console.log(`[avatar/upload] Face confidence: ${(embedData.face_score * 100).toFixed(1)}%`);
      }

    } else {
      // Dev mode mock
      embedding    = Array.from({ length: 512 }, () => Math.random() * 2 - 1);
      faceDetected = true;
      console.log("[avatar/upload] Dev mode — mock embedding generated.");
    }

    if (!faceDetected || !embedding) {
      return NextResponse.json(
        {
          error: "No face detected in the uploaded image. Please upload a clear, front-facing photo with good lighting.",
          tips:  [
            "Face should be clearly visible and centered",
            "Avoid sunglasses or heavy shadows",
            "Use a photo with good lighting",
            "Minimum face size: ~200×200 pixels",
          ],
        },
        { status: 422 }
      );
    }

    // ── Step 3: Upload enhanced image + save to Supabase ──────────
    try {
      const { createClient } = await import("@/lib/supabase/server");
      const supabase = await createClient();

      // Convert enhanced b64 back to Buffer for storage
      const enhancedBuffer = Buffer.from(enhancedB64, "base64");
      const fileName = `${user.id}/${Date.now()}-${file.name.replace(/[^a-z0-9.]/gi, "_")}`;

      const { data: storageData, error: storageError } = await supabase
        .storage
        .from("avatars")
        .upload(fileName, enhancedBuffer, {
          contentType: "image/jpeg",  // GFPGAN always outputs JPEG
          upsert:      false,
        });

      if (storageError) {
        console.error("[avatar/upload] Storage error:", storageError);
      }

      const imageUrl = storageData
        ? supabase.storage.from("avatars").getPublicUrl(storageData.path).data.publicUrl
        : `https://api.dicebear.com/7.x/bottts/svg?seed=${user.id}&size=128`;

      const { data: avatar, error: dbError } = await supabase
        .from("avatars")
        .insert({
          user_id:        user.id,
          name,
          image_url:      imageUrl,
          embedding:      JSON.stringify(embedding),
          is_preset:      false,
          enhanced:       !!storageData,  // flag: was GFPGAN applied?
        })
        .select()
        .single();

      if (dbError) {
        return NextResponse.json({ error: dbError.message }, { status: 500 });
      }

      const posthog = getPostHogClient();
      posthog.capture({
        distinctId: user.id,
        event: "avatar_uploaded",
        properties: {
          avatar_name:    name,
          enhanced:       !!FACE_SWAP_API,
          embedding_dims: embedding.length,
          file_size_mb:   parseFloat((file.size / 1024 / 1024).toFixed(2)),
        },
      });

      return NextResponse.json({
        success:         true,
        avatar,
        embedding_dims:  embedding.length,
        enhanced:        FACE_SWAP_API ? true : false,
      }, { status: 201 });

    } catch (dbErr) {
      console.error("[avatar/upload] DB error:", dbErr);
      return NextResponse.json({ error: "Database error" }, { status: 500 });
    }

  } catch (err) {
    console.error("[avatar/upload]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/* ─── DELETE /api/avatars/upload?id=xxx ──────────────────────── */
export async function DELETE(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const avatarId = request.nextUrl.searchParams.get("id");
    if (!avatarId) return NextResponse.json({ error: "Missing avatar ID" }, { status: 400 });

    const { createClient } = await import("@/lib/supabase/server");
    const supabase = await createClient();

    const { error } = await supabase
      .from("avatars")
      .delete()
      .eq("id", avatarId)
      .eq("user_id", user.id)
      .eq("is_preset", false);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
