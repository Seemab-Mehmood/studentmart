"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "../../../lib/supabaseClient";
import AdminDashboardClient from "./AdminDashboardClient";

export default function AdminDashboardPage() {
  const [allowed, setAllowed] = useState(undefined);
  const router = useRouter();
  const supabase = supabaseBrowser();

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push("/admin"); return; }
      const { data: profile } = await supabase.from("profiles").select("role").eq("id", session.user.id).single();
      if (!["admin", "super_admin"].includes(profile?.role)) { router.push("/admin"); return; }
      setAllowed(true);
    })();
  }, []);

  if (!allowed) return <div className="max-w-6xl mx-auto px-4 py-16 text-sm text-[#8A8478]">Checking access…</div>;
  return <AdminDashboardClient />;
}
