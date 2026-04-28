const User = require("../models/user.model");
const emailService = require("./email.service");
const { decryptString } = require("../utils/fieldEncryption");

const sendAlert = async (user, percentage) => {
  const email = decryptString(user.email);
  const name = decryptString(user.name);

  try {
    await emailService.sendEmail({
      to: email,
      subject: `API Usage Alert: ${percentage}% Reached - WallNet-Sec`,
      html: `
        <div style="font-family: sans-serif; padding: 20px; color: #1e293b;">
          <h2 style="color: #f59e0b;">⚠️ API Usage Warning</h2>
          <p>Hello ${name},</p>
          <p>This is an automated alert to inform you that you have used <strong>${percentage}%</strong> of your API quota.</p>
          <div style="background: #f8fafc; padding: 15px; border-radius: 6px; margin: 20px 0;">
            <p style="margin: 5px 0;"><strong>Current Usage:</strong> ${user.apiUsage}</p>
            <p style="margin: 5px 0;"><strong>Total Limit:</strong> ${user.apiLimit}</p>
          </div>
          <p>Once you reach 100%, your API requests will be blocked. Please contact support or upgrade your plan to avoid service interruption.</p>
          <br/>
          <p style="font-size: 12px; color: #64748b;">WallNet-Sec Security Team</p>
        </div>
      `
    });
    console.log(`[QuotaAlert] Sent ${percentage}% alert to ${email}`);
  } catch (err) {
    console.error(`[QuotaAlert] Failed to send alert to ${email}:`, err.message);
  }
};

const checkQuotaAlerts = async (user) => {
  const usage = user.apiUsage;
  const limit = user.apiLimit;

  if (limit <= 0) return;

  const percentage = (usage / limit) * 100;

  // We only want to send the alert once when it crosses the threshold
  // To keep it simple without adding a 'lastAlertSent' field to the User model,
  // we can check if it just HIT the threshold exactly, or use a simpler approach.
  // Ideally, we'd have fields like 'alert80Sent', 'alert90Sent', etc.
  
  // For now, let's just do a simple check. To avoid spam, we'd need model changes.
  // But let's stick to the prompt.
  
  if (usage === Math.floor(limit * 0.8)) {
    await sendAlert(user, 80);
  } else if (usage === Math.floor(limit * 0.9)) {
    await sendAlert(user, 90);
  } else if (usage === limit) {
    await sendAlert(user, 100);
  }
};

module.exports = {
  checkQuotaAlerts
};
