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
    if (searchParams.get("registered") === "1") {
      return "Account created successfully. Please sign in to continue.";
    }
    if (searchParams.get("loggedOut") === "1") {
      return "You have been securely logged out.";
    }
    if (searchParams.get("enrolled") === "1") {
      return "Visual password configured! You can now sign in securely.";
    }
    return "";
  }, [searchParams]);

  const callbackError = searchParams.get("error");
  const enrollError = searchParams.get("enrollError");

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage("");
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/demo-bank/login/start", {
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
        throw new Error(data.message || "Unable to start login.");
      }

      // No visual profile yet → redirect to SaaS enrollment UI
      if (data.needsEnroll && data.enrollUrl) {
        window.location.assign(data.enrollUrl);
        return;
      }

      if (!data.verifyUrl) {
        throw new Error(data.message || "Unable to start visual verification.");
      }

      window.location.assign(data.verifyUrl);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Login failed.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="page">
      <div style={{ maxWidth: 480, margin: "0 auto" }}>
        {/* Login header card */}
        <div
          style={{
            textAlign: "center",
            padding: "2rem 1.5rem 1.5rem",
            background:
              "linear-gradient(135deg, var(--navy) 0%, var(--navy-light) 100%)",
            borderRadius: "var(--radius-lg) var(--radius-lg) 0 0",
            color: "#fff",
          }}
        >
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 14,
              background: "rgba(255,255,255,.12)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "1.5rem",
              margin: "0 auto 0.75rem",
              border: "1px solid rgba(255,255,255,.15)",
            }}
          >
            🔐
          </div>
          <h1
            style={{
              margin: 0,
              fontSize: "1.35rem",
              fontFamily: "var(--font-space-grotesk), sans-serif",
              fontWeight: 700,
            }}
          >
            Secure Sign In
          </h1>
          <p
            style={{
              margin: "0.4rem 0 0",
              fontSize: "0.85rem",
              color: "rgba(255,255,255,.6)",
            }}
          >
            Enter your credentials to access your account
          </p>
        </div>

        {/* Login form */}
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
          <div className="field">
            <label htmlFor="email">Email Address</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              placeholder="you@example.com"
            />
          </div>
          <div className="field">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              placeholder="••••••••"
            />
          </div>

          {successMessage ?
            <div className="status success">✓ {successMessage}</div>
          : null}
          {callbackError ?
            <div className="status error">
              ⚠ Visual verification failed: {decodeURIComponent(callbackError)}
            </div>
          : null}
          {enrollError ?
            <div className="status error">
              ⚠ Visual password setup failed: {decodeURIComponent(enrollError)}
            </div>
          : null}
          {errorMessage ?
            <div className="status error">⚠ {errorMessage}</div>
          : null}

          <button
            className="btn btn-primary"
            type="submit"
            disabled={isSubmitting}
            style={{ width: "100%", padding: "0.75rem", fontSize: "0.95rem" }}
          >
            {isSubmitting ? "Verifying credentials…" : "Sign In"}
          </button>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.35rem",
              fontSize: "0.85rem",
              color: "var(--muted)",
            }}
          >
            Don&apos;t have an account?{" "}
            <Link
              href="/register"
              style={{
                color: "var(--accent)",
                fontWeight: 600,
              }}
            >
              Open Account
            </Link>
          </div>

          {/* Security notice */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              padding: "0.65rem 0.8rem",
              background: "var(--accent-soft)",
              borderRadius: 8,
              fontSize: "0.8rem",
              color: "var(--muted)",
              lineHeight: 1.4,
            }}
          >
            <span style={{ fontSize: "1rem" }}>🛡️</span>
            <span>
              After password verification, you&apos;ll complete a visual
              security challenge to access your account.
            </span>
          </div>
        </form>
      </div>
    </section>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <section className="page">
          <div
            style={{
              textAlign: "center",
              padding: "3rem",
              color: "var(--muted)",
            }}
          >
            Loading secure sign-in…
          </div>
        </section>
      }
    >
      <LoginPageContent />
    </Suspense>
  );
}
