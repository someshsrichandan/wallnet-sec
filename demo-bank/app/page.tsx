import Link from "next/link";

import { demoBankConfig, demoBankWarnings } from "@/lib/config";

export default function HomePage() {
  return (
    <section className="page">
      {/* Hero */}
      <div className="hero">
        <div className="label-badge">🏦 Welcome to Apex Federal Bank</div>
        <h1>Banking reimagined with next-generation visual security</h1>
        <p>
          Experience seamless online banking protected by our proprietary Visual
          Password authentication. No SMS codes, no authenticator apps — just
          you and your visual credentials.
        </p>
        <div className="cta-row">
          <Link className="btn btn-gold" href="/register">
            Open an Account
          </Link>
          <Link className="btn btn-outline-white" href="/login">
            Sign In to Online Banking
          </Link>
        </div>
      </div>

      {/* Trust bar */}
      <div className="trust-bar">
        <div className="trust-item">
          <span className="trust-icon">🔒</span>
          <span>Bank-Grade Encryption</span>
        </div>
        <div className="trust-item">
          <span className="trust-icon">🛡️</span>
          <span>Visual Password Protected</span>
        </div>
        <div className="trust-item">
          <span className="trust-icon">✓</span>
          <span>FDIC Insured</span>
        </div>
        <div className="trust-item">
          <span className="trust-icon">📱</span>
          <span>24/7 Digital Banking</span>
        </div>
      </div>

      {/* Feature cards */}
      <div className="cards">
        <article className="card">
          <div className="card-icon">🔐</div>
          <h3>Secure Account Creation</h3>
          <p>
            Open your account in minutes. During registration, you&apos;ll set
            up a unique Visual Password that adds an unbreakable second layer of
            protection to every login.
          </p>
        </article>
        <article className="card">
          <div className="card-icon gold">⚡</div>
          <h3>Instant Visual Verification</h3>
          <p>
            After entering your credentials, you&apos;re seamlessly redirected
            to our Visual Password challenge — no codes to type, no apps to
            install.
          </p>
        </article>
        <article className="card">
          <div className="card-icon green">✓</div>
          <h3>Callback-Verified Sessions</h3>
          <p>
            Our servers cryptographically verify every visual authentication
            result before granting access. Zero-trust security you can bank on.
          </p>
        </article>
      </div>

      {/* How it works */}
      <div className="form-wrap" style={{ marginTop: "1.5rem" }}>
        <div className="form-header">
          <div className="form-header-icon">📋</div>
          <div>
            <h3 style={{ margin: 0 }}>How Visual Security Works</h3>
            <p className="hint" style={{ marginTop: "0.15rem" }}>
              Three simple steps to unmatched account security
            </p>
          </div>
        </div>

        <div className="cards" style={{ marginTop: "0.25rem" }}>
          <article
            className="card"
            style={{ borderLeft: "3px solid var(--accent)" }}
          >
            <h3>Step 1 — Sign In</h3>
            <p>
              Enter your email and password as usual. Our system validates your
              primary credentials.
            </p>
          </article>
          <article
            className="card"
            style={{ borderLeft: "3px solid var(--gold)" }}
          >
            <h3>Step 2 — Visual Challenge</h3>
            <p>
              You&apos;re redirected to a visual password grid. Select your
              secret pattern to prove it&apos;s you.
            </p>
          </article>
          <article
            className="card"
            style={{ borderLeft: "3px solid var(--good)" }}
          >
            <h3>Step 3 — Access Granted</h3>
            <p>
              Callback is cryptographically verified server-side. Your secure
              banking session begins.
            </p>
          </article>
        </div>
      </div>

      {/* System config (collapsed to technical details) */}
      <details className="form-wrap" style={{ cursor: "pointer" }}>
        <summary
          style={{ fontWeight: 700, fontSize: "0.9rem", color: "var(--muted)" }}
        >
          ⚙️ Technical Configuration (Developer Info)
        </summary>
        <div className="meta-list" style={{ marginTop: "0.75rem" }}>
          <div>
            <strong>API Base URL:</strong>{" "}
            <span>{demoBankConfig.visualApiBase}</span>
          </div>
          <div>
            <strong>Verify Origin:</strong>{" "}
            <span>{demoBankConfig.visualVerifyOrigin}</span>
          </div>
          <div>
            <strong>Bank Origin:</strong>{" "}
            <span>{demoBankConfig.publicOrigin}</span>
          </div>
          <div>
            <strong>Partner ID:</strong> <span>{demoBankConfig.partnerId}</span>
          </div>
          <div>
            <strong>Admin URL:</strong>{" "}
            <span>{demoBankConfig.visualAdminUrl}</span>
          </div>
        </div>
        {demoBankWarnings.length ?
          <div className="status warn" style={{ marginTop: "0.75rem" }}>
            <strong>⚠️ Warnings:</strong>
            <ul style={{ margin: "0.45rem 0 0", paddingInlineStart: "1rem" }}>
              {demoBankWarnings.map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
            </ul>
          </div>
        : null}
      </details>
    </section>
  );
}
