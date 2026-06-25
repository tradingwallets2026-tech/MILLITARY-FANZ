import { createBrowserClient } from "@supabase/ssr";

// A safe fallback mock client that prevents build-time crashes when env vars are missing or invalid
function createMockClient() {
  const handler: ProxyHandler<any> = {
    get(target, prop) {
      if (prop === "then") return undefined; // Avoid promise chaining resolving issues
      const mockCallable = () => Promise.resolve({ data: null, error: { message: "Supabase is not configured." } });
      return new Proxy(mockCallable, handler);
    }
  };
  return new Proxy({} as any, handler);
}

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    // Return a safe mock client for build/dev environments without crashing
    return createMockClient();
  }

  try {
    return createBrowserClient(url, key);
  } catch (err) {
    return createMockClient();
  }
}
