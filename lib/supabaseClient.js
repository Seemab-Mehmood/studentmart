import { createBrowserClient } from "@supabase/ssr";

// Fallbacks exist ONLY so the client can be constructed during Next.js build/prerender
// even before real env vars are set — actual data calls will fail until you add the
// real NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY in Render's Environment tab.
const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-anon-key";

export function supabaseBrowser() {
  return createBrowserClient(url, anonKey);
}
