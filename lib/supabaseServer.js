import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

// Fallbacks exist ONLY so clients can be constructed during Next.js build/prerender
// even before real env vars are set — see lib/supabaseClient.js for the same pattern.
// Real data calls will fail until you add the real values in Render's Environment tab.
const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-anon-key";
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "placeholder-service-key";

// Request-scoped client — respects RLS as the logged-in user (or anon for guests).
export function supabaseServer() {
  const cookieStore = cookies();
  return createServerClient(url, anonKey, {
    cookies: {
      get(name) {
        return cookieStore.get(name)?.value;
      },
      set(name, value, options) {
        try { cookieStore.set({ name, value, ...options }); } catch {}
      },
      remove(name, options) {
        try { cookieStore.set({ name, value: "", ...options }); } catch {}
      },
    },
  });
}

// Service-role client — bypasses RLS. ONLY use inside server-only code
// (API routes, admin-gated server actions). Never import this in a "use client" file.
export function supabaseAdmin() {
  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
