"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";

type RegisterResponse = {
  ok: boolean;
  user: {
    id: string;
    email: string;
    fullName: string;
    partnerUserId: string;
    accountNumber: string;
  };
  enrollUrl: string | null;
};

export default function RegisterPage() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [statusMsg, setStatusMsg] = useState("");
  const [createdAccount, setCreatedAccount] = useState<RegisterResponse["user"] | null>(null);
  const [enrollRedirectUrl, setEnrollRedirectUrl] = useState<string | null>(null);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage("");
    setStatusMsg("");
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/demo-bank/register", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ fullName, email, phone: phone.trim(), password }),
      });

      const data = (await response.json()) as RegisterResponse | { message?: string };
      if (!response.ok || !("ok" in data) || !data.ok) {
        throw new Error((data as { message?: string }).message || "Unable to register user.");
      }

      const regData = data as RegisterResponse;
      setCreatedAccount(regData.user);
      setEnrollRedirectUrl(regData.enrollUrl);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to register user.");
    } finally {
      setIsSubmitting(false);
    }
  };

  /* ── Account created screen ── */
  if (createdAccount) {
    return (
      <section className="page">
        <div style={{ maxWidth: 520, margin: "0 auto" }}>
          <div
            style={{
              background: "linear-gradient(135deg,#0a2540 0%,#1a4080 100%)",
              borderRadius: "16px 16px 0 0",
              padding: "28px 28px 24px",
              textAlign: "center",
              color: "#fff",
            }}
          >
            <div style={{ fontSize: 48, marginBottom: 8 }}>🎉</div>
            <h1 style={{ margin: 0, fontSize: "1.4rem", fontWeight: 800 }}>Account Created!</h1>
            <p style={{ margin: "6px 0 0", fontSize: "0.85rem", color: "rgba(255,255,255,.6)" }}>
              Welcome to Apex Federal Bank, {createdAccount.fullName.split(" ")[0]}
            </p>
          </div>

          <div
            style={{
              background: "#fff",
              border: "1px solid #e2e8f0",
              borderTop: "none",
              borderRadius: "0 0 16px 16px",
              padding: "28px",
            }}
          >
            {/* Account number — the most important info */}
            <div
              style={{
                background: "linear-gradient(135deg,#0a2540,#1a4080)",
                borderRadius: 14,
                padding: "22px 24px",
                marginBottom: 20,
                textAlign: "center",
                color: "#fff",
              }}
            >
              <p style={{ margin: "0 0 6px", fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.1em", color: "rgba(255,255,255,.6)" }}>
                📞 Your Bank Account Number
              </p>
              <p style={{ margin: 0, fontSize: 48, fontWeight: 900, fontFamily: "monospace", letterSpacing: 10 }}>
                {createdAccount.accountNumber}
              </p>
              <p style={{ margin: "10px 0 0", fontSize: 12, color: "rgba(255,255,255,.5)" }}>
                You&apos;ll need this to verify your identity if you call support.<br />
                <strong style={{ color: "#fbbf24" }}>Save this number — it will not be shown again.</strong>
              </p>
            </div>

            {/* Info rows */}
            {[
              { label: "Full Name", value: createdAccount.fullName },
              { label: "Email", value: createdAccount.email },
              { label: "Customer ID", value: createdAccount.partnerUserId },
            ].map((row) => (
              <div
                key={row.label}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  padding: "8px 0",
                  borderBottom: "1px solid #f1f5f9",
                  fontSize: 13,
                }}
              >
                <span style={{ color: "#64748b", fontWeight: 600 }}>{row.label}</span>
                <span style={{ color: "#0f172a", fontFamily: row.label === "Customer ID" ? "monospace" : undefined, fontSize: row.label === "Customer ID" ? 11 : 13 }}>
                  {row.value}
                </span>
              </div>
            ))}

            <div style={{ marginTop: 20, display: "flex", flexDirection: "column", gap: 10 }}>
              {enrollRedirectUrl ? (
                <button
                  style={{
                    background: "#0a2540",
                    color: "#fff",
                    border: "none",
                    borderRadius: 10,
                    padding: "13px",
                    fontWeight: 700,
                    fontSize: 14,
                    cursor: "pointer",
                  }}
                  onClick={() => window.location.assign(enrollRedirectUrl)}
                >
                  🔐 Continue to Set Up Visual Password →
                </button>
              ) : null}
              <Link
                href={`/login?registered=1&email=${encodeURIComponent(email)}`}
                style={{
                  display: "block",
                  textAlign: "center",
                  padding: "11px",
                  borderRadius: 10,
                  border: "1.5px solid #e2e8f0",
                  color: "#0a2540",
                  fontWeight: 600,
                  fontSize: 14,
                  textDecoration: "none",
                }}
              >
                Sign In to Your Account
              </Link>
            </div>

            <p style={{ textAlign: "center", fontSize: 11, color: "#94a3b8", margin: "16px 0 0" }}>
              🔒 Your account number is your identity key when calling bank support.
            </p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="page">
      <div style={{ maxWidth: 560, margin: "0 auto" }}>
        {/* Register header */}
        <div
          style={{
            textAlign: "center",
            padding: "2rem 1.5rem 1.5rem",
            background: "linear-gradient(135deg, var(--navy) 0%, var(--navy-light) 100%)",
            borderRadius: "var(--radius-lg) var(--radius-lg) 0 0",
            color: "#fff",
          }}
        >
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 14,
              background: "rgba(201,168,76,.15)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "1.5rem",
              margin: "0 auto 0.75rem",
              border: "1px solid rgba(201,168,76,.25)",
            }}
          >
            🏦
          </div>
          <h1
            style={{
              margin: 0,
              fontSize: "1.35rem",
              fontFamily: "var(--font-space-grotesk), sans-serif",
              fontWeight: 700,
            }}
          >
            Open Your Account
          </h1>
          <p style={{ margin: "0.4rem 0 0", fontSize: "0.85rem", color: "rgba(255,255,255,.6)" }}>
            Join 2M+ customers who trust Apex Federal Bank
          </p>
        </div>

        {/* Registration form */}
        <form
          className="form-wrap"
          onSubmit={submit}
          style={{ borderTopLeftRadius: 0, borderTopRightRadius: 0, marginTop: 0, padding: "1.5rem" }}
        >
          <div className="grid-two">
            <div className="field">
              <label htmlFor="fullName">Full Name</label>
              <input
                id="fullName"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                minLength={2}
                placeholder="John Smith"
              />
            </div>
            <div className="field">
              <label htmlFor="email">Email Address</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="john@example.com"
              />
            </div>
            <div className="field">
              <label htmlFor="phone">Mobile Number (for support verification)</label>
              <input
                id="phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
                placeholder="+91 98765 43210"
              />
            </div>
            <div className="field">
              <label htmlFor="password">Choose Password</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                placeholder="Min. 8 characters"
              />
            </div>
          </div>

          {/* Phone hint */}
          <div
            style={{
              background: "#f0fdf4",
              border: "1px solid #bbf7d0",
              borderRadius: 8,
              padding: "10px 14px",
              fontSize: 12,
              color: "#166534",
              marginBottom: 12,
            }}
          >
            📞 Your mobile number will be used to verify your identity when you call bank support for password recovery.
          </div>

          {errorMessage ? <div className="status error">⚠ {errorMessage}</div> : null}
          {statusMsg ? <div className="status success">✓ {statusMsg}</div> : null}

          <button
            className="btn btn-primary"
            type="submit"
            disabled={isSubmitting}
            style={{ width: "100%", padding: "0.75rem", fontSize: "0.95rem" }}
          >
            {isSubmitting ? "Creating your account…" : "Create Account & Set Up Visual Password"}
          </button>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.35rem", fontSize: "0.85rem", color: "var(--muted)" }}>
            Already have an account?{" "}
            <Link href="/login" style={{ color: "var(--accent)", fontWeight: 600 }}>Sign In</Link>
          </div>

          {/* Benefits */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem", marginTop: "0.25rem" }}>
            {[
              { icon: "🔒", text: "256-bit encryption" },
              { icon: "🛡️", text: "Visual password security" },
              { icon: "📱", text: "24/7 account access" },
              { icon: "📞", text: "Free support recovery" },
            ].map((benefit) => (
              <div
                key={benefit.text}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.4rem",
                  padding: "0.5rem 0.65rem",
                  background: "var(--panel-soft)",
                  borderRadius: 8,
                  fontSize: "0.78rem",
                  color: "var(--muted)",
                  fontWeight: 600,
                }}
              >
                <span>{benefit.icon}</span>
                {benefit.text}
              </div>
            ))}
          </div>
        </form>
      </div>
    </section>
  );
}
