import nodemailer from "nodemailer";
import { demoBankConfig } from "@/lib/config";

/**
 * email-service.ts
 *
 * Supports two env-var naming conventions:
 *   Modern:  GMAIL_USER + GMAIL_APP_PASSWORD   (original)
 *   Classic: EMAIL_USER + EMAIL_PASS (+ optional EMAIL_HOST / EMAIL_PORT)
 *
 * The transporter is created fresh each call so that runtime env changes
 * (e.g. from a settings UI) are picked up without restarting the server.
 */

type EmailConfig = {
  emailHost: string;
  emailPort: number;
  emailUser: string;
  emailPass: string;
  emailTo: string;
  fromName: string;
};

const getBankName = () => process.env.BANK_NAME || "HDFC Demo Bank";

let cachedEmailConfig: EmailConfig | null = null;
let cachedAtMs = 0;
const EMAIL_CONFIG_CACHE_TTL_MS = 60_000;

const buildEnvFallbackConfig = (): EmailConfig => ({
  emailHost: process.env.EMAIL_HOST || "smtp.gmail.com",
  emailPort: parseInt(process.env.EMAIL_PORT || "587", 10) || 587,
  emailUser: process.env.EMAIL_USER || process.env.GMAIL_USER || "",
  emailPass: process.env.EMAIL_PASS || process.env.GMAIL_APP_PASSWORD || "",
  emailTo: process.env.EMAIL_TO || "",
  fromName: process.env.EMAIL_FROM_NAME || getBankName(),
});

const fetchPartnerEmailConfig = async (): Promise<EmailConfig | null> => {
  try {
    const url = `${demoBankConfig.visualApiBase}/settings/email/public?partnerId=${encodeURIComponent(
      demoBankConfig.partnerId,
    )}`;
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "x-api-key": demoBankConfig.partnerApiKey,
      },
      cache: "no-store",
    });

    if (!response.ok) {
      return null;
    }

    const payload = (await response.json()) as Partial<EmailConfig>;
    return {
      emailHost: String(payload.emailHost || "").trim(),
      emailPort: parseInt(String(payload.emailPort || "587"), 10) || 587,
      emailUser: String(payload.emailUser || "").trim(),
      emailPass: String(payload.emailPass || "").trim(),
      emailTo: String(payload.emailTo || "").trim(),
      fromName: String(payload.fromName || getBankName()).trim() || getBankName(),
    };
  } catch {
    return null;
  }
};

const resolveEmailConfig = async (): Promise<EmailConfig> => {
  const now = Date.now();
  if (cachedEmailConfig && now - cachedAtMs < EMAIL_CONFIG_CACHE_TTL_MS) {
    return cachedEmailConfig;
  }

  const fallback = buildEnvFallbackConfig();
  const remote = await fetchPartnerEmailConfig();

  const resolved = remote?.emailUser && remote?.emailPass ? remote : fallback;
  cachedEmailConfig = resolved;
  cachedAtMs = now;
  return resolved;
};

const getTransporter = (config: EmailConfig) => {
  const user = String(config.emailUser || "").trim();
  const pass = String(config.emailPass || "").trim();
  const host = String(config.emailHost || "smtp.gmail.com").trim();
  const port = parseInt(String(config.emailPort || "587"), 10) || 587;

  if (!user || !pass) {
    console.warn("[email-service] Email credentials not set — emails will be console-logged only.");
    return null;
  }

  // Gmail shortcut
  if (host === "smtp.gmail.com") {
    return nodemailer.createTransport({
      service: "gmail",
      auth: { user, pass },
    });
  }

  // Generic SMTP
  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });
};

/* ──────────────────────────────────────────────────────────────────────────── */
/*  OTP EMAIL                                                                  */
/* ──────────────────────────────────────────────────────────────────────────── */

export const sendOtpEmail = async (toEmail: string, otp: string, userName: string) => {
  const bankName = getBankName();
  const config = await resolveEmailConfig();
  const subject = `[${bankName}] Your OTP for Visual Password Reset`;

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;padding:24px;background:#f8fafc;border-radius:12px;">
      <div style="background:#1e293b;border-radius:8px 8px 0 0;padding:20px 24px;">
        <h2 style="color:#fff;margin:0;font-size:18px;">🔒 ${bankName}</h2>
        <p style="color:#94a3b8;margin:4px 0 0;font-size:13px;">Secure Visual Password Reset</p>
      </div>
      <div style="background:#fff;padding:28px 24px;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 8px 8px;">
        <p style="color:#334155;margin:0 0 16px;">Hello <strong>${userName}</strong>,</p>
        <p style="color:#475569;font-size:14px;margin:0 0 24px;">
          A bank recovery agent has initiated a visual password reset for your account.
          Please provide the following OTP to the agent to verify your identity:
        </p>
        <div style="background:#f1f5f9;border:2px dashed #cbd5e1;border-radius:10px;padding:20px;text-align:center;margin-bottom:24px;">
          <p style="color:#64748b;font-size:11px;text-transform:uppercase;letter-spacing:.1em;margin:0 0 8px;font-weight:600;">ONE-TIME PASSWORD (valid 5 min)</p>
          <h1 style="color:#0f172a;font-size:44px;font-weight:900;letter-spacing:14px;margin:0;font-family:monospace;">${otp}</h1>
        </div>
        <p style="color:#e11d48;font-size:13px;margin:0 0 8px;">⚠️ This OTP is valid for <strong>5 minutes</strong> only.</p>
        <p style="color:#ef4444;font-size:13px;margin:0 0 24px;">Never share this OTP. Bank staff will NEVER ask for it over telephone.</p>
        <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0;" />
        <p style="color:#94a3b8;font-size:12px;margin:0;">If you did not request this reset, please contact bank support immediately.</p>
      </div>
    </div>
  `;

  const transporter = getTransporter(config);

  if (!transporter) {
    console.log(`\n[email-service] [DEV-CONSOLE]\n  TO: ${toEmail}\n  SUBJECT: ${subject}\n  OTP: ${otp}\n`);
    return { messageId: "dev-console-log", dev: true };
  }

  const info = await transporter.sendMail({
    from: `"${config.fromName || `${bankName} Security`}" <${config.emailUser}>`,
    to: toEmail,
    bcc: config.emailTo || undefined,
    subject,
    html,
  });

  console.log(`[email-service] OTP email sent to ${toEmail} — messageId: ${info.messageId}`);
  return { messageId: info.messageId };
};

/* ──────────────────────────────────────────────────────────────────────────── */
/*  RE-ENROLLMENT LINK EMAIL                                                   */
/* ──────────────────────────────────────────────────────────────────────────── */

export const sendReenrollLinkEmail = async (
  toEmail: string,
  userName: string,
  enrollUrl: string,
  agentName: string,
) => {
  const bankName = getBankName();
  const config = await resolveEmailConfig();
  const subject = `[${bankName}] Reset Your Visual Password – Action Required`;

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;padding:24px;background:#f8fafc;border-radius:12px;">
      <div style="background:#1e293b;border-radius:8px 8px 0 0;padding:20px 24px;">
        <h2 style="color:#fff;margin:0;font-size:18px;">🔐 ${bankName}</h2>
        <p style="color:#94a3b8;margin:4px 0 0;font-size:13px;">Visual Password Reset Link</p>
      </div>
      <div style="background:#fff;padding:28px 24px;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 8px 8px;">
        <p style="color:#334155;margin:0 0 16px;">Hello <strong>${userName}</strong>,</p>
        <p style="color:#475569;font-size:14px;margin:0 0 20px;">
          Your identity has been verified by our banking agent <strong>${agentName}</strong>.
          Click the button below to set up a new visual password for your account.
        </p>
        <div style="text-align:center;margin:28px 0;">
          <a href="${enrollUrl}"
             style="display:inline-block;background:#1e293b;color:#fff;padding:14px 36px;border-radius:8px;text-decoration:none;font-weight:700;font-size:15px;letter-spacing:.3px;">
            🔑 Set New Visual Password
          </a>
        </div>
        <div style="background:#fef3c7;border:1px solid #fde68a;border-radius:8px;padding:14px 16px;margin-bottom:20px;">
          <p style="color:#92400e;font-size:13px;margin:0;font-weight:600;">⚠️ Important Security Notice</p>
          <ul style="color:#92400e;font-size:13px;margin:8px 0 0;padding-left:16px;">
            <li>This link expires in <strong>15 minutes</strong></li>
            <li>It can only be used <strong>once</strong></li>
            <li>Do not share this link with anyone</li>
          </ul>
        </div>
        <p style="color:#94a3b8;font-size:12px;margin:0;">
          If you did not request this reset, please contact our 24/7 helpline immediately.
        </p>
        <hr style="border:none;border-top:1px solid #e2e8f0;margin:20px 0;" />
        <p style="color:#94a3b8;font-size:11px;margin:0;">
          Button not working? Copy and paste this URL into your browser:<br/>
          <span style="color:#3b82f6;word-break:break-all;">${enrollUrl}</span>
        </p>
      </div>
    </div>
  `;

  const transporter = getTransporter(config);

  if (!transporter) {
    console.log(`\n[email-service] [DEV-CONSOLE]\n  TO: ${toEmail}\n  SUBJECT: ${subject}\n  ENROLL URL: ${enrollUrl}\n`);
    return { messageId: "dev-console-log", dev: true };
  }

  const info = await transporter.sendMail({
    from: `"${config.fromName || `${bankName} Security`}" <${config.emailUser}>`,
    to: toEmail,
    bcc: config.emailTo || undefined,
    subject,
    html,
  });

  console.log(`[email-service] Re-enroll email sent to ${toEmail} — messageId: ${info.messageId}`);
  return { messageId: info.messageId };
};
