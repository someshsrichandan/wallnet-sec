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
            const response = await fetch("/api/demo-shop/register", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({
                    fullName,
                    email,
                    password,
                    partnerUserId: partnerUserId.trim() || undefined,
                }),
            });

            const data = (await response.json()) as RegisterResponse | { message?: string };
            if (!response.ok || !("ok" in data) || !data.ok) {
                throw new Error((data as { message?: string }).message || "Unable to register.");
            }

            const regData = data as RegisterResponse;
            if (regData.enrollUrl) {
                setStatusMsg("Account created! Redirecting to visual password setup…");
                setTimeout(() => window.location.assign(regData.enrollUrl!), 800);
            } else {
                setStatusMsg("Account created! Redirecting to login…");
                setTimeout(
                    () =>
                        window.location.assign(
                            `/login?registered=1&email=${encodeURIComponent(email.trim().toLowerCase())}`,
                        ),
                    1000,
                );
            }
        } catch (error) {
            setErrorMessage(error instanceof Error ? error.message : "Unable to register.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="auth-layout">
            <div className="auth-card">
                {/* Left blue sidebar */}
                <div className="auth-sidebar">
                    <div>
                        <h2>Looks like you&apos;re new here!</h2>
                        <p>
                            Sign up with your details to get started. Your visual password will be
                            set up right after registration.
                        </p>
                    </div>
                    <div className="auth-sidebar-art">🛍️</div>
                </div>

                {/* Right form area */}
                <form className="auth-form" onSubmit={submit}>
                    {statusMsg ? <div className="status success">{statusMsg}</div> : null}
                    {errorMessage ? <div className="status error">{errorMessage}</div> : null}

                    <div className="field">
                        <label htmlFor="fullName">Full Name</label>
                        <input
                            id="fullName"
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                            placeholder="Enter your full name"
                            required
                            minLength={2}
                        />
                    </div>
                    <div className="field">
                        <label htmlFor="email">Email</label>
                        <input
                            id="email"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="Enter your email address"
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
                            placeholder="Min 8 characters"
                            required
                            minLength={8}
                        />
                    </div>
                    <div className="field">
                        <label htmlFor="partnerUserId">Customer ID (optional)</label>
                        <input
                            id="partnerUserId"
                            value={partnerUserId}
                            onChange={(e) => setPartnerUserId(e.target.value)}
                            placeholder="Auto-generated if blank"
                        />
                    </div>

                    <p
                        style={{
                            fontSize: "0.75rem",
                            color: "var(--ink-secondary)",
                            lineHeight: 1.5,
                            margin: "0.5rem 0 0",
                        }}
                    >
                        By continuing, you agree to ShopMart&apos;s Terms of Use and Privacy Policy.
                    </p>

                    <button
                        className="btn btn-primary"
                        type="submit"
                        disabled={isSubmitting}
                        style={{ width: "100%", justifyContent: "center" }}
                    >
                        {isSubmitting ? "Creating…" : "Continue"}
                    </button>

                    <div style={{ textAlign: "center", marginTop: "auto", paddingTop: "1rem" }}>
                        <Link
                            href="/login"
                            style={{
                                color: "var(--brand)",
                                fontWeight: 600,
                                fontSize: "0.88rem",
                            }}
                        >
                            Existing User? Log in
                        </Link>
                    </div>
                </form>
            </div>
        </div>
    );
}
