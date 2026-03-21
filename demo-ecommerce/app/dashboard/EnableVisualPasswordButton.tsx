"use client";

import { useState } from "react";

type Props = { mode: "enroll" | "re-enroll" };

export default function EnableVisualPasswordButton({ mode }: Props) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const handleClick = async () => {
        setLoading(true);
        setError("");
        try {
            const res = await fetch("/api/demo-shop/enroll/start", { method: "POST" });
            const data = (await res.json()) as { enrollUrl?: string; message?: string };
            if (!res.ok || !data.enrollUrl)
                throw new Error(data.message || "Unable to start setup.");
            window.location.assign(data.enrollUrl);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to start visual setup.");
            setLoading(false);
        }
    };

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
            <button
                className="btn btn-primary"
                onClick={handleClick}
                disabled={loading}
                style={{ width: "100%", justifyContent: "center" }}
            >
                {loading
                    ? "Redirecting…"
                    : mode === "enroll"
                      ? "🔒 Set Up Visual Password"
                      : "🔄 Update Visual Password"}
            </button>
            {error ? (
                <span style={{ fontSize: "0.8rem", color: "var(--danger)" }}>{error}</span>
            ) : null}
        </div>
    );
}
