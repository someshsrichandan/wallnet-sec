import { NextResponse } from "next/server";
import nodemailer from "nodemailer";

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}

/**
 * GET  /api/demo-bank/admin/email-settings  → returns current config (masked)
 * POST /api/demo-bank/admin/email-settings  → save + send test email
 */

export async function GET() {
  const user = process.env.EMAIL_USER || process.env.GMAIL_USER || "";
  const host = process.env.EMAIL_HOST || "smtp.gmail.com";
  const port = process.env.EMAIL_PORT || "587";
  const bankName = process.env.BANK_NAME || "HDFC Demo Bank";
  const configured = !!(user && (process.env.EMAIL_PASS || process.env.GMAIL_APP_PASSWORD));

  return NextResponse.json({
    configured,
    host,
    port,
    user: user ? user.slice(0, 4) + "***" + user.slice(user.indexOf("@")) : "",
    bankName,
  });
}

export async function POST(request: Request) {
  const body = (await request.json()) as {
    host?: string;
    port?: string;
    user?: string;
    pass?: string;
    bankName?: string;
    testRecipient?: string;
  };

  const host = (body.host || "smtp.gmail.com").trim();
  const port = parseInt(body.port || "587", 10);
  const user = (body.user || "").trim();
  const pass = (body.pass || "").trim();
  const bankName = (body.bankName || "HDFC Demo Bank").trim();
  const testRecipient = (body.testRecipient || user).trim();

  if (!user || !pass) {
    return NextResponse.json({ ok: false, message: "Email user and password are required." }, { status: 400 });
  }

  // Write to process.env so subsequent calls pick it up (runtime only, lost on restart)
  process.env.EMAIL_HOST = host;
  process.env.EMAIL_PORT = String(port);
  process.env.EMAIL_USER = user;
  process.env.EMAIL_PASS = pass;
  process.env.GMAIL_USER = user;
  process.env.GMAIL_APP_PASSWORD = pass;
  process.env.BANK_NAME = bankName;

  // Try to send a test email
  let testResult: string;
  try {
    const transporter = host === "smtp.gmail.com"
      ? nodemailer.createTransport({ service: "gmail", auth: { user, pass } })
      : nodemailer.createTransport({ host, port, secure: port === 465, auth: { user, pass } });

    const info = await transporter.sendMail({
      from: `"${bankName} Security" <${user}>`,
      to: testRecipient,
      subject: `✅ [${bankName}] Email Settings Verified`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:24px;">
          <div style="background:#1e293b;border-radius:8px 8px 0 0;padding:20px 24px;text-align:center;">
            <h2 style="color:#fff;margin:0;">✅ Email Setup Working!</h2>
          </div>
          <div style="background:#fff;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 8px 8px;padding:24px;">
            <p>Your ${bankName} email settings are configured correctly.</p>
            <p>OTP and password reset emails will now be delivered to users.</p>
            <hr style="border:none;border-top:1px solid #eee;margin:16px 0;" />
            <p style="font-size:12px;color:#94a3b8;">Host: ${host}:${port} · User: ${user}</p>
          </div>
        </div>
      `,
    });

    testResult = `✅ Test email sent! Message ID: ${info.messageId}`;
    console.log(`[email-settings] Test email sent → ${testRecipient} | ${info.messageId}`);
  } catch (err) {
    testResult = `❌ Failed: ${err instanceof Error ? err.message : "Unknown error"}`;
    console.error("[email-settings] Test send failed:", err);
    return NextResponse.json({
      ok: false,
      message: testResult,
      hint: "Check your Gmail App Password. Regular Gmail passwords don't work — you need an App Password from Google Account → Security → App Passwords.",
    }, { status: 422 });
  }

  return NextResponse.json({
    ok: true,
    message: testResult,
    savedFor: "current server session (restart will reload from .env.local)",
  });
}
