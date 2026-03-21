"use client";

import { useState } from "react";

type Mode = "enroll" | "re-enroll";
type Variant = "button" | "action";

export default function EnableVisualPasswordButton({
  mode,
  variant = "button",
}: {
  mode: Mode;
  variant?: Variant;
}) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const isReEnroll = mode === "re-enroll";

  const handleClick = async () => {
    setError("");
    setIsLoading(true);
    try {
      const response = await fetch("/api/wallet/enroll/start", {
        method: "POST",
      });
      const data = (await response.json()) as {
        ok?: boolean;
        enrollUrl?: string;
        message?: string;
      };

      if (!response.ok) {
        throw new Error(data.message || "Unable to start visual key setup.");
      }

      const target = data.enrollUrl;
      if (!target) throw new Error("No redirect URL returned.");

      window.location.assign(target);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Setup failed.");
      setIsLoading(false);
    }
  };

  // ─── Action bar variant (dashboard grid button) ───
  if (variant === "action") {
    return (
      <div>
        <button
          className="action-btn"
          onClick={handleClick}
          disabled={isLoading}
          type="button"
        >
          <span className="action-icon action-icon--shield">🛡</span>
          {isLoading ?
            "Setting up…"
          : isReEnroll ?
            "Reset Key"
          : "Shield"}
        </button>
        {error && (
          <p
            style={{
              color: "#f97583",
              marginTop: "0.3rem",
              fontSize: "0.78rem",
              textAlign: "center",
            }}
          >
            {error}
          </p>
        )}
      </div>
    );
  }

  // ─── Standard button variant ───
  return (
    <div>
      <button
        className={`btn ${isReEnroll ? "btn-soft" : "btn-primary"}`}
        onClick={handleClick}
        disabled={isLoading}
        type="button"
      >
        {isLoading ?
          "Redirecting to setup…"
        : isReEnroll ?
          "Change Visual Key"
        : "Enable Visual Key"}
      </button>
      {error && (
        <p
          style={{
            color: "#f97583",
            marginTop: "0.4rem",
            fontSize: "0.85rem",
          }}
        >
          {error}
        </p>
      )}
    </div>
  );
}
