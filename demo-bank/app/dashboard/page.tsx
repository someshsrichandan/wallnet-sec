import Link from "next/link";
import { redirect } from "next/navigation";

import { readServerSession } from "@/lib/server-auth";
import { findUserById } from "@/lib/demo-bank-store";
import EnableVisualPasswordButton from "./EnableVisualPasswordButton";

type Props = {
  searchParams: Promise<{
    enrolled?: string;
    enrollError?: string;
    reEnrollError?: string;
  }>;
};

// Fake data for the banking dashboard UI
const MOCK_TRANSACTIONS = [
  {
    id: 1,
    name: "Amazon.com",
    date: "Feb 18, 2026",
    amount: -89.99,
    icon: "🛒",
  },
  {
    id: 2,
    name: "Direct Deposit — Payroll",
    date: "Feb 15, 2026",
    amount: 4250.0,
    icon: "💰",
  },
  {
    id: 3,
    name: "Netflix Subscription",
    date: "Feb 14, 2026",
    amount: -15.99,
    icon: "🎬",
  },
  {
    id: 4,
    name: "Starbucks Coffee",
    date: "Feb 13, 2026",
    amount: -6.45,
    icon: "☕",
  },
  {
    id: 5,
    name: "Transfer from Savings",
    date: "Feb 12, 2026",
    amount: 500.0,
    icon: "🔄",
  },
  {
    id: 6,
    name: "Electric Bill — ConEd",
    date: "Feb 10, 2026",
    amount: -134.22,
    icon: "⚡",
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
  const enrollError = params.enrollError;
  const reEnrollError = params.reEnrollError;

  const firstName = session.fullName?.split(" ")[0] || "Customer";

  return (
    <section className="page">
      {/* Welcome banner */}
      <div className="hero">
        <div className="label-badge">🔒 Secure Session Active</div>
        <h1>Welcome back, {firstName}</h1>
        <p>
          Your identity has been verified through Visual Password
          authentication. All account actions are protected.
        </p>
        <div className="cta-row">
          <Link className="btn btn-gold" href="/logout">
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
          successfully! It is now active on your account.
        </div>
      )}
      {enrollError && (
        <div className="status error" style={{ marginTop: "1rem" }}>
          ⚠ Visual password setup failed: {decodeURIComponent(enrollError)}
        </div>
      )}
      {reEnrollError && (
        <div className="status error" style={{ marginTop: "1rem" }}>
          ⚠ Re-verification failed: {decodeURIComponent(reEnrollError)} — your
          visual password was not changed.
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
        {/* Balance card */}
        <div className="dash-card">
          <h3>Checking Account</h3>
          <div className="balance-amount">
            <span className="currency">$</span>12,847
            <span style={{ fontSize: "1.2rem", color: "var(--muted)" }}>
              .63
            </span>
          </div>
          <div className="balance-change">↑ 2.4% from last month</div>
          <div className="account-number" style={{ marginTop: "0.75rem" }}>
            •••• •••• •••• 4829
          </div>
        </div>

        {/* Savings card */}
        <div className="dash-card">
          <h3>Savings Account</h3>
          <div className="balance-amount">
            <span className="currency">$</span>45,210
            <span style={{ fontSize: "1.2rem", color: "var(--muted)" }}>
              .00
            </span>
          </div>
          <div className="balance-change">↑ 0.8% APY earned</div>
          <div className="account-number" style={{ marginTop: "0.75rem" }}>
            •••• •••• •••• 7301
          </div>
        </div>

        {/* Quick Actions */}
        <div className="dash-card">
          <h3>Quick Actions</h3>
          <div className="quick-actions">
            <div className="quick-action">
              <span className="qa-icon">💸</span>
              Transfer
            </div>
            <div className="quick-action">
              <span className="qa-icon">📄</span>
              Pay Bills
            </div>
            <div className="quick-action">
              <span className="qa-icon">📊</span>
              Statements
            </div>
            <div className="quick-action">
              <span className="qa-icon">⚙️</span>
              Settings
            </div>
          </div>
        </div>

        {/* Security card */}
        <div className="dash-card">
          <h3>Account Security</h3>
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
                256-bit SSL
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
                  className={`tx-amount ${tx.amount < 0 ? "debit" : "credit"}`}
                >
                  {tx.amount < 0 ? "-" : "+"}${Math.abs(tx.amount).toFixed(2)}
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
              <span className="info-label">📞 Bank Account No.</span>
              <span className="info-value" style={{ fontFamily: "monospace", fontWeight: 700, fontSize: "1.1rem", color: "var(--navy)", letterSpacing: 4 }}>
                {user?.accountNumber || "—"}
              </span>
            </div>
            <div className="info-row">
              <span className="info-label">Mobile</span>
              <span className="info-value">{user?.phone || "—"}</span>
            </div>
            <div className="info-row">
              <span className="info-label">Customer ID</span>
              <span className="info-value">{session.partnerUserId}</span>
            </div>
            <div className="info-row">
              <span className="info-label">Internal ID</span>
              <span className="info-value" style={{ fontSize: "0.8rem", color: "var(--muted)" }}>
                {session.userId}
              </span>
            </div>
          </div>
          <p style={{ fontSize: "0.78rem", color: "var(--muted)", marginTop: "0.75rem", padding: "0.5rem 0.75rem", background: "var(--panel-soft)", borderRadius: 8 }}>
            📞 Your <strong>Bank Account No.</strong> is required when calling support to recover your visual password.
          </p>
        </div>
      </div>
    </section>
  );
}
