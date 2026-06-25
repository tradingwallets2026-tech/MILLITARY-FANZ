import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    // In a browser environment, failing silently is safer than crashing
    // The app will then handle the missing config gracefully
    return createBrowserClient("", "");
  }

  return createBrowserClient(url, key);
}
