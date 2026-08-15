import "./globals.css";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";

export const metadata = {
  title: "Student Mart | SMart",
  description: "The campus marketplace for student shops, services, digital goods, and startup pitches.",
};

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
