"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";

type RegisterResponse = {
  ok: boolean;
  user: {
    id: string;
    email: string;
    phone: string;
    fullName: string;
    partnerUserId: string;
  };
  enrollUrl: string | null;
};

export default function RegisterPage() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [partnerUserId, setPartnerUserId] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [statusMsg, setStatusMsg] = useState("");

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage("");
    setStatusMsg("");
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/demo-wallet/register", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          fullName,
          email,
          phone,
          password,
          partnerUserId: partnerUserId.trim() || undefined,
        }),
      });

      const data = (await response.json()) as
        | RegisterResponse
        | { message?: string };
      if (!response.ok || !("ok" in data) || !data.ok) {
        throw new Error(
          (data as { message?: string }).message || "Unable to register user.",
        );
      }

      const regData = data as RegisterResponse;

      if (regData.enrollUrl) {
        setStatusMsg("Wallet created! Redirecting to visual password setup…");
        setTimeout(() => {
          window.location.assign(regData.enrollUrl!);
        }, 800);
      } else {
        setStatusMsg("Wallet created! Redirecting to sign in…");
        setTimeout(() => {
          window.location.assign(
            `/login?registered=1&email=${encodeURIComponent(email.trim().toLowerCase())}`,
          );
        }, 1000);
      }
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Unable to register user.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="page">
      <div style={{ maxWidth: 560, margin: "0 auto" }}>
        {/* Register header */}
        <div
          style={{
            textAlign: "center",
            padding: "2rem 1.5rem 1.5rem",
            background:
              "linear-gradient(135deg, var(--primary-dark) 0%, #312e81 100%)",
            borderRadius: "var(--radius-lg) var(--radius-lg) 0 0",
            color: "#fff",
          }}
        >
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 14,
              background: "rgba(167,139,250,.15)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "1.5rem",
              margin: "0 auto 0.75rem",
              border: "1px solid rgba(167,139,250,.25)",
            }}
          >
            💳
          </div>
          <h1
            style={{
              margin: 0,
              fontSize: "1.35rem",
              fontFamily: "var(--font-space-grotesk), sans-serif",
              fontWeight: 700,
            }}
          >
            Create Your Wallet
          </h1>
          <p
            style={{
              margin: "0.4rem 0 0",
              fontSize: "0.85rem",
              color: "rgba(255,255,255,.6)",
            }}
          >
            Join millions who trust NexusPay for secure payments
          </p>
        </div>

        {/* Registration form */}
        <form
          className="form-wrap"
          onSubmit={submit}
          style={{
            borderTopLeftRadius: 0,
            borderTopRightRadius: 0,
            marginTop: 0,
            padding: "1.5rem",
          }}
        >
          <div className="grid-two">
            <div className="field">
              <label htmlFor="fullName">Full Name</label>
              <input
                id="fullName"
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
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
                onChange={(event) => setEmail(event.target.value)}
                required
                placeholder="john@example.com"
              />
            </div>
            <div className="field">
              <label htmlFor="phone">Phone Number</label>
              <input
                id="phone"
                type="tel"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                required
                placeholder="+91 9876543210"
              />
            </div>
            <div className="field">
              <label htmlFor="password">Choose PIN / Password</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                minLength={6}
                placeholder="Min. 6 characters"
              />
            </div>
          </div>

          <div className="field">
            <label htmlFor="partnerUserId">Wallet ID (Optional)</label>
            <input
              id="partnerUserId"
              value={partnerUserId}
              onChange={(event) => setPartnerUserId(event.target.value)}
              placeholder="Auto-generated if blank"
            />
          </div>

          {errorMessage ?
            <div className="status error">⚠ {errorMessage}</div>
          : null}
          {statusMsg ?
            <div className="status success">✓ {statusMsg}</div>
          : null}

          <button
            className="btn btn-primary"
            type="submit"
            disabled={isSubmitting}
            style={{ width: "100%", padding: "0.75rem", fontSize: "0.95rem" }}
          >
            {isSubmitting ?
              "Creating your wallet…"
            : "Create Wallet & Set Up Visual Password"}
          </button>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.35rem",
              fontSize: "0.85rem",
              color: "var(--text-muted)",
            }}
          >
            Already have a wallet?{" "}
            <Link
              href="/login"
              style={{
                color: "var(--primary-light)",
                fontWeight: 600,
              }}
            >
              Sign In
            </Link>
          </div>

          {/* Benefits */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "0.5rem",
              marginTop: "0.25rem",
            }}
          >
            {[
              { icon: "🔒", text: "End-to-end encryption" },
              { icon: "🛡️", text: "Visual password security" },
              { icon: "⚡", text: "Instant transfers" },
              { icon: "💰", text: "₹10,000 welcome bonus" },
            ].map((benefit) => (
              <div
                key={benefit.text}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.4rem",
                  padding: "0.5rem 0.65rem",
                  background: "var(--bg-surface)",
                  borderRadius: 8,
                  fontSize: "0.78rem",
                  color: "var(--text-muted)",
                  fontWeight: 600,
                  border: "1px solid var(--border)",
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
