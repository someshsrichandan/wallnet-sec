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
  title: "Apex Federal Bank — Secure Online Banking",
  description:
    "Apex Federal Bank offers secure online banking with Visual Password verification for ultimate account protection.",
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
            <span>🔒 256-bit SSL Encrypted &nbsp;|&nbsp; FDIC Insured</span>
            <span>Customer Service: 1-800-APEX-BANK</span>
          </div>
        </div>

        {/* Main header */}
        <header className="site-header">
          <div className="shell nav-row">
            <Link href="/" className="brand">
              <div className="brand-icon">AF</div>
              <div className="brand-text">
                Apex Federal
                <span>Online Banking</span>
              </div>
            </Link>
            <nav className="nav-links">
              <Link href="/">Home</Link>
              {isLoggedIn ? (
                <>
                  <Link href="/dashboard">My Accounts</Link>
                  <span className="nav-user-greeting">👤 {firstName}</span>
                  <Link href="/logout" className="nav-cta nav-cta-logout">
                    Sign Out
                  </Link>
                </>
              ) : (
                <>
                  <Link href="/register">Open Account</Link>
                  <Link href="/dashboard">My Accounts</Link>
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
                Apex <span>Federal</span>
              </div>
              <p
                style={{
                  margin: "0.5rem 0 0",
                  lineHeight: 1.5,
                  maxWidth: "32ch",
                }}
              >
                Trusted by over 2 million customers nationwide. Banking made
                safe with Visual Password technology.
              </p>
            </div>
            <div className="footer-col">
              <h4>Banking</h4>
              <a href="#">Checking</a>
              <a href="#">Savings</a>
              <a href="#">Credit Cards</a>
              <a href="#">Loans</a>
            </div>
            <div className="footer-col">
              <h4>Services</h4>
              <a href="#">Mobile Banking</a>
              <a href="#">Bill Pay</a>
              <a href="#">Wire Transfers</a>
              <a href="#">Investments</a>
            </div>
            <div className="footer-col">
              <h4>Support</h4>
              <a href="#">Help Center</a>
              <a href="#">Security</a>
              <a href="#">Contact Us</a>
              <a href="#">Locations</a>
            </div>
          </div>
          <div className="shell footer-bottom">
            <span>
              © 2026 Apex Federal Bank. All rights reserved. Member FDIC. Equal
              Housing Lender.
            </span>
            <span>Demo application — Not a real financial institution</span>
          </div>
        </footer>
      </body>
    </html>
  );
}
