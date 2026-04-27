const nodemailer = require("nodemailer");
const env = require("../config/env");
const AdminSettings = require("../models/adminSettings.model");

let cachedTransporter = null;
let lastSettingsHash = null;

const getTransporter = async () => {
  try {
    const settings = await AdminSettings.getSettings();
    const settingsHash = JSON.stringify({
      h: settings.smtpHost,
      p: settings.smtpPort,
      u: settings.smtpUser,
      pw: settings.smtpPass,
      s: settings.smtpService,
      sec: settings.smtpSecure,
    });

    if (cachedTransporter && lastSettingsHash === settingsHash) {
      return { transporter: cachedTransporter, from: settings.smtpFrom || env.smtpFrom };
    }

    let config = {};

    if (settings.smtpUser && settings.smtpPass) {
      // Use database settings
      if (settings.smtpService && settings.smtpService !== "custom") {
        config = {
          service: settings.smtpService,
          auth: {
            user: settings.smtpUser,
            pass: settings.smtpPass,
          },
        };
      } else {
        config = {
          host: settings.smtpHost,
          port: settings.smtpPort,
          secure: settings.smtpSecure || settings.smtpPort === 465,
          auth: {
            user: settings.smtpUser,
            pass: settings.smtpPass,
          },
        };
      }
    } else if (env.smtpHost && env.smtpUser && env.smtpPass) {
      // Fallback to env
      config = {
        host: env.smtpHost,
        port: env.smtpPort,
        secure: env.smtpPort === 465,
        auth: {
          user: env.smtpUser,
          pass: env.smtpPass,
        },
      };
    } else {
      return null;
    }

    cachedTransporter = nodemailer.createTransport(config);
    lastSettingsHash = settingsHash;
    return { transporter: cachedTransporter, from: settings.smtpFrom || env.smtpFrom };
  } catch (error) {
    console.error("Failed to initialize SMTP transporter:", error);
    return null;
  }
};

const sendEmail = async ({ to, subject, text, html }) => {
  const transportData = await getTransporter();

  if (!transportData) {
    console.log("--- MOCK EMAIL SENT ---");
    console.log(`To: ${to}`);
    console.log(`Subject: ${subject}`);
    console.log(`Content: ${text || html}`);
    console.log("-----------------------");
    return { mock: true, success: true };
  }

  const { transporter: mailTransporter, from } = transportData;

  const mailOptions = {
    from,
    to,
    subject,
    text,
    html,
  };

  try {
    const info = await mailTransporter.sendMail(mailOptions);
    console.log(`Email sent: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error("Error sending email:", error);
    throw error;
  }
};

/**
 * Send a notification when a partner's trial is about to expire.
 */
const sendTrialExpiringSoon = async (partner, daysRemaining) => {
  return sendEmail({
    to: partner.email,
    subject: "Your WallNet-Sec Trial is Expiring Soon",
    html: `
      <div style="font-family: sans-serif; padding: 20px;">
        <h2>Trial Expiration Notice</h2>
        <p>Hello ${partner.name},</p>
        <p>This is a friendly reminder that your trial period for WallNet-Sec will expire in <strong>${daysRemaining} days</strong>.</p>
        <p>To avoid any disruption to your API services, please upgrade your account or contact our sales team.</p>
        <br/>
        <p>Best regards,</p>
        <p>The WallNet-Sec Team</p>
      </div>
    `,
  });
};

/**
 * Send a notification when a partner reaches their usage limit.
 */
const sendUsageLimitReached = async (partner) => {
  return sendEmail({
    to: partner.email,
    subject: "API Usage Limit Reached",
    html: `
      <div style="font-family: sans-serif; padding: 20px;">
        <h2 style="color: #e11d48;">Usage Limit Reached</h2>
        <p>Hello ${partner.name},</p>
        <p>Your account has reached its API usage limit of <strong>${partner.apiLimit.toLocaleString()}</strong> requests.</p>
        <p>Your API keys have been temporarily suspended. Please upgrade your plan to restore access immediately.</p>
        <br/>
        <p>Best regards,</p>
        <p>The WallNet-Sec Team</p>
      </div>
    `,
  });
};

/**
 * Send a welcome email to a new partner.
 */
const sendWelcomeEmail = async (partner) => {
  return sendEmail({
    to: partner.email,
    subject: "Welcome to WallNet-Sec Platform",
    html: `
      <div style="font-family: sans-serif; padding: 20px; color: #1e293b;">
        <h2 style="color: #e11d48;">Welcome to WallNet-Sec, ${partner.name}!</h2>
        <p>Thank you for joining our visual password security platform. Your account is now in <strong>${partner.status}</strong> mode.</p>
        
        <h3 style="margin-top: 24px;">Next Steps:</h3>
        <ul style="line-height: 1.6;">
          <li>Generate your first API Key in the dashboard.</li>
          <li>Check our <a href="https://wallnet-sec.com/docs">Developer Documentation</a> for integration guides.</li>
          <li>Review the visual challenge security formula.</li>
        </ul>

        <div style="background: #f1f5f9; padding: 15px; border-radius: 8px; margin-top: 20px;">
          <p style="margin: 0; font-size: 14px;"><strong>Support:</strong> If you have any questions, reply to this email or reach out to our technical team.</p>
        </div>

        <br/>
        <p>Stay Secure,</p>
        <p><strong>The WallNet-Sec Security Team</strong></p>
      </div>
    `,
  });
};

/**
 * Send an alert when a partner's trial has expired.
 */
const sendTrialExpiredEmail = async (partner) => {
  return sendEmail({
    to: partner.email,
    subject: "Your WallNet-Sec Trial has Expired",
    html: `
      <div style="font-family: sans-serif; padding: 20px;">
        <h2 style="color: #e11d48;">Trial Expired</h2>
        <p>Hello ${partner.name},</p>
        <p>Your trial period for WallNet-Sec has ended. To continue using our API services, please upgrade your account today.</p>
        <div style="margin-top: 20px;">
          <a href="https://wallnet-sec.com/admin/dashboard" style="background: #e11d48; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Upgrade Now</a>
        </div>
        <br/>
        <p>Best regards,</p>
        <p>The WallNet-Sec Team</p>
      </div>
    `,
  });
};

/**
 * Send a security alert for Super Admin logins.
 */
const sendAdminLoginAlert = async (email, ip, userAgent) => {
  return sendEmail({
    to: email,
    subject: "Security Alert: Super Admin Login",
    html: `
      <div style="font-family: sans-serif; padding: 20px; border: 2px solid #ef4444; border-radius: 8px;">
        <h2 style="color: #ef4444;">Super Admin Login Detected</h2>
        <p>A new login to the Super Admin console was detected with your credentials.</p>
        <div style="background: #f8fafc; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 5px 0;"><strong>Time:</strong> ${new Date().toUTCString()}</p>
          <p style="margin: 5px 0;"><strong>IP Address:</strong> ${ip}</p>
          <p style="margin: 5px 0;"><strong>Device:</strong> ${userAgent}</p>
        </div>
        <p style="color: #64748b; font-size: 13px;">If this was not you, please rotate your environment credentials immediately.</p>
      </div>
    `,
  });
};

module.exports = {
  sendEmail,
  sendTrialExpiringSoon,
  sendUsageLimitReached,
  sendWelcomeEmail,
  sendTrialExpiredEmail,
  sendAdminLoginAlert,
};
