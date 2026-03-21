"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";

type RegisterResponse = {
  ok: boolean;
  user: { id: string; email: string; fullName: string; partnerUserId: string };
  enrollUrl: string | null;
};

export default function RegisterPage() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
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
      const response = await fetch("/api/wallet/register", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          fullName,
          email,
          password,
          partnerUserId: partnerUserId.trim() || undefined,
        }),
      });

      const data = (await response.json()) as
        | RegisterResponse
        | { message?: string };
      if (!response.ok || !("ok" in data) || !data.ok) {
        throw new Error(
          (data as { message?: string }).message || "Unable to create wallet.",
        );
      }

      const regData = data as RegisterResponse;

      if (regData.enrollUrl) {
        setStatusMsg("Wallet created! Redirecting to visual key setup…");
        setTimeout(() => {
          window.location.assign(regData.enrollUrl!);
        }, 800);
      } else {
        setStatusMsg("Wallet created! Redirecting to unlock…");
        setTimeout(() => {
          window.location.assign(
            `/login?registered=1&email=${encodeURIComponent(email.trim().toLowerCase())}`,
          );
        }, 1000);
      }
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Unable to create wallet.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="page">
      <div className="wallet-card">
        <div className="wallet-card-header">
          <div className="wallet-icon">🦊</div>
          <h1>Create New Wallet</h1>
          <p>
            Set up your wallet with a visual password for an extra layer of
            security on every login.
          </p>
        </div>

        <div className="wallet-card-body">
          <form className="form-wrap" onSubmit={submit}>
            <div className="field">
              <label htmlFor="fullName">Full Name</label>
              <input
                id="fullName"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="John Doe"
                required
                minLength={2}
              />
            </div>
            <div className="field">
              <label htmlFor="email">Email Address</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
              />
            </div>
            <div className="field">
              <label htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Min. 8 characters"
                required
                minLength={8}
              />
              <p className="hint">Must be at least 8 characters</p>
            </div>
            <div className="field">
              <label htmlFor="partnerUserId">Wallet ID (Optional)</label>
              <input
                id="partnerUserId"
                value={partnerUserId}
                onChange={(e) => setPartnerUserId(e.target.value)}
                placeholder="Auto-generated if blank"
              />
            </div>

            {errorMessage && <div className="status error">{errorMessage}</div>}
            {statusMsg && <div className="status success">{statusMsg}</div>}

            <button
              className="btn btn-primary btn-full"
              type="submit"
              disabled={isSubmitting}
            >
              {isSubmitting ?
                "Creating Wallet…"
              : "Create Wallet & Set Visual Key"}
            </button>

            <div className="separator">or</div>

            <Link className="btn btn-muted btn-full" href="/login">
              Already have a wallet? Unlock
            </Link>
          </form>
        </div>
      </div>
    </section>
  );
}
