import "./globals.css";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";

export const metadata = {
  title: "Student Mart | SMart",
  description: "The campus marketplace for student shops, services, digital goods, and startup pitches.",
};

// This app is entirely data-driven (live Supabase queries, auth state, cookies).
// Force every route to render per-request instead of being statically prerendered
// at build time — static prerendering is what caused the Supabase client-construction
// errors during `next build` before env vars were available.
export const dynamic = "force-dynamic";

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <Navbar />
        {children}
        <Footer />
      </body>
    </html>
  );
}
