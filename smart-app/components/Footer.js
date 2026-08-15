import Link from "next/link";

export default function Footer() {
  return (
    <footer className="mt-16 border-t border-[#DED5BE]">
      <div className="max-w-6xl mx-auto px-4 md:px-6 py-8 flex flex-col md:flex-row items-center justify-between gap-3">
        <p className="text-[11px] text-[#A29C89] font-mono">SMart · built by students, for students</p>
        <div className="flex items-center gap-4 text-xs text-[#5B6472] font-medium">
          <Link href="/about" className="hover:text-[#16283F]">About</Link>
          <Link href="/policy" className="hover:text-[#16283F]">Policy & Who We Are</Link>
          <Link href="/plaza" className="hover:text-[#16283F]">Plaza</Link>
          <Link href="/admin" className="hover:text-[#16283F]">Admin</Link>
        </div>
      </div>
    </footer>
  );
}
