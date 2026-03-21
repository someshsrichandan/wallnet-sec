import Link from "next/link";

import { siteConfig } from "@/lib/config";

export default function HomePage() {
  return (
    <section className="page">
      <div className="hero">
        <div className="hero-icon">🦊</div>
        <h1>SecureWallet</h1>
        <p>
          A crypto wallet experience with visual password verification.
          Register, login with password + visual challenge, and test the full
          authentication callback flow.
        </p>
        <div className="cta-row">
          <Link className="btn btn-primary" href="/register">
            Create Wallet
          </Link>
          <Link className="btn btn-soft" href="/login">
            Unlock Wallet
          </Link>
          <Link className="btn btn-muted" href="/dashboard">
            Portfolio
          </Link>
        </div>
      </div>

      <div
        className="cards"
        style={{ maxWidth: 900, margin: "1.25rem auto 0" }}
      >
        <article className="card">
          <div className="card-step">1</div>
          <h3>Create Wallet</h3>
          <p>
            Register a new account. After creation you&apos;ll be redirected to
            set up your visual password — your unique visual key.
          </p>
        </article>
        <article className="card">
          <div className="card-step">2</div>
          <h3>Unlock & Verify</h3>
          <p>
            Enter your credentials. The app calls <code>/init-auth</code> and
            redirects you to the hosted visual challenge for verification.
          </p>
        </article>
        <article className="card">
          <div className="card-step">3</div>
          <h3>Secure Session</h3>
          <p>
            After passing the visual challenge, the result is validated via{" "}
            <code>/consume-result</code> and your wallet session is activated.
          </p>
        </article>
      </div>

      <div
        className="config-panel"
        style={{ maxWidth: 900, margin: "1rem auto 0" }}
      >
        <h3>Network Configuration</h3>
        <div className="config-row">
          <span className="config-key">API Base</span>
          <span className="config-val">{siteConfig.visualApiBase}</span>
        </div>
        <div className="config-row">
          <span className="config-key">Verify Origin</span>
          <span className="config-val">{siteConfig.visualVerifyOrigin}</span>
        </div>
        <div className="config-row">
          <span className="config-key">Site Origin</span>
          <span className="config-val">{siteConfig.publicOrigin}</span>
        </div>
        <div className="config-row">
          <span className="config-key">Partner ID</span>
          <span className="config-val">{siteConfig.partnerId}</span>
        </div>
        <div className="config-row">
          <span className="config-key">API Key</span>
          <span className="config-val">
            {(
              siteConfig.apiKey &&
              siteConfig.apiKey !== "PASTE_YOUR_API_KEY_HERE"
            ) ?
              `••••••${siteConfig.apiKey.slice(-8)}`
            : "NOT SET"}
          </span>
        </div>
      </div>
    </section>
  );
}
