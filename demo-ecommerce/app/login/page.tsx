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
        if (searchParams.get("registered") === "1") return "Account created! Login to continue.";
        if (searchParams.get("loggedOut") === "1") return "Logged out successfully.";
        if (searchParams.get("enrolled") === "1")
            return "Visual password set up! You can now login.";
        return "";
    }, [searchParams]);

    const callbackError = searchParams.get("error");
    const enrollError = searchParams.get("enrollError");

    const submit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setErrorMessage("");
        setIsSubmitting(true);

        try {
            const response = await fetch("/api/demo-shop/login/start", {
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

            if (!response.ok) throw new Error(data.message || "Unable to start login.");

            if (data.needsEnroll && data.enrollUrl) {
                window.location.assign(data.enrollUrl);
                return;
            }

            if (!data.verifyUrl)
                throw new Error(data.message || "Unable to start visual verification.");
            window.location.assign(data.verifyUrl);
        } catch (error) {
            setErrorMessage(error instanceof Error ? error.message : "Login failed.");
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
                        <h2>Login</h2>
                        <p>
                            Get access to your Orders, Wishlist and Recommendations — protected by
                            visual password verification.
                        </p>
                    </div>
                    <div className="auth-sidebar-art">🛒</div>
                </div>

                {/* Right form area */}
                <form className="auth-form" onSubmit={submit}>
                    {successMessage ? <div className="status success">{successMessage}</div> : null}
                    {callbackError ? (
                        <div className="status error">
                            Visual callback failed: {decodeURIComponent(callbackError)}
                        </div>
                    ) : null}
                    {enrollError ? (
                        <div className="status error">
                            Visual setup failed: {decodeURIComponent(enrollError)}
                        </div>
                    ) : null}
                    {errorMessage ? <div className="status error">{errorMessage}</div> : null}

                    <div className="field">
                        <label htmlFor="email">Email</label>
                        <input
                            id="email"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="Enter your email"
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
                            placeholder="Enter your password"
                            required
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
                        Visual password verification will follow automatically.
                    </p>

                    <button
                        className="btn btn-primary"
                        type="submit"
                        disabled={isSubmitting}
                        style={{ width: "100%", justifyContent: "center", marginTop: "0.5rem" }}
                    >
                        {isSubmitting ? "Redirecting…" : "Login"}
                    </button>

                    <div style={{ textAlign: "center", marginTop: "auto", paddingTop: "1rem" }}>
                        <Link
                            href="/register"
                            style={{
                                color: "var(--brand)",
                                fontWeight: 600,
                                fontSize: "0.88rem",
                            }}
                        >
                            New to ShopMart? Create an account
                        </Link>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default function LoginPage() {
    return (
        <Suspense>
            <LoginPageContent />
        </Suspense>
    );
}
