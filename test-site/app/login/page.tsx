"use client";

import Link from "next/link";
import { Suspense, useMemo, useState, type FormEvent } from "react";
import { useSearchParams } from "next/navigation";

function LoginPageContent() {
  const searchParams = useSearchParams();
  const [email, setEmail] = useState(searchParams.get("email") || "");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const successMessage = useMemo(() => {
    if (searchParams.get("registered") === "1")
      return "Wallet created. Unlock to continue.";
    if (searchParams.get("loggedOut") === "1")
      return "Wallet locked successfully.";
    if (searchParams.get("enrolled") === "1")
      return "Visual key set up! You can now unlock.";
    return "";
  }, [searchParams]);

  const callbackError = searchParams.get("error");
  const enrollError = searchParams.get("enrollError");

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage("");
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/wallet/login/start", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = (await response.json()) as {
        message?: string;
        verifyUrl?: string;
        needsEnroll?: boolean;
        enrollUrl?: string;
      };

      if (!response.ok) {
        throw new Error(data.message || "Unable to unlock wallet.");
      }

      if (data.needsEnroll && data.enrollUrl) {
        window.location.assign(data.enrollUrl);
        return;
      }

      if (!data.verifyUrl) {
        throw new Error(data.message || "Unable to start visual verification.");
      }

      window.location.assign(data.verifyUrl);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Unlock failed.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="page">
      <div className="wallet-card">
        <div className="wallet-card-header">
          <div className="wallet-icon">🔐</div>
          <h1>Unlock Wallet</h1>
          <p>
            Enter your credentials to unlock. Visual verification follows
            automatically.
          </p>
        </div>

        <div className="wallet-card-body">
          <form className="form-wrap" onSubmit={submit}>
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
                placeholder="••••••••"
                required
              />
            </div>

            {successMessage && (
              <div className="status success">{successMessage}</div>
            )}
            {callbackError && (
              <div className="status error">
                Visual callback failed: {decodeURIComponent(callbackError)}
              </div>
            )}
            {enrollError && (
              <div className="status error">
                Visual key setup failed: {decodeURIComponent(enrollError)}
              </div>
            )}
            {errorMessage && <div className="status error">{errorMessage}</div>}

            <button
              className="btn btn-primary btn-full"
              type="submit"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Unlocking…" : "Unlock"}
            </button>

            <div className="separator">or</div>

            <Link className="btn btn-muted btn-full" href="/register">
              Create New Wallet
            </Link>
          </form>
        </div>
      </div>
    </section>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<section className="page">Loading…</section>}>
      <LoginPageContent />
    </Suspense>
  );
}
