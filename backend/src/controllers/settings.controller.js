const EmailSettings = require("../models/emailSettings.model");
const AiAgentSettings = require("../models/aiAgentSettings.model");
const asyncHandler = require("../utils/asyncHandler");
const HttpError = require("../utils/httpError");
const {
  assertBoolean,
  assertEmail,
  assertInteger,
  assertOptionalHttpUrl,
  assertOptionalString,
  assertRequiredString,
  assertStringArray,
} = require("../utils/validators");

const normalizePartnerId = (value) =>
  String(value || "")
    .trim()
    .toLowerCase();

const toSafeResponse = (doc) => {
  if (!doc) {
    return null;
  }

  const emailPass = String(doc.emailPass || "");
  return {
    id: String(doc._id),
    ownerUserId: doc.ownerUserId,
    partnerId: doc.partnerId,
    emailHost: doc.emailHost,
    emailPort: doc.emailPort,
    emailUser: doc.emailUser,
    emailTo: doc.emailTo || "",
    fromName: doc.fromName || "Visual Security",
    enabled: Boolean(doc.enabled),
    hasEmailPass: Boolean(emailPass),
    emailPassMasked: emailPass ? "*".repeat(12) : "",
    updatedAt: doc.updatedAt,
  };
};

const getEmailSettings = asyncHandler(async (req, res) => {
  const ownerUserId = assertRequiredString("auth.sub", req.auth?.sub, {
    min: 8,
    max: 120,
  });
  const partnerId = normalizePartnerId(req.query.partnerId || "");

  const filter = { ownerUserId };
  if (partnerId) {
    filter.partnerId = partnerId;
  }

  const settings = await EmailSettings.findOne(filter).sort({ updatedAt: -1 });

  if (!settings) {
    return res.status(404).json({ message: "Email settings not configured" });
  }

  return res.json(toSafeResponse(settings));
});

const upsertEmailSettings = asyncHandler(async (req, res) => {
  const ownerUserId = assertRequiredString("auth.sub", req.auth?.sub, {
    min: 8,
    max: 120,
  });
  const partnerId = normalizePartnerId(
    assertRequiredString("partnerId", req.body.partnerId, { min: 3, max: 80 }),
  );

  const emailHost = assertRequiredString("emailHost", req.body.emailHost, {
    min: 3,
    max: 200,
  });
  const emailPort = assertInteger("emailPort", req.body.emailPort, {
    min: 1,
    max: 65535,
  });
  const emailUser = assertEmail(req.body.emailUser, "emailUser");
  const emailPassInput = assertOptionalString("emailPass", req.body.emailPass, {
    min: 8,
    max: 500,
  });
  const emailToRaw = assertOptionalString("emailTo", req.body.emailTo, {
    max: 254,
  });
  const emailTo = emailToRaw ? assertEmail(emailToRaw, "emailTo") : "";
  const fromName =
    assertOptionalString("fromName", req.body.fromName, { max: 120 }) ||
    "Visual Security";
  const enabled = req.body.enabled === undefined ? true : Boolean(req.body.enabled);

  const existing = await EmailSettings.findOne({ partnerId });
  if (existing && existing.ownerUserId !== ownerUserId) {
    throw new HttpError(403, "This partner email settings belong to another admin");
  }

  const settings = existing ||
    new EmailSettings({
      ownerUserId,
      partnerId,
      emailHost,
      emailPort,
      emailUser,
      emailPass: "",
      emailTo,
      fromName,
      enabled,
    });

  settings.ownerUserId = ownerUserId;
  settings.partnerId = partnerId;
  settings.emailHost = emailHost;
  settings.emailPort = emailPort;
  settings.emailUser = emailUser;
  settings.emailTo = emailTo;
  settings.fromName = fromName;
  settings.enabled = enabled;

  if (emailPassInput) {
    settings.emailPass = emailPassInput;
  } else if (!settings.emailPass) {
    throw new HttpError(400, "emailPass is required for first-time setup");
  }

  await settings.save();

  return res.json(toSafeResponse(settings));
});

const getEmailSettingsForPartner = asyncHandler(async (req, res) => {
  const partnerId = normalizePartnerId(
    assertRequiredString("partnerId", req.query.partnerId || req.body?.partnerId, {
      min: 3,
      max: 80,
    }),
  );

  // Security Check: Ensure the requester (partner) is only accessing their own settings
  if (req.partner && req.partner.partnerId !== partnerId) {
    throw new HttpError(403, "Access denied: You can only access settings for your own partnerId");
  }

  const settings = await EmailSettings.findOne({ partnerId, enabled: true });
  if (!settings) {
    throw new HttpError(404, "Partner email settings not configured");
  }

  return res.json({
    partnerId: settings.partnerId,
    emailHost: settings.emailHost,
    emailPort: settings.emailPort,
    emailUser: settings.emailUser,
    emailPass: settings.emailPass,
    emailTo: settings.emailTo || "",
    fromName: settings.fromName || "Visual Security",
    enabled: Boolean(settings.enabled),
  });
});

const toSafeAiAgentResponse = (doc) => {
  if (!doc) {
    return null;
  }

  const outboundSecret = String(doc.outboundSecret || "");
  return {
    id: String(doc._id),
    ownerUserId: doc.ownerUserId,
    partnerId: doc.partnerId,
    providerName: doc.providerName || "custom",
    agentBaseUrl: doc.agentBaseUrl || "",
    findUserPath: doc.findUserPath || "/api/demo-bank/agent/find-user",
    sendOtpPath: doc.sendOtpPath || "/api/demo-bank/agent/send-otp",
    verifyOtpPath: doc.verifyOtpPath || "/api/demo-bank/agent/verify-otp",
    adminResetPath: doc.adminResetPath || "/api/demo-bank/agent/admin-reset",
    webhookUrl: doc.webhookUrl || "",
    callbackBaseUrl: doc.callbackBaseUrl || "",
    inputSchemaUrl: doc.inputSchemaUrl || "",
    authType: doc.authType || "NONE",
    customHeaders: Array.isArray(doc.customHeaders) ? doc.customHeaders : [],
    supportedLanguages:
      Array.isArray(doc.supportedLanguages) ? doc.supportedLanguages : [],
    enableAutoResetEmail: Boolean(doc.enableAutoResetEmail),
    enableAdminReset: Boolean(doc.enableAdminReset),
    enabled: Boolean(doc.enabled),
    hasOutboundSecret: Boolean(outboundSecret),
    outboundSecretMasked: outboundSecret ? "*".repeat(12) : "",
    updatedAt: doc.updatedAt,
  };
};

const getAiAgentSettings = asyncHandler(async (req, res) => {
  const ownerUserId = assertRequiredString("auth.sub", req.auth?.sub, {
    min: 8,
    max: 120,
  });
  const partnerId = normalizePartnerId(req.query.partnerId || "");

  const filter = { ownerUserId };
  if (partnerId) {
    filter.partnerId = partnerId;
  }

  const settings = await AiAgentSettings.findOne(filter).sort({ updatedAt: -1 });
  if (!settings) {
    return res.status(404).json({ message: "AI agent settings not configured" });
  }

  return res.json(toSafeAiAgentResponse(settings));
});

const upsertAiAgentSettings = asyncHandler(async (req, res) => {
  const ownerUserId = assertRequiredString("auth.sub", req.auth?.sub, {
    min: 8,
    max: 120,
  });
  const partnerId = normalizePartnerId(
    assertRequiredString("partnerId", req.body.partnerId, { min: 3, max: 80 }),
  );

  const providerName =
    assertOptionalString("providerName", req.body.providerName, {
      min: 2,
      max: 120,
    }) || "custom";
  const agentBaseUrl = assertOptionalHttpUrl("agentBaseUrl", req.body.agentBaseUrl, {
    max: 2000,
  });
  const webhookUrl = assertOptionalHttpUrl("webhookUrl", req.body.webhookUrl, {
    max: 2000,
  });
  const callbackBaseUrl = assertOptionalHttpUrl(
    "callbackBaseUrl",
    req.body.callbackBaseUrl,
    {
      max: 2000,
    },
  );
  const inputSchemaUrl = assertOptionalHttpUrl(
    "inputSchemaUrl",
    req.body.inputSchemaUrl,
    {
      max: 2000,
    },
  );

  const findUserPath =
    assertOptionalString("findUserPath", req.body.findUserPath, {
      min: 2,
      max: 300,
    }) || "/api/demo-bank/agent/find-user";
  const sendOtpPath =
    assertOptionalString("sendOtpPath", req.body.sendOtpPath, {
      min: 2,
      max: 300,
    }) || "/api/demo-bank/agent/send-otp";
  const verifyOtpPath =
    assertOptionalString("verifyOtpPath", req.body.verifyOtpPath, {
      min: 2,
      max: 300,
    }) || "/api/demo-bank/agent/verify-otp";
  const adminResetPath =
    assertOptionalString("adminResetPath", req.body.adminResetPath, {
      min: 2,
      max: 300,
    }) || "/api/demo-bank/agent/admin-reset";

  const authTypeRaw =
    assertOptionalString("authType", req.body.authType, { min: 2, max: 20 }) ||
    "NONE";
  const authType = authTypeRaw.toUpperCase();
  if (!["NONE", "API_KEY", "BEARER"].includes(authType)) {
    throw new HttpError(400, "authType must be NONE, API_KEY, or BEARER");
  }

  const hasCustomHeaders = Object.prototype.hasOwnProperty.call(
    req.body,
    "customHeaders",
  );
  const customHeaders =
    Array.isArray(req.body.customHeaders) ?
      assertStringArray("customHeaders", req.body.customHeaders, {
        minItems: 0,
        maxItems: 30,
        itemMin: 3,
        itemMax: 400,
      })
    : [];

  const hasSupportedLanguages = Object.prototype.hasOwnProperty.call(
    req.body,
    "supportedLanguages",
  );
  const supportedLanguages =
    Array.isArray(req.body.supportedLanguages) ?
      assertStringArray("supportedLanguages", req.body.supportedLanguages, {
        minItems: 1,
        maxItems: 20,
        itemMin: 2,
        itemMax: 40,
      }).map((item) => item.toLowerCase())
    : ["nodejs", "java", "php", "golang", "aspnet"];

  const enableAutoResetEmail = assertBoolean(
    "enableAutoResetEmail",
    req.body.enableAutoResetEmail,
    true,
  );
  const enableAdminReset = assertBoolean(
    "enableAdminReset",
    req.body.enableAdminReset,
    true,
  );
  const enabled = assertBoolean("enabled", req.body.enabled, true);

  const outboundSecretInput = assertOptionalString(
    "outboundSecret",
    req.body.outboundSecret,
    {
      min: 6,
      max: 1000,
    },
  );

  const existing = await AiAgentSettings.findOne({ partnerId });
  if (existing && existing.ownerUserId !== ownerUserId) {
    throw new HttpError(403, "This partner AI agent settings belong to another admin");
  }

  const settings =
    existing ||
    new AiAgentSettings({
      ownerUserId,
      partnerId,
      providerName,
      authType,
      outboundSecret: "",
      customHeaders,
      supportedLanguages,
      enableAutoResetEmail,
      enableAdminReset,
      enabled,
    });

  settings.ownerUserId = ownerUserId;
  settings.partnerId = partnerId;
  settings.providerName = providerName;
  settings.agentBaseUrl = agentBaseUrl;
  settings.findUserPath = findUserPath;
  settings.sendOtpPath = sendOtpPath;
  settings.verifyOtpPath = verifyOtpPath;
  settings.adminResetPath = adminResetPath;
  settings.webhookUrl = webhookUrl;
  settings.callbackBaseUrl = callbackBaseUrl;
  settings.inputSchemaUrl = inputSchemaUrl;
  settings.authType = authType;
  if (hasCustomHeaders) {
    settings.customHeaders = customHeaders;
  }
  if (hasSupportedLanguages) {
    settings.supportedLanguages = supportedLanguages;
  }
  settings.enableAutoResetEmail = enableAutoResetEmail;
  settings.enableAdminReset = enableAdminReset;
  settings.enabled = enabled;

  if (outboundSecretInput) {
    settings.outboundSecret = outboundSecretInput;
  }

  await settings.save();

  return res.json(toSafeAiAgentResponse(settings));
});

const getAiAgentSettingsForPartner = asyncHandler(async (req, res) => {
  const partnerId = normalizePartnerId(
    assertRequiredString("partnerId", req.query.partnerId || req.body?.partnerId, {
      min: 3,
      max: 80,
    }),
  );

  // Security Check: Ensure the requester (partner) is only accessing their own settings
  if (req.partner && req.partner.partnerId !== partnerId) {
    throw new HttpError(403, "Access denied: You can only access settings for your own partnerId");
  }

  const settings = await AiAgentSettings.findOne({ partnerId, enabled: true });
  if (!settings) {
    throw new HttpError(404, "Partner AI agent settings not configured");
  }

  return res.json({
    partnerId: settings.partnerId,
    providerName: settings.providerName || "custom",
    agentBaseUrl: settings.agentBaseUrl || "",
    findUserPath: settings.findUserPath || "/api/demo-bank/agent/find-user",
    sendOtpPath: settings.sendOtpPath || "/api/demo-bank/agent/send-otp",
    verifyOtpPath: settings.verifyOtpPath || "/api/demo-bank/agent/verify-otp",
    adminResetPath: settings.adminResetPath || "/api/demo-bank/agent/admin-reset",
    webhookUrl: settings.webhookUrl || "",
    callbackBaseUrl: settings.callbackBaseUrl || "",
    inputSchemaUrl: settings.inputSchemaUrl || "",
    authType: settings.authType || "NONE",
    outboundSecret: settings.outboundSecret || "",
    customHeaders: Array.isArray(settings.customHeaders) ? settings.customHeaders : [],
    supportedLanguages:
      Array.isArray(settings.supportedLanguages) ? settings.supportedLanguages : [],
    enableAutoResetEmail: Boolean(settings.enableAutoResetEmail),
    enableAdminReset: Boolean(settings.enableAdminReset),
    enabled: Boolean(settings.enabled),
  });
});

module.exports = {
  getEmailSettings,
  upsertEmailSettings,
  getEmailSettingsForPartner,
  getAiAgentSettings,
  upsertAiAgentSettings,
  getAiAgentSettingsForPartner,
};
