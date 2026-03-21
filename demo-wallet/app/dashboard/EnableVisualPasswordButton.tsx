"use client";

import { useState } from "react";

type Props = {
  mode: "enroll" | "re-enroll";
};

export default function EnableVisualPasswordButton({ mode }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleClick = async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/demo-wallet/enroll/start", {
        method: "POST",
      });

      const data = (await response.json()) as {
        ok?: boolean;
        enrollUrl?: string;
        message?: string;
      };

      if (!response.ok || !data.enrollUrl) {
        throw new Error(data.message || "Unable to start enrollment.");
      }

      window.location.assign(data.enrollUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Enrollment failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        className={mode === "re-enroll" ? "btn btn-outline" : "btn btn-accent"}
        onClick={handleClick}
        disabled={loading}
      >
        {loading
          ? "Starting…"
          : mode === "re-enroll"
            ? "🔄 Update Visual Password"
            : "🛡️ Enable Visual Password"}
      </button>
      {error && (
        <div className="status error" style={{ marginTop: "0.5rem", textAlign: "center" }}>
          ⚠ {error}
        </div>
      )}
    </>
  );
}
