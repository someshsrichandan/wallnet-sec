"use client";

import { useState } from "react";

type Mode = "enroll" | "re-enroll";

/**
 * mode="enroll"     → first-time setup, goes straight to SaaS enrollment page
 * mode="re-enroll"  → change existing password; must re-verify with current
 *                     visual password before enrollment starts
 */
export default function EnableVisualPasswordButton({ mode }: { mode: Mode }) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const isReEnroll = mode === "re-enroll";

  const handleClick = async () => {
    setError("");
    setIsLoading(true);
    try {
      const endpoint =
        isReEnroll ?
          "/api/demo-bank/re-enroll/start"
        : "/api/demo-bank/enroll/start";

      const response = await fetch(endpoint, { method: "POST" });
      const data = (await response.json()) as {
        ok?: boolean;
        verifyUrl?: string;
        enrollUrl?: string;
        message?: string;
      };

      if (!response.ok) {
        throw new Error(
          data.message || "Unable to start visual password setup.",
        );
      }

      // re-enroll goes to visual challenge first; enroll goes straight to SaaS setup
      const target = data.verifyUrl ?? data.enrollUrl;
      if (!target) throw new Error("No redirect URL returned.");

      window.location.assign(target);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Setup failed.");
      setIsLoading(false);
    }
  };

  return (
    <div>
      <button
        className={`btn ${isReEnroll ? "btn-outline-white" : "btn-white"}`}
        onClick={handleClick}
        disabled={isLoading}
        type="button"
      >
        {isLoading ?
          isReEnroll ?
            "Starting re-verification…"
          : "Redirecting to setup…"
        : isReEnroll ?
          "🔄 Change Visual Password"
        : "🛡️ Enable Visual Password"}
      </button>
      {isReEnroll && !isLoading && (
        <p
          style={{
            margin: "0.35rem 0 0",
            fontSize: "0.76rem",
            color: "rgba(255,255,255,.5)",
          }}
        >
          You&apos;ll re-verify your current visual password before changing.
        </p>
      )}
      {error && (
        <p
          style={{ color: "#fca5a5", marginTop: "0.4rem", fontSize: "0.82rem" }}
        >
          {error}
        </p>
      )}
    </div>
  );
}
