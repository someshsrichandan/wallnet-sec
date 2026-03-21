const { createHash, createHmac } = require("crypto");

const VisualCredential = require("../models/visualCredential.model");
const VisualSession = require("../models/visualSession.model");
const { logEvent } = require("./auditLog.service");

// ─── Device Trust Scoring ──────────────────────────────────────────────────
// Computes a 0-100 trust score based on how closely the current device
// fingerprint matches previously seen devices for this credential.

const computeDeviceFingerprint = (deviceInfo = {}) => {
  const raw = [
    deviceInfo.screenWidth || "",
    deviceInfo.screenHeight || "",
    deviceInfo.timezone || "",
    deviceInfo.language || "",
    deviceInfo.platform || "",
    deviceInfo.colorDepth || "",
    deviceInfo.touchSupport || "",
    deviceInfo.cookiesEnabled || "",
  ].join("|");

  return createHash("sha256").update(raw).digest("hex");
};

const computeDeviceTrustScore = async ({
  partnerId,
  userId,
  requestFingerprint,
  deviceFingerprint,
}) => {
  const credential = await VisualCredential.findOne({
    partnerId,
    userId,
  }).lean();
  if (!credential) return { score: 0, factors: { noCredential: true } };

  const knownFingerprints = credential.knownFingerprints || [];
  const factors = {
    requestFingerprintKnown: knownFingerprints.includes(requestFingerprint),
    deviceFingerprintKnown: knownFingerprints.includes(deviceFingerprint),
    totalKnownDevices: knownFingerprints.length,
    isFirstDevice: knownFingerprints.length === 0,
  };

  let score = 50; // baseline

  if (factors.isFirstDevice) {
    score = 70; // first enrollment gets benefit of the doubt
  } else if (factors.requestFingerprintKnown) {
    score += 35;
  } else if (factors.deviceFingerprintKnown) {
    score += 25;
  } else {
    score -= 30; // completely unknown device
  }

  // Suspicious history lowers trust
  if (credential.suspiciousAttemptCount > 0) {
    score -= Math.min(20, credential.suspiciousAttemptCount * 5);
  }

  score = Math.max(0, Math.min(100, score));

  return { score, factors };
};

// ─── Geo-Velocity Check ────────────────────────────────────────────────────
// Checks if the user is logging in from an impossible geographic location
// based on time elapsed and distance traveled since last session.

const GEO_CACHE = new Map();
const GEO_CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

const lookupGeo = async (ip) => {
  if (
    !ip ||
    ip === "::1" ||
    ip === "127.0.0.1" ||
    ip.startsWith("192.168.") ||
    ip.startsWith("10.")
  ) {
    return { country: "Local", city: "Local", lat: 0, lon: 0 };
  }

  const cached = GEO_CACHE.get(ip);
  if (cached && Date.now() - cached.ts < GEO_CACHE_TTL_MS) {
    return cached.data;
  }

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3000);
    const response = await fetch(
      `http://ip-api.com/json/${ip}?fields=status,country,city,lat,lon`,
      {
        signal: controller.signal,
      },
    );
    clearTimeout(timer);

    const data = await response.json();
    if (data.status === "success") {
      const geo = {
        country: data.country || "",
        city: data.city || "",
        lat: data.lat || 0,
        lon: data.lon || 0,
      };
      GEO_CACHE.set(ip, { data: geo, ts: Date.now() });
      return geo;
    }
  } catch {
    // Geo lookup failure is non-critical
  }

  return { country: "", city: "", lat: 0, lon: 0 };
};

const haversineDistanceKm = (lat1, lon1, lat2, lon2) => {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const MAX_SPEED_KM_PER_HOUR = 900; // ~commercial flight speed

const checkGeoVelocity = async ({ partnerId, userId, currentIp, req }) => {
  const currentGeo = await lookupGeo(currentIp);

  // Find last successful session for this user
  const lastSession = await VisualSession.findOne({
    partnerId,
    userId,
    status: "PASS",
    verifiedAt: { $ne: null },
  })
    .sort({ verifiedAt: -1 })
    .lean();

  if (!lastSession || !lastSession.verifiedAt) {
    return {
      flagged: false,
      currentGeo,
      previousGeo: null,
      distanceKm: 0,
      speedKmh: 0,
    };
  }

  // Get IP from last session's metadata or audit log
  const lastIp = lastSession.metadata?.ip || "";
  if (!lastIp) {
    return {
      flagged: false,
      currentGeo,
      previousGeo: null,
      distanceKm: 0,
      speedKmh: 0,
    };
  }

  const previousGeo = await lookupGeo(lastIp);

  if (!currentGeo.lat || !previousGeo.lat) {
    return {
      flagged: false,
      currentGeo,
      previousGeo,
      distanceKm: 0,
      speedKmh: 0,
    };
  }

  const distanceKm = haversineDistanceKm(
    previousGeo.lat,
    previousGeo.lon,
    currentGeo.lat,
    currentGeo.lon,
  );
  const elapsedHours =
    (Date.now() - new Date(lastSession.verifiedAt).getTime()) /
    (1000 * 60 * 60);
  const speedKmh = elapsedHours > 0 ? distanceKm / elapsedHours : 0;

  const flagged = distanceKm > 100 && speedKmh > MAX_SPEED_KM_PER_HOUR;

  if (flagged) {
    await logEvent({
      action: "GEO_VELOCITY_FLAG",
      partnerId,
      userId,
      req,
      geo: currentGeo,
      metadata: {
        previousGeo,
        distanceKm: Math.round(distanceKm),
        speedKmh: Math.round(speedKmh),
        elapsedMinutes: Math.round(elapsedHours * 60),
      },
    });
  }

  return {
    flagged,
    currentGeo,
    previousGeo,
    distanceKm: Math.round(distanceKm),
    speedKmh: Math.round(speedKmh),
  };
};

// ─── Behavioral Biometrics ─────────────────────────────────────────────────
// Tracks timing patterns during verification and compares against baseline.

const analyzeBehavior = async ({ partnerId, userId, timingData, req }) => {
  if (!timingData) return { anomaly: false, score: 100, factors: {} };

  const {
    challengeLoadToSubmitMs = 0,
    keypadInteractionMs = 0,
    totalInteractionMs = 0,
    inputSequenceDelays = [],
  } = timingData;

  const factors = {};
  let score = 100;

  // Bot detection: too fast (under 2 seconds is not humanly possible)
  if (challengeLoadToSubmitMs > 0 && challengeLoadToSubmitMs < 2000) {
    factors.tooFast = true;
    score -= 50;
  }

  // Too slow (over 4 minutes suggests relay/proxy)
  if (challengeLoadToSubmitMs > 240_000) {
    factors.tooSlow = true;
    score -= 20;
  }

  // Uniform timing between inputs suggests automation
  if (inputSequenceDelays.length >= 3) {
    const delays = inputSequenceDelays.map(Number).filter((d) => d > 0);
    if (delays.length >= 3) {
      const mean = delays.reduce((s, d) => s + d, 0) / delays.length;
      const variance =
        delays.reduce((s, d) => s + (d - mean) ** 2, 0) / delays.length;
      const stdDev = Math.sqrt(variance);
      const cv = mean > 0 ? stdDev / mean : 0;

      // Coefficient of variation < 0.1 means eerily uniform — likely automated
      if (cv < 0.1 && delays.length >= 5) {
        factors.uniformTiming = true;
        score -= 30;
      }

      factors.timingCv = Math.round(cv * 100) / 100;
      factors.meanDelayMs = Math.round(mean);
    }
  }

  // Zero keypad interaction time = virtual keypad bypass attempt
  if (keypadInteractionMs === 0 && totalInteractionMs > 0) {
    factors.noKeypadInteraction = true;
    score -= 15;
  }

  score = Math.max(0, Math.min(100, score));
  const anomaly = score < 50;

  if (anomaly) {
    await logEvent({
      action: "BEHAVIORAL_ANOMALY",
      partnerId,
      userId,
      req,
      metadata: {
        behaviorScore: score,
        factors,
        challengeLoadToSubmitMs,
      },
    });
  }

  return { anomaly, score, factors };
};

// ─── Webhook HMAC Signing ──────────────────────────────────────────────────

/**
 * Sign a webhook payload body string using HMAC-SHA256.
 * This is the same pattern Razorpay uses for webhook verification.
 *
 * Partners verify like:
 *   const expectedSig = crypto.createHmac('sha256', webhookSecret)
 *     .update(rawBody).digest('hex');
 *   if (expectedSig === req.headers['x-wallnet-signature']) { ... }
 */
const signWebhookPayload = (bodyString, webhookSecret) => {
  if (!webhookSecret) return "";
  return createHmac("sha256", webhookSecret).update(bodyString).digest("hex");
};

// ─── Webhook Delivery ──────────────────────────────────────────────────────

const deliverWebhook = async ({
  url,
  payload,
  partnerId,
  sessionToken,
  req,
  webhookSecret,
}) => {
  if (!url) return { delivered: false, reason: "no_url" };

  try {
    const timestamp = new Date().toISOString();
    const body = JSON.stringify({
      event: payload.event || "session.completed",
      data: payload,
      timestamp,
    });

    // Sign the body with HMAC-SHA256 if webhookSecret is available
    const signature = signWebhookPayload(body, webhookSecret || "");

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10_000);

    const headers = {
      "Content-Type": "application/json",
      "X-Webhook-Event": payload.event || "session.completed",
      "X-Partner-Id": partnerId || "",
      "X-Wallnet-Timestamp": timestamp,
    };

    // Include HMAC signature if we have a webhook secret
    if (signature) {
      headers["X-Wallnet-Signature"] = signature;
    }

    const response = await fetch(url, {
      method: "POST",
      headers,
      body,
      signal: controller.signal,
    });

    clearTimeout(timer);

    const delivered = response.ok;

    await logEvent({
      action: delivered ? "WEBHOOK_SENT" : "WEBHOOK_FAILED",
      partnerId,
      sessionToken,
      req,
      metadata: {
        webhookUrl: url,
        statusCode: response.status,
        event: payload.event,
        signed: Boolean(signature),
      },
    });

    return { delivered, statusCode: response.status };
  } catch (error) {
    await logEvent({
      action: "WEBHOOK_FAILED",
      partnerId,
      sessionToken,
      req,
      metadata: {
        webhookUrl: url,
        error: error.message,
        event: payload?.event,
      },
    });

    return { delivered: false, reason: error.message };
  }
};

module.exports = {
  analyzeBehavior,
  checkGeoVelocity,
  computeDeviceFingerprint,
  computeDeviceTrustScore,
  deliverWebhook,
  lookupGeo,
  signWebhookPayload,
};
