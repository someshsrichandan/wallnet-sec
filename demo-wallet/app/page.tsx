import Link from "next/link";

import { demoWalletConfig, demoWalletWarnings } from "@/lib/config";

export default function HomePage() {
  return (
    <section className="page">
      {/* Hero */}
      <div className="hero">
        <div className="label-badge">💰 Welcome to NexusPay</div>
        <h1>Your money, secured by visual intelligence</h1>
        <p>
          Send money, pay bills, and manage your finances with our next-generation
          Visual Password protection. No OTPs to intercept, no authenticator apps
          to clone — just you and your visual credentials.
        </p>
        <div className="cta-row">
          <Link className="btn btn-primary" href="/register">
            Create Wallet
          </Link>
          <Link className="btn btn-outline" href="/login">
            Sign In to Wallet
          </Link>
        </div>
      </div>

      {/* Trust bar */}
      <div className="trust-bar">
        <div className="trust-item">
          <span className="trust-icon">🔒</span>
          <span>End-to-End Encryption</span>
        </div>
        <div className="trust-item">
          <span className="trust-icon">🛡️</span>
          <span>Visual Password Protected</span>
        </div>
        <div className="trust-item">
          <span className="trust-icon">⚡</span>
          <span>Instant Transfers</span>
        </div>
        <div className="trust-item">
          <span className="trust-icon">📱</span>
          <span>24/7 Digital Wallet</span>
        </div>
      </div>

      {/* Feature cards */}
      <div className="cards">
        <article className="card">
          <div className="card-icon">💳</div>
          <h3>Instant Wallet Setup</h3>
          <p>
            Create your wallet in under a minute. During registration, you&apos;ll set
            up a unique Visual Password that adds an unbreakable layer of
            protection to every transaction.
          </p>
        </article>
        <article className="card">
          <div className="card-icon gold">⚡</div>
          <h3>Visual Authentication</h3>
          <p>
            Every login triggers a visual security challenge — no codes to type, no
            apps to install. Phishing-resistant protection that only you can solve.
          </p>
        </article>
        <article className="card">
          <div className="card-icon green">✓</div>
          <h3>Server-Verified Security</h3>
          <p>
            Your visual authentication is cryptographically verified server-side
            before granting access. Zero-trust security you can rely on.
          </p>
        </article>
      </div>

      {/* How it works */}
      <div className="form-wrap" style={{ marginTop: "1.5rem" }}>
        <div className="form-header">
          <div className="form-header-icon">📋</div>
          <div>
            <h3 style={{ margin: 0, fontFamily: "var(--font-space-grotesk), sans-serif", fontWeight: 700 }}>
              How Visual Password Works
            </h3>
            <p className="hint" style={{ marginTop: "0.15rem" }}>
              Three simple steps to unmatchable wallet security
            </p>
          </div>
        </div>

        <div className="cards" style={{ marginTop: "0.25rem" }}>
          <article className="card" style={{ borderLeft: "3px solid var(--primary)" }}>
            <h3>Step 1 — Sign In</h3>
            <p>
              Enter your email and password as usual. Our system validates your
              primary credentials instantly.
            </p>
          </article>
          <article className="card" style={{ borderLeft: "3px solid var(--accent-warm)" }}>
            <h3>Step 2 — Visual Challenge</h3>
            <p>
              You&apos;re redirected to a visual password grid. Select your
              secret pattern to prove it&apos;s you — impossible to phish.
            </p>
          </article>
          <article className="card" style={{ borderLeft: "3px solid var(--good)" }}>
            <h3>Step 3 — Wallet Access</h3>
            <p>
              Callback is cryptographically verified server-side. Your secure
              wallet session begins — send, receive, pay securely.
            </p>
          </article>
        </div>
      </div>

      {/* System config (collapsed) */}
      <details className="form-wrap" style={{ cursor: "pointer", marginTop: "1.5rem" }}>
        <summary
          style={{ fontWeight: 700, fontSize: "0.9rem", color: "var(--text-muted)" }}
        >
          ⚙️ Technical Configuration (Developer Info)
        </summary>
        <div className="meta-list" style={{ marginTop: "0.75rem" }}>
          <div>
            <strong>API Base URL:</strong>{" "}
            <span>{demoWalletConfig.visualApiBase}</span>
          </div>
          <div>
            <strong>Verify Origin:</strong>{" "}
            <span>{demoWalletConfig.visualVerifyOrigin}</span>
          </div>
          <div>
            <strong>Wallet Origin:</strong>{" "}
            <span>{demoWalletConfig.publicOrigin}</span>
          </div>
          <div>
            <strong>Partner ID:</strong> <span>{demoWalletConfig.partnerId}</span>
          </div>
          <div>
            <strong>Admin URL:</strong>{" "}
            <span>{demoWalletConfig.visualAdminUrl}</span>
          </div>
        </div>
        {demoWalletWarnings.length ?
          <div className="status warn" style={{ marginTop: "0.75rem" }}>
            <strong>⚠️ Warnings:</strong>
            <ul style={{ margin: "0.45rem 0 0", paddingInlineStart: "1rem" }}>
              {demoWalletWarnings.map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
            </ul>
          </div>
        : null}
      </details>
    </section>
  );
}
