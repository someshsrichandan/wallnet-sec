"use client";

import { useState } from "react";

/* ─── types ──────────────────────────────────────────────────────────────── */
type FoundUser = {
  id: string;
  partnerUserId: string;
  fullName: string;
  emailMasked: string;
  phone: string;
  accountNumber: string;
  visualEnabled: boolean;
  createdAt: string;
};

type Step = "idle" | "dtmf" | "phone" | "otp_sent" | "done";

/* ─── DTMF Keypad ────────────────────────────────────────────────────────── */
function DtmfKeypad({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const keys = ["1","2","3","4","5","6","7","8","9","*","0","#"];
  const press = (k: string) => {
    if (k === "*" || k === "#") return;
    if (value.length < 6) onChange(value + k);
  };

  return (
    <div>
      {/* Display */}
      <div style={{
        background: "#0a1628",
        borderRadius: 12,
        padding: "16px 20px",
        marginBottom: 16,
        textAlign: "center",
        fontFamily: "monospace",
        fontSize: 38,
        fontWeight: 900,
        letterSpacing: 14,
        color: value.length > 0 ? "#4ade80" : "#1e3a5f",
        minHeight: 66,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        border: "2px solid #1e293b",
        boxShadow: "inset 0 2px 8px rgba(0,0,0,.3)",
        transition: "color .2s",
      }}>
        {value.padEnd(6, "·")}
      </div>
      {/* Keypad Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8 }}>
        {keys.map((k) => {
          const disabled = k === "*" || k === "#";
          return (
            <button
              key={k}
              type="button"
              onClick={() => press(k)}
              disabled={disabled}
              style={{
                padding: "16px 0",
                borderRadius: 10,
                border: disabled ? "1.5px solid #f0f0f0" : "1.5px solid #e2e8f0",
                background: disabled ? "#f8fafc" : "#fff",
                fontFamily: "monospace",
                fontSize: 22,
                fontWeight: 900,
                color: disabled ? "#e2e8f0" : "#0f172a",
                cursor: disabled ? "default" : "pointer",
                boxShadow: disabled ? "none" : "0 2px 4px rgba(0,0,0,.07)",
                transform: "scale(1)",
                transition: "transform .1s, background .1s",
              }}
              onMouseDown={e => { if (!disabled) (e.currentTarget as HTMLButtonElement).style.transform = "scale(.95)"; }}
              onMouseUp={e => { (e.currentTarget as HTMLButtonElement).style.transform = "scale(1)"; }}
            >
              {k}
            </button>
          );
        })}
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
        <button
          type="button"
          onClick={() => onChange(value.slice(0, -1))}
          disabled={value.length === 0}
          style={{
            flex: 1,
            padding: "10px",
            borderRadius: 10,
            border: "1.5px solid #fecaca",
            background: "#fff5f5",
            color: "#ef4444",
            fontWeight: 700,
            fontSize: 14,
            cursor: value.length === 0 ? "default" : "pointer",
            opacity: value.length === 0 ? .4 : 1,
          }}
        >
          ⌫ Delete
        </button>
        <button
          type="button"
          onClick={() => onChange("")}
          disabled={value.length === 0}
          style={{
            flex: 1,
            padding: "10px",
            borderRadius: 10,
            border: "1.5px solid #e2e8f0",
            background: "#f8fafc",
            color: "#64748b",
            fontWeight: 700,
            fontSize: 14,
            cursor: value.length === 0 ? "default" : "pointer",
            opacity: value.length === 0 ? .4 : 1,
          }}
        >
          Clear
        </button>
      </div>
    </div>
  );
}

/* ─── Main Agent Portal ───────────────────────────────────────────────────── */
export default function AgentPortalPage() {
  const [agentName, setAgentName] = useState("");
  const [step, setStep] = useState<Step>("idle");

  // DTMF
  const [dtmfInput, setDtmfInput] = useState("");
  const [searching, setSearching] = useState(false);
  const [foundUser, setFoundUser] = useState<FoundUser | null>(null);
  const [searchError, setSearchError] = useState("");

  // Phone
  const [callerPhone, setCallerPhone] = useState("");
  const [phoneError, setPhoneError] = useState("");
  const [sendingOtp, setSendingOtp] = useState(false);

  // OTP
  const [requestId, setRequestId] = useState("");
  const [otpSentMsg, setOtpSentMsg] = useState("");
  const [agentOtp, setAgentOtp] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState("");

  // Done
  const [doneEmail, setDoneEmail] = useState("");
  const [doneEnrollUrl, setDoneEnrollUrl] = useState("");
  const [doneCopied, setDoneCopied] = useState(false);

  /* ── Step 1 — Find user by account number ── */
  const handleAccountSearch = async () => {
    if (dtmfInput.length !== 6) return;
    setSearching(true);
    setSearchError("");

    try {
      const res = await fetch("/api/demo-bank/agent/find-user", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ query: dtmfInput }),
      });
      const data = await res.json() as { found?: boolean; user?: FoundUser; message?: string };
      if (!res.ok || !data.found) throw new Error(data.message || "Account not found. Ask caller to verify the number.");
      setFoundUser(data.user!);
      setStep("phone");
    } catch (e) {
      setSearchError(e instanceof Error ? e.message : "Lookup failed.");
    } finally {
      setSearching(false);
    }
  };

  /* ── Step 2 — Phone verify ── */
  const handleSendOtp = async (skipPhoneCheck = false) => {
    if (!foundUser) return;

    if (!skipPhoneCheck) {
      // Validate last-4 phone
      const entered = callerPhone.replace(/\D/g, "").slice(-4);
      const registered = foundUser.phone.replace(/\D/g, "").slice(-4);
      if (registered && entered && entered !== registered) {
        setPhoneError("🚨 Phone mismatch — Do NOT proceed. Ask caller to verify identity again.");
        return;
      }
    }

    setPhoneError("");
    setSendingOtp(true);

    try {
      const res = await fetch("/api/demo-bank/agent/send-otp", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          partnerUserId: foundUser.partnerUserId,
          agentName: agentName.trim() || "Support Agent",
        }),
      });
      const data = await res.json() as { ok?: boolean; requestId?: string; emailMasked?: string; message?: string };
      if (!res.ok) throw new Error(data.message || "Failed to send OTP.");
      setRequestId(data.requestId!);
      setOtpSentMsg(`OTP sent to ${data.emailMasked}. Ask the caller to check their email inbox.`);
      setStep("otp_sent");
    } catch (e) {
      setPhoneError(e instanceof Error ? e.message : "Failed to send OTP.");
    } finally {
      setSendingOtp(false);
    }
  };

  /* ── Step 3 — Verify OTP → auto sends reset link ── */
  const handleVerifyOtp = async () => {
    if (!requestId || agentOtp.length !== 6) return;
    setVerifying(true);
    setVerifyError("");

    try {
      const res = await fetch("/api/demo-bank/agent/verify-otp", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          requestId,
          otp: agentOtp,
          agentName: agentName.trim() || "Support Agent",
        }),
      });
      const data = await res.json() as {
        ok?: boolean;
        message?: string;
        emailSentTo?: string;
        enrollUrl?: string;
      };
      if (!res.ok || !data.ok) throw new Error(data.message || "Incorrect OTP.");
      // Done — link auto-sent
      setDoneEmail(data.emailSentTo || foundUser?.emailMasked || "");
      setDoneEnrollUrl(data.enrollUrl || "");
      setStep("done");
    } catch (e) {
      setVerifyError(e instanceof Error ? e.message : "Verification failed.");
    } finally {
      setVerifying(false);
    }
  };

  const reset = () => {
    setStep("idle"); setDtmfInput(""); setFoundUser(null); setSearchError("");
    setCallerPhone(""); setPhoneError(""); setRequestId(""); setOtpSentMsg("");
    setAgentOtp(""); setVerifyError(""); setDoneEmail(""); setDoneEnrollUrl("");
    setDoneCopied(false);
  };

  /* ── Progress ── */
  const progressSteps = [
    { key: "idle",     label: "Ready",        icon: "🎧" },
    { key: "dtmf",     label: "Account No.",  icon: "📟" },
    { key: "phone",    label: "Phone Check",  icon: "📞" },
    { key: "otp_sent", label: "Verify OTP",   icon: "📧" },
    { key: "done",     label: "Link Sent",    icon: "✅" },
  ];
  const stepIdx = progressSteps.findIndex(s => s.key === step);

  /* ── styles ── */
  const card: React.CSSProperties = {
    background: "#fff",
    border: "1px solid #e2e8f0",
    borderRadius: 14,
    padding: "22px 24px",
    marginBottom: 18,
    boxShadow: "0 2px 8px rgba(0,0,0,.06)",
  };
  const titleStyle: React.CSSProperties = {
    fontSize: 12, fontWeight: 900, color: "#1e293b",
    textTransform: "uppercase", letterSpacing: ".1em",
    margin: "0 0 14px", display: "flex", alignItems: "center", gap: 8,
  };
  const inp: React.CSSProperties = {
    width: "100%", padding: "10px 14px",
    border: "1.5px solid #e2e8f0", borderRadius: 9,
    fontSize: 14, outline: "none",
    boxSizing: "border-box", fontFamily: "inherit", color: "#0f172a",
  };
  const btn = (bg: string, fg = "#fff"): React.CSSProperties => ({
    background: bg, color: fg, border: "none",
    borderRadius: 9, padding: "11px 20px",
    fontWeight: 700, fontSize: 13, cursor: "pointer",
  });
  const errBox: React.CSSProperties = {
    background: "#fef2f2", border: "1px solid #fecaca",
    borderRadius: 8, padding: "10px 14px",
    fontSize: 13, color: "#dc2626", marginTop: 10,
  };
  const okBox: React.CSSProperties = {
    background: "#f0fdf4", border: "1px solid #86efac",
    borderRadius: 8, padding: "10px 14px",
    fontSize: 13, color: "#166534", marginTop: 0,
  };

  return (
    <div style={{ minHeight: "100vh", background: "#f1f5f9", fontFamily: "'Inter','Segoe UI',Arial,sans-serif", padding: "24px 16px" }}>
      <div style={{ maxWidth: 600, margin: "0 auto" }}>

        {/* Header */}
        <div style={{ ...card, padding: "18px 22px", marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 46, height: 46, borderRadius: 12, background: "#0f1f3d", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0 }}>
              🎧
            </div>
            <div style={{ flex: 1 }}>
              <h1 style={{ margin: "0 0 2px", fontSize: 17, fontWeight: 900, color: "#0f172a" }}>
                Calling Agent Recovery Portal
              </h1>
              <p style={{ margin: 0, fontSize: 12, color: "#64748b" }}>
                Verify caller identity → OTP verified → Reset link auto-sent to email
              </p>
            </div>
          </div>
        </div>

        {/* Agent Name */}
        <div style={{ ...card, padding: "14px 20px", marginBottom: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 18 }}>🪪</span>
            <input
              style={{ ...inp, padding: "8px 12px", flex: 1 }}
              placeholder="Agent name (recorded in audit log)…"
              value={agentName}
              onChange={e => setAgentName(e.target.value)}
            />
          </div>
        </div>

        {/* Progress bar */}
        <div style={{ display: "flex", alignItems: "center", gap: 3, background: "#fff", borderRadius: 10, padding: "10px 14px", border: "1px solid #e2e8f0", marginBottom: 18, overflowX: "auto" }}>
          {progressSteps.map((s, i) => {
            const done = i < stepIdx;
            const active = i === stepIdx;
            return (
              <div key={s.key} style={{ display: "flex", alignItems: "center", gap: 3, flexShrink: 0 }}>
                <div style={{
                  display: "flex", alignItems: "center", gap: 5,
                  padding: "5px 11px", borderRadius: 20, fontSize: 11, fontWeight: 800,
                  background: done ? "#22c55e" : active ? "#0f1f3d" : "#f1f5f9",
                  color: (done || active) ? "#fff" : "#94a3b8",
                  transition: "all .25s",
                }}>
                  <span>{done ? "✓" : s.icon}</span>
                  <span>{s.label}</span>
                </div>
                {i < progressSteps.length - 1 && (
                  <div style={{ width: 14, height: 2, background: done ? "#22c55e" : "#e2e8f0", flexShrink: 0 }} />
                )}
              </div>
            );
          })}
        </div>

        {/* ── IDLE ── */}
        {step === "idle" && (
          <div style={{ ...card, textAlign: "center", padding: "40px 28px" }}>
            <div style={{ fontSize: 56, marginBottom: 12 }}>📞</div>
            <h2 style={{ margin: "0 0 8px", fontWeight: 900, color: "#0f172a" }}>Ready for Next Call</h2>
            <p style={{ fontSize: 13, color: "#64748b", margin: "0 0 24px", lineHeight: 1.7 }}>
              When a customer calls to recover their visual password:<br />
              Ask them to <strong>press their 6-digit Bank Account Number</strong> on the keypad.
            </p>
            <button style={{ ...btn("#0f1f3d"), padding: "14px 40px", fontSize: 15 }} onClick={() => setStep("dtmf")}>
              📞 Start Call Verification
            </button>
          </div>
        )}

        {/* ── DTMF — Account Number ── */}
        {step === "dtmf" && (
          <div style={card}>
            <p style={titleStyle}>📟 Step 1 — Account Number via Keypad</p>
            <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 10, padding: "12px 14px", marginBottom: 16, fontSize: 13, color: "#475569" }}>
              Say to caller: <em style={{ color: "#1e40af", fontStyle: "italic" }}>"Please press your 6-digit <strong>Bank Account Number</strong> on your phone keypad now."</em>
            </div>
            <DtmfKeypad value={dtmfInput} onChange={setDtmfInput} />
            {searchError && <div style={errBox}>⚠ {searchError}</div>}
            <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
              <button style={{ ...btn("#e2e8f0", "#64748b"), padding: "11px 16px" }} onClick={reset}>Cancel</button>
              <button
                style={{ ...btn(dtmfInput.length === 6 ? "#0f1f3d" : "#94a3b8"), flex: 1, opacity: searching ? .7 : 1 }}
                onClick={handleAccountSearch}
                disabled={dtmfInput.length !== 6 || searching}
              >
                {searching ? "Looking up…" : `🔍 Find Account ${dtmfInput || "------"}`}
              </button>
            </div>
          </div>
        )}

        {/* ── PHONE — verify phone ── */}
        {step === "phone" && foundUser && (
          <div style={card}>
            <p style={titleStyle}>📞 Step 2 — Verify Phone Number</p>

            {/* User card */}
            <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 10, padding: "14px 16px", marginBottom: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <strong style={{ fontSize: 15, color: "#0f172a" }}>{foundUser.fullName}</strong>
                <span style={{
                  fontSize: 11, padding: "3px 10px", borderRadius: 99, fontWeight: 700,
                  background: foundUser.visualEnabled ? "#dcfce7" : "#fee2e2",
                  color: foundUser.visualEnabled ? "#166534" : "#991b1b",
                }}>
                  {foundUser.visualEnabled ? "✓ Visual Active" : "✗ No Visual"}
                </span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, fontSize: 12, color: "#64748b" }}>
                <div>🏦 Account: <strong style={{ fontFamily: "monospace", fontSize: 13, letterSpacing: 2, color: "#0f172a" }}>{foundUser.accountNumber}</strong></div>
                <div>📧 {foundUser.emailMasked}</div>
                <div>📞 Last 4: <strong style={{ fontFamily: "monospace", color: "#0f172a" }}>{foundUser.phone.slice(-4) || "N/A"}</strong></div>
                <div>📅 Since {new Date(foundUser.createdAt).toLocaleDateString("en-IN")}</div>
              </div>
            </div>

            <p style={{ fontSize: 13, color: "#475569", margin: "0 0 10px" }}>
              Say: <em style={{ color: "#1e40af" }}>"Can you confirm the <strong>last 4 digits</strong> of your registered mobile number?"</em>
            </p>
            <label style={{ fontSize: 11, fontWeight: 700, color: "#475569", display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: ".07em" }}>
              Last 4 digits caller says:
            </label>
            <input
              style={{ ...inp, textAlign: "center", fontSize: 22, fontFamily: "monospace", fontWeight: 900, letterSpacing: 8, maxWidth: 180 }}
              placeholder="XXXX"
              maxLength={4}
              inputMode="numeric"
              value={callerPhone}
              onChange={e => { setCallerPhone(e.target.value.replace(/\D/g, "").slice(0, 4)); setPhoneError(""); }}
            />

            {phoneError && (
              <div style={{ ...errBox, fontWeight: phoneError.includes("mismatch") ? 800 : 400 }}>
                {phoneError}
              </div>
            )}

            <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
              <button style={{ ...btn("#e2e8f0", "#64748b"), padding: "11px 16px" }} onClick={() => setStep("dtmf")}>← Back</button>
              <button
                style={{ ...btn("#0f1f3d"), flex: 1 }}
                onClick={() => handleSendOtp(false)}
                disabled={!callerPhone || sendingOtp}
              >
                {sendingOtp ? "Sending OTP…" : "✅ Verify & Send OTP to Email"}
              </button>
            </div>
            <button
              style={{ ...btn("#fff", "#94a3b8"), width: "100%", marginTop: 8, border: "1.5px solid #e2e8f0", fontSize: 12 }}
              onClick={() => handleSendOtp(true)}
              disabled={sendingOtp}
            >
              Skip phone check — Send OTP anyway
            </button>
          </div>
        )}

        {/* ── OTP — verify ── */}
        {step === "otp_sent" && (
          <div style={card}>
            <p style={titleStyle}>📧 Step 3 — Verify OTP from Caller</p>
            {otpSentMsg && <div style={okBox}>📬 {otpSentMsg}</div>}

            <p style={{ fontSize: 13, color: "#475569", margin: "14px 0 10px" }}>
              Say: <em style={{ color: "#1e40af" }}>"Please check your email inbox and read the 6-digit code to me."</em>
            </p>
            <label style={{ fontSize: 11, fontWeight: 700, color: "#475569", display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: ".07em" }}>
              OTP caller reads out:
            </label>
            <input
              style={{ ...inp, textAlign: "center", fontSize: 32, letterSpacing: 14, fontFamily: "monospace", fontWeight: 900, padding: "14px" }}
              placeholder="000000"
              maxLength={6}
              inputMode="numeric"
              value={agentOtp}
              onChange={e => setAgentOtp(e.target.value.replace(/\D/g, ""))}
              autoFocus
            />

            <div style={{ background: "#fffbeb", border: "1px solid #fef08a", borderRadius: 8, padding: "10px 14px", marginTop: 12, fontSize: 12, color: "#92400e" }}>
              ✨ <strong>After OTP is verified</strong> — the system automatically generates & emails the reset link. No extra step needed!
            </div>

            {verifyError && <div style={errBox}>⚠ {verifyError}</div>}

            <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
              <button
                style={{ ...btn("#fff", "#64748b"), border: "1.5px solid #e2e8f0", padding: "11px 16px" }}
                onClick={() => handleSendOtp(true)}
                disabled={sendingOtp}
              >
                {sendingOtp ? "Resending…" : "🔁 Resend OTP"}
              </button>
              <button
                style={{ ...btn(agentOtp.length === 6 ? "#16a34a" : "#94a3b8"), flex: 1 }}
                onClick={handleVerifyOtp}
                disabled={verifying || agentOtp.length !== 6}
              >
                {verifying ? "Verifying & Sending Link…" : "✅ Verify OTP & Auto-Send Reset Link"}
              </button>
            </div>
          </div>
        )}

        {/* ── DONE ── */}
        {step === "done" && (
          <div style={{ ...card, background: "#f0fdf4", border: "1.5px solid #86efac", textAlign: "center", padding: "40px 28px" }}>
            <div style={{ fontSize: 60, marginBottom: 12 }}>✅</div>
            <h2 style={{ margin: "0 0 6px", fontWeight: 900, color: "#15803d", fontSize: 20 }}>
              Identity Verified!
            </h2>
            <p style={{ color: "#166534", fontSize: 14, margin: "0 0 16px" }}>
              Reset link automatically emailed to <strong>{doneEmail}</strong>
            </p>

            <div style={{ background: "#fff", border: "1px solid #86efac", borderRadius: 10, padding: "14px 16px", marginBottom: 20, textAlign: "left" }}>
              <p style={{ margin: "0 0 4px", fontSize: 11, fontWeight: 800, color: "#166534", textTransform: "uppercase", letterSpacing: ".08em" }}>
                📋 What the caller should do:
              </p>
              <ol style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: "#15803d", lineHeight: 1.8 }}>
                <li>Check email inbox</li>
                <li>Click the reset link <em>(expires in 15 minutes)</em></li>
                <li>Set new visual password</li>
                <li>Try logging in again</li>
              </ol>
            </div>

            {/* Dev mode: show link */}
            {doneEnrollUrl && (
              <div style={{ background: "#fffbeb", border: "1px solid #fef08a", borderRadius: 10, padding: "12px 14px", marginBottom: 20, textAlign: "left" }}>
                <p style={{ margin: "0 0 6px", fontSize: 11, fontWeight: 800, color: "#d97706", textTransform: "uppercase" }}>
                  🧪 Dev Mode — Reset Link (share if email not configured)
                </p>
                <code style={{ fontSize: 11, color: "#92400e", wordBreak: "break-all", display: "block", marginBottom: 8 }}>
                  {doneEnrollUrl}
                </code>
                <button
                  style={{ ...btn(doneCopied ? "#22c55e" : "#d97706"), padding: "7px 16px", fontSize: 12 }}
                  onClick={() => {
                    navigator.clipboard.writeText(doneEnrollUrl);
                    setDoneCopied(true);
                    setTimeout(() => setDoneCopied(false), 2000);
                  }}
                >
                  {doneCopied ? "✓ Copied!" : "Copy Link"}
                </button>
              </div>
            )}

            <p style={{ fontSize: 11, color: "#4ade80", margin: "0 0 20px" }}>
              Audit: Agent <strong>{agentName || "Support Agent"}</strong> · {new Date().toLocaleString("en-IN")} IST
            </p>
            <button style={{ ...btn("#0f1f3d"), padding: "13px 36px", fontSize: 14 }} onClick={reset}>
              📞 Handle Next Call
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
