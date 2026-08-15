import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

// Request-scoped client — respects RLS as the logged-in user (or anon for guests).
export function supabaseServer() {
  const cookieStore = cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
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
    }
  );
}

// Service-role client — bypasses RLS. ONLY use inside server-only code
// (API routes, admin-gated server actions). Never import this in a "use client" file.
export function supabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
