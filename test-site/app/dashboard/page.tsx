import Link from "next/link";
import { redirect } from "next/navigation";

import { readServerSession } from "@/lib/session";
import { findUserById } from "@/lib/store";
import EnableVisualPasswordButton from "./EnableVisualPasswordButton";

type Props = {
  searchParams: Promise<{
    enrolled?: string;
    enrollError?: string;
    verified?: string;
  }>;
};

export default async function DashboardPage({ searchParams }: Props) {
  const session = await readServerSession();
  if (!session) {
    redirect("/login?error=Please%20login%20first");
  }

  const user = await findUserById(session.userId);
  const params = await searchParams;
  const justEnrolled = params.enrolled === "1";
  const enrollError = params.enrollError;
  const justVerified = params.verified === "1";

  return (
    <section className="page">
      <div className="wallet-card">
        {/* ── Card header with balance ── */}
        <div className="wallet-card-header">
          <div className="wallet-icon">🦊</div>
          <h1>My Wallet</h1>
          <p style={{ marginBottom: "0.75rem" }}>
            {justVerified ?
              "Visual verification passed — session active"
            : "Welcome back"}
          </p>
          <div className="balance-display">
            <div className="balance-label">Total Balance</div>
            <div className="balance-amount">
              3.4281<span className="balance-symbol">ETH</span>
            </div>
          </div>
        </div>

        <div className="wallet-card-body">
          {/* ── Quick actions ── */}
          <div className="action-bar">
            <button className="action-btn" type="button">
              <span className="action-icon action-icon--send">↑</span>
              Send
            </button>
            <button className="action-btn" type="button">
              <span className="action-icon action-icon--receive">↓</span>
              Receive
            </button>
            <EnableVisualPasswordButton
              mode={user?.visualEnabled ? "re-enroll" : "enroll"}
              variant="action"
            />
          </div>

          {/* ── Status messages ── */}
          {justVerified && (
            <div className="status success" style={{ marginBottom: "0.75rem" }}>
              Visual verification passed successfully!
            </div>
          )}
          {justEnrolled && (
            <div className="status success" style={{ marginBottom: "0.75rem" }}>
              Visual key {user?.visualEnabled ? "updated" : "activated"}{" "}
              successfully!
            </div>
          )}
          {enrollError && (
            <div className="status error" style={{ marginBottom: "0.75rem" }}>
              Visual key setup failed: {decodeURIComponent(enrollError)}
            </div>
          )}

          {/* ── Security badge ── */}
          <div className="security-badge">
            <span
              className={`security-dot ${user?.visualEnabled ? "security-dot--active" : "security-dot--inactive"}`}
            />
            <span
              className={`security-text ${user?.visualEnabled ? "security-text--active" : "security-text--inactive"}`}
            >
              Visual Password{" "}
              {user?.visualEnabled ? "Active" : "Not Configured"}
            </span>
          </div>

          {!user?.visualEnabled && (
            <div className="status warn" style={{ margin: "0.75rem 0 0" }}>
              Your wallet is missing visual password protection. Enable it to
              secure every login with a second visual layer.
            </div>
          )}

          {/* ── Account details ── */}
          <div style={{ marginTop: "1rem" }}>
            <div className="separator">Account Details</div>
          </div>

          <div className="meta-list" style={{ marginTop: "0.5rem" }}>
            <div className="meta-row">
              <span className="meta-label">Name</span>
              <span className="meta-value">{session.fullName}</span>
            </div>
            <div className="meta-row">
              <span className="meta-label">Email</span>
              <span className="meta-value">{session.email}</span>
            </div>
            <div className="meta-row">
              <span className="meta-label">User ID</span>
              <span className="meta-value">{session.userId}</span>
            </div>
            <div className="meta-row">
              <span className="meta-label">Partner ID</span>
              <span className="meta-value">{session.partnerUserId}</span>
            </div>
          </div>

          {/* ── Bottom actions ── */}
          <div
            style={{
              display: "flex",
              gap: "0.5rem",
              marginTop: "1.25rem",
            }}
          >
            <Link className="btn btn-soft" href="/login" style={{ flex: 1 }}>
              New Login
            </Link>
            <Link className="btn btn-danger" href="/logout" style={{ flex: 1 }}>
              Lock Wallet
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
