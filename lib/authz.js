import { supabaseServer } from "./supabaseServer";

// Returns the logged-in user's profile (role, etc.) from a server context, or null.
export async function getServerProfile() {
  const db = supabaseServer();
  const { data: { user } } = await db.auth.getUser();
  if (!user) return null;
  const { data: profile } = await db.from("profiles").select("*").eq("id", user.id).single();
  return profile || null;
}

export function hasRole(profile, allowed) {
  return !!profile && allowed.includes(profile.role);
}
