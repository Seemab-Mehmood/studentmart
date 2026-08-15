"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ShoppingBasket, ShoppingCart, Store, ShieldCheck, LayoutGrid, Info, FileText, LandPlot } from "lucide-react";
import { supabaseBrowser } from "../lib/supabaseClient";
import { getCart } from "../lib/cart";

export default function Navbar() {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [cartCount, setCartCount] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const supabase = supabaseBrowser();

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, sess) => setSession(sess));
    const updateCart = () => setCartCount(getCart().reduce((s, i) => s + i.quantity, 0));
    updateCart();
    window.addEventListener("smart-cart-updated", updateCart);
    return () => {
      sub.subscription.unsubscribe();
      window.removeEventListener("smart-cart-updated", updateCart);
    };
  }, []);

  useEffect(() => {
    if (!session) { setProfile(null); return; }
    supabase.from("profiles").select("*").eq("id", session.user.id).single()
      .then(({ data }) => setProfile(data));
  }, [session]);

  const signOut = async () => {
    await supabase.auth.signOut();
    setSession(null);
    window.location.href = "/";
  };

  const links = [
    { href: "/", label: "Explore", icon: LayoutGrid },
    { href: "/plaza", label: "Plaza", icon: LandPlot },
    { href: "/about", label: "About", icon: Info },
    { href: "/policy", label: "Policy", icon: FileText },
  ];

  return (
    <header className="sticky top-0 z-40 bg-[#EDE7DA]/95 backdrop-blur-sm border-b border-[#DED5BE]">
      <div className="max-w-6xl mx-auto px-4 md:px-6 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-[#1F3A5C] flex items-center justify-center text-[#D9A441]">
            <ShoppingBasket size={19} strokeWidth={2.4} />
          </div>
          <div className="leading-none">
            <p className="font-display font-bold text-[#16283F] text-[15px] tracking-tight">STUDENT <span className="text-[#B08A3C]">MART</span></p>
            <p className="text-[10px] text-[#8A8478] tracking-wide">campus marketplace</p>
          </div>
        </Link>

        <nav className="hidden md:flex items-center gap-1 bg-white/60 border border-[#DED5BE] rounded-full p-1">
          {links.map((l) => (
            <Link key={l.href} href={l.href} className="flex items-center gap-1.5 px-3.5 py-2 rounded-full text-sm font-semibold text-[#5B6472] hover:text-[#16283F] hover:bg-white transition-colors">
              <l.icon size={14} /> {l.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Link href="/cart" className="relative flex items-center gap-1.5 bg-white border border-[#DED5BE] hover:border-[#1F3A5C] px-3.5 py-2 rounded-xl text-sm font-semibold text-[#16283F]">
            <ShoppingCart size={15} />
            {cartCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 bg-[#D9A441] text-[#16283F] text-[10px] font-bold w-4.5 h-4.5 rounded-full flex items-center justify-center px-1">{cartCount}</span>
            )}
          </Link>

          {!session ? (
            <Link href="/login" className="hidden sm:flex items-center gap-1.5 bg-[#1F3A5C] hover:bg-[#16283F] text-[#EDE7DA] text-sm font-semibold px-4 py-2 rounded-xl">
              Log in
            </Link>
          ) : (
            <div className="relative">
              <button onClick={() => setMenuOpen((o) => !o)} className="hidden sm:flex items-center gap-1.5 bg-white border border-[#DED5BE] text-sm font-semibold px-3.5 py-2 rounded-xl text-[#16283F]">
                {profile?.role === "seller" ? <Store size={15} /> : <ShoppingBasket size={15} />}
                {profile?.full_name?.split(" ")[0] || "Account"}
              </button>
              {menuOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white border border-[#DED5BE] rounded-xl shadow-lg py-1.5 text-sm">
                  {profile?.role === "seller" && (
                    <Link href="/seller/dashboard" className="block px-4 py-2 text-[#16283F] hover:bg-[#F5F1E7]">Seller Dashboard</Link>
                  )}
                  <button onClick={signOut} className="w-full text-left px-4 py-2 text-[#B44B3F] hover:bg-[#F5F1E7]">Sign out</button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="md:hidden flex border-t border-[#DED5BE] overflow-x-auto">
        {links.map((l) => (
          <Link key={l.href} href={l.href} className="flex-1 flex flex-col items-center gap-0.5 py-2.5 text-[11px] font-semibold text-[#5B6472] whitespace-nowrap px-2">
            <l.icon size={16} /> {l.label}
          </Link>
        ))}
      </div>
    </header>
  );
}
