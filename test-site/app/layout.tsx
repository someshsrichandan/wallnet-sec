import Link from "next/link";
import type { Metadata } from "next";
import { Manrope, Space_Grotesk } from "next/font/google";
import "./globals.css";
import { readServerSession } from "@/lib/session";

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
});

export const metadata: Metadata = {
  title: "SecureWallet | Visual Password Integration Test",
  description:
    "Test site to verify Visual Password SaaS API integration end-to-end.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await readServerSession();
  const isLoggedIn = !!session;
  const firstName = session?.fullName?.split(" ")[0] || "User";

  return (
    <html lang="en">
      <body className={`${manrope.variable} ${spaceGrotesk.variable}`}>
        <header className="site-header">
          <div className="nav-row">
            <Link href="/" className="brand">
              <span className="brand-icon">🦊</span>
              <div>
                SecureWallet
                <span>Visual Auth</span>
              </div>
            </Link>
            <div
              style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}
            >
              <div className="network-badge">
                <span className="network-dot" />
                Mainnet
              </div>
              <nav className="nav-links">
                {isLoggedIn ? (
                  <>
                    <Link href="/dashboard">Dashboard</Link>
                    <span className="nav-user-greeting">👤 {firstName}</span>
                    <Link href="/logout" className="nav-cta-logout">
                      Lock Wallet
                    </Link>
                  </>
                ) : (
                  <>
                    <Link href="/register">Register</Link>
                    <Link href="/login">Login</Link>
                    <Link href="/dashboard">Dashboard</Link>
                  </>
                )}
              </nav>
            </div>
          </div>
        </header>
        <main className="shell">{children}</main>
      </body>
    </html>
  );
}
