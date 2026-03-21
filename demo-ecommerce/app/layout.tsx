import Link from "next/link";
import type { Metadata } from "next";
import { Manrope, Space_Grotesk } from "next/font/google";
import { readServerSession } from "@/lib/server-auth";
import "./globals.css";

const manrope = Manrope({ subsets: ["latin"], variable: "--font-manrope" });
const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
});

export const metadata: Metadata = {
  title: "ShopMart — Online Shopping",
  description:
    "Demo e-commerce partner integrating Visual Password SaaS for phishing-resistant account login.",
};

const CATEGORIES = [
  { icon: "📱", label: "Mobiles" },
  { icon: "💻", label: "Electronics" },
  { icon: "👕", label: "Fashion" },
  { icon: "🏠", label: "Home" },
  { icon: "🛒", label: "Grocery" },
  { icon: "⌚", label: "Watches" },
  { icon: "👟", label: "Shoes" },
  { icon: "🎮", label: "Gaming" },
];

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const session = await readServerSession();

  return (
    <html lang="en">
      <body className={`${manrope.variable} ${spaceGrotesk.variable}`}>
        {/* Header */}
        <header className="site-header">
          <div className="shell nav-row">
            <Link href="/" className="brand">
              ShopMart
              <span>Premium Store</span>
            </Link>
            <div className="header-search">
              <span className="search-icon">🔍</span>
              <input
                type="text"
                placeholder="Search for products, brands and more"
                readOnly
              />
            </div>
            <nav className="nav-links">
              {session ?
                <>
                  <Link href="/dashboard">My Account</Link>
                  <Link href="/logout">Logout</Link>
                </>
              : <>
                  <Link href="/login" className="nav-link-btn">
                    Login
                  </Link>
                  <Link href="/register">Sign Up</Link>
                </>
              }
            </nav>
          </div>
        </header>

        {/* Category sub-header */}
        <div className="subheader">
          <div className="shell subheader-inner">
            {CATEGORIES.map((cat) => (
              <div key={cat.label} className="subheader-item">
                <span className="cat-icon">{cat.icon}</span>
                {cat.label}
              </div>
            ))}
          </div>
        </div>

        <main className="shell">{children}</main>

        <footer className="site-footer">
          <div className="shell">
            ShopMart Demo &mdash; Secured by{" "}
            <Link href="/">Visual Password SaaS</Link> &middot; Not a real store
          </div>
        </footer>
      </body>
    </html>
  );
}
