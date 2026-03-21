import Link from "next/link";
import type { Metadata } from "next";
import { Manrope, Space_Grotesk } from "next/font/google";
import "./globals.css";
import { readServerSession } from "@/lib/server-auth";

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
});

export const metadata: Metadata = {
  title: "NexusPay — Secure Digital Wallet",
  description:
    "NexusPay is a modern digital wallet with Visual Password protection. Send money, pay bills, and manage your finances with cutting-edge security.",
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
        {/* Top utility bar */}
        <div className="top-bar">
          <div className="shell top-bar-inner">
            <span>🔒 End-to-End Encrypted &nbsp;|&nbsp; Visual Password Protected</span>
            <span>Support: help@nexuspay.demo</span>
          </div>
        </div>

        {/* Main header */}
        <header className="site-header">
          <div className="shell nav-row">
            <Link href="/" className="brand">
              <div className="brand-icon">NP</div>
              <div className="brand-text">
                NexusPay
                <span>Digital Wallet</span>
              </div>
            </Link>
            <nav className="nav-links">
              <Link href="/">Home</Link>
              {isLoggedIn ? (
                <>
                  <Link href="/dashboard">My Wallet</Link>
                  <span className="nav-user-greeting">👤 {firstName}</span>
                  <Link href="/logout" className="nav-cta nav-cta-logout">
                    Sign Out
                  </Link>
                </>
              ) : (
                <>
                  <Link href="/register">Create Wallet</Link>
                  <Link href="/dashboard">My Wallet</Link>
                  <Link href="/login" className="nav-cta">
                    Sign In
                  </Link>
                </>
              )}
            </nav>
          </div>
        </header>

        <main className="shell">{children}</main>

        {/* Footer */}
        <footer className="site-footer">
          <div className="shell footer-inner">
            <div className="footer-col">
              <div className="footer-brand">
                Nexus<span>Pay</span>
              </div>
              <p
                style={{
                  margin: "0.5rem 0 0",
                  lineHeight: 1.5,
                  maxWidth: "32ch",
                  fontSize: "0.82rem",
                  color: "var(--text-muted)",
                }}
              >
                Trusted by millions of users. Your money is safe with
                Visual Password — phishing-resistant authentication.
              </p>
            </div>
            <div className="footer-col">
              <h4>Payments</h4>
              <a href="#">Send Money</a>
              <a href="#">Pay Bills</a>
              <a href="#">Recharge</a>
              <a href="#">Scan & Pay</a>
            </div>
            <div className="footer-col">
              <h4>Services</h4>
              <a href="#">Wallet Balance</a>
              <a href="#">Bank Transfer</a>
              <a href="#">Gift Cards</a>
              <a href="#">Insurance</a>
            </div>
            <div className="footer-col">
              <h4>Support</h4>
              <a href="#">Help Center</a>
              <a href="#">Security</a>
              <a href="#">Contact Us</a>
              <a href="#">Report Fraud</a>
            </div>
          </div>
          <div className="shell footer-bottom">
            <span>
              © 2026 NexusPay. All rights reserved. Licensed Digital Wallet Provider.
            </span>
            <span>Demo application — Not a real financial service</span>
          </div>
        </footer>
      </body>
    </html>
  );
}
