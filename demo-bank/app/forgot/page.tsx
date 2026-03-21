"use client";

import Link from "next/link";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";

function ForgotPageContent() {
  const searchParams = useSearchParams();
  const email = searchParams.get("email") || "";

  const steps = [
    {
      icon: "📞",
      title: "Call Bank Support",
      desc: "Call our 24/7 helpline. A recovery agent will answer immediately.",
      color: "#3b82f6",
      bg: "#eff6ff",
    },
    {
      icon: "🔢",
      title: "Read Your Account Number",
      desc: "The agent will ask for your registered 6-digit Bank Account Number.",
      color: "#8b5cf6",
      bg: "#f5f3ff",
    },
    {
      icon: "📱",
      title: "Automatic Number Verification",
      desc: "For identity check, bank system auto-detects your call number and verifies it against your registered mobile profile.",
      color: "#0ea5e9",
      bg: "#ecfeff",
    },
    {
      icon: "📧",
      title: "Receive OTP on Mobile",
      desc: "Our system automatically sends a one-time code to your registered mobile number.",
      color: "#f59e0b",
      bg: "#fffbeb",
    },
    {
      icon: "🗣️",
      title: "Read OTP to Agent",
      desc: "Tell the agent the 6-digit OTP from your mobile SMS. They verify it in the system.",
      color: "#10b981",
      bg: "#f0fdf4",
    },
    {
      icon: "🔗",
      title: "Get Reset Link",
      desc: "Once verified, our system automatically emails you a secure reset link. Click it to set a new visual password.",
      color: "#ef4444",
      bg: "#fef2f2",
    },
  ];

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f8fafc",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "32px 16px",
        fontFamily: "'Inter','Segoe UI',Arial,sans-serif",
      }}
    >
      <div style={{ width: "100%", maxWidth: 500 }}>
        {/* Card */}
        <div
          style={{
            background: "#fff",
            borderRadius: 20,
            overflow: "hidden",
            boxShadow: "0 8px 40px rgba(0,0,0,0.10)",
          }}
        >
          {/* Header */}
          <div
            style={{
              background: "linear-gradient(135deg,#0f1f3d 0%,#1a3a6d 100%)",
              padding: "28px 28px 24px",
              textAlign: "center",
              color: "#fff",
            }}
          >
            <div style={{ fontSize: 44, marginBottom: 8 }}>🎧</div>
            <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800 }}>
              Contact Bank Agent
            </h1>
            <p style={{ margin: "6px 0 0", fontSize: 13, color: "rgba(255,255,255,.55)" }}>
              Our agents will reset your visual password securely over the phone
            </p>
          </div>

          {/* Call CTA */}
          <div
            style={{
              background: "#0f1f3d",
              padding: "18px 28px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 16,
            }}
          >
            <div>
              <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,.5)", textTransform: "uppercase", letterSpacing: "0.1em" }}>
                24/7 Recovery Helpline
              </p>
              <p style={{ margin: "2px 0 0", fontSize: 22, fontWeight: 900, fontFamily: "monospace", color: "#fff", letterSpacing: 2 }}>
                1800-XXX-XXXX
              </p>
              <p style={{ margin: "2px 0 0", fontSize: 11, color: "#4ade80" }}>
                ● Free · Available 24 hours
              </p>
            </div>
            <a
              href="tel:1800XXXXXXX"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                background: "#22c55e",
                color: "#fff",
                padding: "12px 20px",
                borderRadius: 10,
                textDecoration: "none",
                fontWeight: 800,
                fontSize: 14,
                flexShrink: 0,
                animation: "pulse 2s infinite",
              }}
            >
              📞 Call Now
            </a>
          </div>

          {/* Fallback support */}
          <div
            style={{
              background: "#fef2f2",
              border: "1px solid #fecaca",
              margin: "14px 22px 0",
              borderRadius: 10,
              padding: "12px 14px",
            }}
          >
            <p style={{ margin: 0, fontSize: 12, fontWeight: 800, color: "#991b1b" }}>
              Having trouble with agent recovery?
            </p>
            <p style={{ margin: "6px 0 0", fontSize: 12, color: "#7f1d1d", lineHeight: 1.6 }}>
              Call customer support immediately at <strong>1800-XXX-XXXX</strong> or
              visit your nearest bank branch for in-person identity verification.
            </p>
          </div>

          {/* Have ready info */}
          <div
            style={{
              background: "#fffbeb",
              border: "1px solid #fef08a",
              margin: "16px 22px 0",
              borderRadius: 10,
              padding: "12px 16px",
              display: "flex",
              alignItems: "flex-start",
              gap: 10,
            }}
          >
            <span style={{ fontSize: 20, flexShrink: 0 }}>⚠️</span>
            <div>
              <p style={{ margin: 0, fontSize: 12, fontWeight: 800, color: "#92400e" }}>
                Have ready before calling:
              </p>
              <ul style={{ margin: "4px 0 0", paddingLeft: 16, fontSize: 12, color: "#78350f", lineHeight: 1.8 }}>
                <li>Your <strong>registered 6-digit Bank Account Number</strong></li>
                <li>Your <strong>registered mobile number</strong> (auto verified by bank system)</li>
                <li>Access to your <strong>mobile SMS inbox</strong> (to receive the OTP)</li>
                <li>Access to your <strong>registered email inbox</strong> (to open final reset link)</li>
              </ul>
            </div>
          </div>

          {/* Steps */}
          <div style={{ padding: "20px 22px" }}>
            <p style={{ margin: "0 0 14px", fontSize: 11, fontWeight: 800, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.1em" }}>
              How it works
            </p>

            {steps.map((step, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 12,
                  marginBottom: i < steps.length - 1 ? 0 : 0,
                }}
              >
                {/* Left: number + connector */}
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0 }}>
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: "50%",
                      background: step.bg,
                      border: `2px solid ${step.color}`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 17,
                    }}
                  >
                    {step.icon}
                  </div>
                  {i < steps.length - 1 && (
                    <div style={{ width: 2, height: 28, background: "#e2e8f0", margin: "2px 0" }} />
                  )}
                </div>
                {/* Right: content */}
                <div style={{ paddingBottom: i < steps.length - 1 ? 0 : 0, paddingTop: 6, flex: 1 }}>
                  <p style={{ margin: "0 0 2px", fontSize: 13, fontWeight: 800, color: "#0f172a" }}>
                    <span style={{ color: step.color }}>Step {i + 1}:</span> {step.title}
                  </p>
                  <p style={{ margin: "0 0 16px", fontSize: 12, color: "#64748b", lineHeight: 1.5 }}>
                    {step.desc}
                  </p>
                </div>
              </div>
            ))}

            {/* Success callout */}
            <div
              style={{
                background: "#f0fdf4",
                border: "1px solid #86efac",
                borderRadius: 10,
                padding: "12px 14px",
                textAlign: "center",
                marginBottom: 20,
              }}
            >
              <p style={{ margin: 0, fontSize: 13, color: "#166534", fontWeight: 700 }}>
                🔗 The reset link goes to your registered email automatically
              </p>
              <p style={{ margin: "4px 0 0", fontSize: 11, color: "#4ade80" }}>
                No manual action needed — just click the link in your email
              </p>
            </div>

            {/* Bottom links */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid #f1f5f9", paddingTop: 14 }}>
              <Link
                href={`/login${email ? `?email=${encodeURIComponent(email)}` : ""}`}
                style={{ fontSize: 13, color: "#64748b", fontWeight: 600, textDecoration: "none" }}
              >
                ← Back to Login
              </Link>
              <Link
                href="/login"
                style={{ fontSize: 12, color: "#94a3b8", textDecoration: "none" }}
              >
                Remembered it?
              </Link>
            </div>
          </div>
        </div>

        {/* Security note */}
        <p style={{ textAlign: "center", fontSize: 11, color: "#94a3b8", marginTop: 14, lineHeight: 1.6 }}>
          🔒 Our agents never ask for your password or visual secret.<br />
          Only your account number, automatic registered-mobile verification, and mobile OTP are used for verification. The reset link is sent to your registered email.
        </p>
      </div>

      <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.85} }`}</style>
    </div>
  );
}

export default function ForgotPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <p style={{ color: "#64748b" }}>Loading…</p>
      </div>
    }>
      <ForgotPageContent />
    </Suspense>
  );
}
