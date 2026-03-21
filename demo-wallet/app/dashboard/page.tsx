import Link from "next/link";
import { redirect } from "next/navigation";

import { readServerSession } from "@/lib/server-auth";
import { findUserById } from "@/lib/demo-wallet-store";
import EnableVisualPasswordButton from "./EnableVisualPasswordButton";

type Props = {
  searchParams: Promise<{
    enrolled?: string;
    enrollError?: string;
    verified?: string;
  }>;
};

// Mock wallet transactions
const MOCK_TRANSACTIONS = [
  {
    id: 1,
    name: "Added to Wallet",
    date: "Mar 18, 2026",
    amount: 5000,
    icon: "💰",
    type: "credit" as const,
  },
  {
    id: 2,
    name: "Swiggy Food Delivery",
    date: "Mar 17, 2026",
    amount: -432,
    icon: "🍔",
    type: "debit" as const,
  },
  {
    id: 3,
    name: "Jio Recharge",
    date: "Mar 16, 2026",
    amount: -299,
    icon: "📱",
    type: "debit" as const,
  },
  {
    id: 4,
    name: "Received from Rahul",
    date: "Mar 15, 2026",
    amount: 2000,
    icon: "↩️",
    type: "credit" as const,
  },
  {
    id: 5,
    name: "Netflix Subscription",
    date: "Mar 14, 2026",
    amount: -649,
    icon: "🎬",
    type: "debit" as const,
  },
  {
    id: 6,
    name: "Electricity Bill — BSES",
    date: "Mar 12, 2026",
    amount: -1850,
    icon: "⚡",
    type: "debit" as const,
  },
  {
    id: 7,
    name: "Welcome Bonus",
    date: "Mar 10, 2026",
    amount: 10000,
    icon: "🎁",
    type: "credit" as const,
  },
];

export default async function DashboardPage({ searchParams }: Props) {
  const session = await readServerSession();
  if (!session) {
    redirect("/login?error=Please%20login%20first");
  }

  const user = await findUserById(session.userId);
  const params = await searchParams;
  const justEnrolled = params.enrolled === "1";
  const justVerified = params.verified === "1";
  const enrollError = params.enrollError;

  const firstName = session.fullName?.split(" ")[0] || "User";
  const walletBalance = user?.walletBalance ?? 10000;

  return (
    <section className="page">
      {/* Welcome banner */}
      <div className="hero">
        <div className="label-badge">
          {justVerified ? "✅ Identity Verified" : "🔒 Secure Session Active"}
        </div>
        <h1>Welcome back, {firstName}</h1>
        <p>
          Your identity has been verified through Visual Password
          authentication. All wallet actions are protected.
        </p>
        <div className="cta-row">
          <Link className="btn btn-danger" href="/logout">
            Sign Out Securely
          </Link>
          <EnableVisualPasswordButton
            mode={user?.visualEnabled ? "re-enroll" : "enroll"}
          />
        </div>
      </div>

      {/* Status messages */}
      {justEnrolled && (
        <div className="status success" style={{ marginTop: "1rem" }}>
          ✓ Visual password {user?.visualEnabled ? "updated" : "enabled"}{" "}
          successfully! It is now active on your wallet.
        </div>
      )}
      {enrollError && (
        <div className="status error" style={{ marginTop: "1rem" }}>
          ⚠ Visual password setup failed: {decodeURIComponent(enrollError)}
        </div>
      )}
      {!user?.visualEnabled && (
        <div className="status warn" style={{ marginTop: "1rem" }}>
          ⚠ You have not set up your visual password yet. Enable it to add
          two-factor visual security to every login.
        </div>
      )}

      {/* Dashboard grid */}
      <div className="dash-grid">
        {/* Wallet Balance card */}
        <div className="dash-card glow-pulse">
          <h3>Wallet Balance</h3>
          <div className="balance-amount">
            <span className="currency">₹</span>
            {walletBalance.toLocaleString("en-IN")}
          </div>
          <div className="balance-change">↑ Available for instant payments</div>
          <div className="account-number" style={{ marginTop: "0.75rem" }}>
            Wallet ID: {session.partnerUserId}
          </div>
        </div>

        {/* Rewards card */}
        <div className="dash-card">
          <h3>Rewards & Cashback</h3>
          <div className="balance-amount" style={{ fontSize: "1.8rem" }}>
            <span className="currency">₹</span>245
          </div>
          <div className="balance-change">🎯 3 rewards pending</div>
          <div style={{ marginTop: "0.75rem", display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            <span style={{
              padding: "0.25rem 0.6rem",
              borderRadius: 6,
              background: "var(--good-soft)",
              color: "var(--good)",
              fontSize: "0.72rem",
              fontWeight: 700,
            }}>
              5% cashback on bills
            </span>
            <span style={{
              padding: "0.25rem 0.6rem",
              borderRadius: 6,
              background: "var(--warn-soft)",
              color: "var(--warn)",
              fontSize: "0.72rem",
              fontWeight: 700,
            }}>
              ₹50 referral bonus
            </span>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="dash-card">
          <h3>Quick Actions</h3>
          <div className="quick-actions">
            <div className="quick-action">
              <span className="qa-icon">💸</span>
              Send Money
            </div>
            <div className="quick-action">
              <span className="qa-icon">📱</span>
              Recharge
            </div>
            <div className="quick-action">
              <span className="qa-icon">📄</span>
              Pay Bills
            </div>
            <div className="quick-action">
              <span className="qa-icon">🏦</span>
              Bank Transfer
            </div>
            <div className="quick-action">
              <span className="qa-icon">📊</span>
              Statement
            </div>
            <div className="quick-action">
              <span className="qa-icon">⚙️</span>
              Settings
            </div>
          </div>
        </div>

        {/* Security card */}
        <div className="dash-card">
          <h3>Wallet Security</h3>
          <div className="info-grid">
            <div className="info-row">
              <span className="info-label">Visual Password</span>
              <div
                className={`security-status ${user?.visualEnabled ? "enabled" : "disabled"}`}
              >
                {user?.visualEnabled ? "🛡️ Active" : "⚠️ Not Set Up"}
              </div>
            </div>
            <div className="info-row">
              <span className="info-label">Session</span>
              <span
                className="info-value"
                style={{ color: "var(--good)", fontSize: "0.85rem" }}
              >
                ● Authenticated
              </span>
            </div>
            <div className="info-row">
              <span className="info-label">Encryption</span>
              <span className="info-value" style={{ fontSize: "0.85rem" }}>
                End-to-End
              </span>
            </div>
            <div className="info-row">
              <span className="info-label">API Auth</span>
              <span className="info-value" style={{ fontSize: "0.85rem" }}>
                Razorpay-style Basic
              </span>
            </div>
          </div>
        </div>

        {/* Recent Transactions */}
        <div className="dash-card full">
          <h3>Recent Transactions</h3>
          <div className="tx-list">
            {MOCK_TRANSACTIONS.map((tx) => (
              <div key={tx.id} className="tx-item">
                <div className="tx-left">
                  <div className="tx-icon">{tx.icon}</div>
                  <div className="tx-detail">
                    <span className="tx-name">{tx.name}</span>
                    <span className="tx-date">{tx.date}</span>
                  </div>
                </div>
                <span
                  className={`tx-amount ${tx.type}`}
                >
                  {tx.amount < 0 ? "-" : "+"}₹{Math.abs(tx.amount).toLocaleString("en-IN")}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Account Details */}
        <div className="dash-card full">
          <h3>Account Information</h3>
          <div className="info-grid">
            <div className="info-row">
              <span className="info-label">Account Holder</span>
              <span className="info-value">{session.fullName}</span>
            </div>
            <div className="info-row">
              <span className="info-label">Email</span>
              <span className="info-value">{session.email}</span>
            </div>
            <div className="info-row">
              <span className="info-label">Phone</span>
              <span className="info-value">{session.phone}</span>
            </div>
            <div className="info-row">
              <span className="info-label">Wallet ID</span>
              <span className="info-value">{session.partnerUserId}</span>
            </div>
            <div className="info-row">
              <span className="info-label">Internal ID</span>
              <span
                className="info-value"
                style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}
              >
                {session.userId}
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
