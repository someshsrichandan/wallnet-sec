const { randomUUID } = require("crypto");

const env = require("../config/env");
const VisualCredential = require("../models/visualCredential.model");
const VisualEnrollSession = require("../models/visualEnrollSession.model");
const VisualSession = require("../models/visualSession.model");
const PartnerKey = require("../models/partnerKey.model");
const { decryptJson } = require("../utils/fieldEncryption");
const asyncHandler = require("../utils/asyncHandler");
const HttpError = require("../utils/httpError");
const { signToken, verifyToken } = require("../utils/token");
const {
  assertOptionalHttpUrl,
  assertOptionalString,
  assertRequiredString,
} = require("../utils/validators");
const {
  FORMULA_MODE,
  CATALOG_TYPE,
  DEFAULT_SALT_VALUE,
  MAX_FAILED_ATTEMPTS_BEFORE_LOCK,
  SESSION_TTL_MS,
  assertForceFilledGrid,
  buildPartnerRedirectUrl,
  buildShuffledKeypadLayout,
  createChallengePayload,
  createRequestFingerprint,
  detectHoneyPotAttempt,
  getCatalogItemsByType,
  resolveCatalogImageUrl,
  normalizeAlphabetMode,
  normalizeAlphabetInput,
  normalizeCatalogType,
  normalizeFormulaMode,
  normalizePositionPair,
  normalizeSaltValue,
  normalizeSecretLetters,
  normalizeSecretVegetableList,
  regenerateChallengeNumbers,
} = require("../services/visualPassword.service");
const { logEvent } = require("../services/auditLog.service");
const { evaluateFraudRisk } = require("../services/aiGateway.service");
const {
  analyzeBehavior,
  checkGeoVelocity,
  computeDeviceTrustScore,
  deliverWebhook,
  lookupGeo,
} = require("../services/security.service");

const normalizeIdentity = (value) =>
  String(value || "")
    .trim()
    .toLowerCase();

const ensureArray = (value) => (Array.isArray(value) ? value : []);

const resolveCredentialSecrets = (credential) => {
  const rawVegetables = credential?.secretVegetables;
  const rawLetters = credential?.secretLetters;

  // Decrypt both fields. If decryptJson fails (wrong key, corrupt ciphertext),
  // it returns the fallback value (empty array).
  const secretVegetables = ensureArray(
    typeof rawVegetables === "string" ?
      decryptJson(rawVegetables, [])
    : rawVegetables,
  );
  const secretLetters = ensureArray(
    typeof rawLetters === "string" ? decryptJson(rawLetters, []) : rawLetters,
  );

  const vegetablesOk = secretVegetables.length === 4;
  const lettersOk = secretLetters.length === 2;

  if (!vegetablesOk || !lettersOk) {
    // Log server-side to help diagnose key-rotation issues without exposing secrets.
    // eslint-disable-next-line no-console
    console.warn(
      `[visual-password] resolveCredentialSecrets: decryption failed for credential ` +
        `partnerId="${credential?.partnerId}" userId="${credential?.userId}". ` +
        `vegetables=${secretVegetables.length}/4, letters=${secretLetters.length}/2. ` +
        `This usually indicates a VISUAL_DATA_ENCRYPTION_KEY rotation. ` +
        `The partner login/start route will trigger re-enrollment automatically.`,
    );

    throw new HttpError(
      422,
      "Stored visual secret data could not be decrypted. Please re-enroll visual password.",
    );
  }

  return { secretVegetables, secretLetters };
};
const LEGACY_TRANSFORMATION_RULE = Object.freeze({
  ADD_5: { formulaMode: FORMULA_MODE.SALT_ADD, saltValue: 5 },
  ADD_3: { formulaMode: FORMULA_MODE.SALT_ADD, saltValue: 3 },
  REVERSE: { formulaMode: FORMULA_MODE.SALT_ADD, saltValue: null },
  MOD_7: { formulaMode: FORMULA_MODE.SALT_ADD, saltValue: null },
});

const isAllowedCallbackUrl = (callbackUrl) => {
  if (!callbackUrl) {
    return true;
  }

  if (!env.partnerCallbackAllowlist.length) {
    return true;
  }

  const callbackOrigin = new URL(callbackUrl).origin.toLowerCase();
  return env.partnerCallbackAllowlist.includes(callbackOrigin);
};

const resolveSourceHost = (callbackUrl, originHeader) => {
  const candidate = String(callbackUrl || originHeader || "").trim();
  if (!candidate) {
    return "";
  }

  try {
    const normalized =
      candidate.startsWith("http://") || candidate.startsWith("https://") ?
        candidate
      : `https://${candidate}`;
    return new URL(normalized).hostname.toLowerCase();
  } catch {
    return "";
  }
};

const getSessionByToken = async (sessionToken) => {
  const session = await VisualSession.findOne({ sessionToken });
  if (!session) {
    throw new HttpError(404, "Session not found");
  }
  return session;
};

const lockIfExpired = async (session) => {
  if (session.expiresAt.getTime() > Date.now()) {
    return false;
  }

  if (session.status !== "EXPIRED") {
    session.status = "EXPIRED";
    await session.save();
  }

  return true;
};

const registerFailureAttempt = (session) => {
  session.attemptCount += 1;
  if (session.attemptCount > session.maxAttempts) {
    session.status = "LOCKED";
    return;
  }

  session.status = "FAIL";
};

const getRemainingAttempts = (session) =>
  Math.max(0, session.maxAttempts + 1 - session.attemptCount);

const resolveStoredSaltValue = (credential) => {
  const fallbackSalt = env.visualSaltValue || DEFAULT_SALT_VALUE;
  try {
    return normalizeSaltValue(credential?.saltValue, fallbackSalt);
  } catch {
    return fallbackSalt;
  }
};

const resolveCredentialChallengeConfig = (credential) => {
  const storedRule = String(
    credential?.formulaMode || credential?.transformationRule || "",
  )
    .trim()
    .toUpperCase();
  const saltValue = resolveStoredSaltValue(credential);

  if (!storedRule) {
    return {
      formulaMode: FORMULA_MODE.SALT_ADD,
      saltValue,
    };
  }

  const legacyRule = LEGACY_TRANSFORMATION_RULE[storedRule];
  if (legacyRule) {
    return {
      formulaMode: legacyRule.formulaMode,
      saltValue: legacyRule.saltValue ?? saltValue,
    };
  }

  try {
    return {
      formulaMode: normalizeFormulaMode(storedRule),
      saltValue,
    };
  } catch {
    return {
      formulaMode: FORMULA_MODE.SALT_ADD,
      saltValue,
    };
  }
};

const buildSessionPartnerRedirect = (session) => {
  if (!session.callbackUrl) {
    // If no callback URL is provided, redirect to a reasonable fallback
    // In many cases, this happens during the main SaaS login or a misconfigured partner.
    return "/admin/login";
  }

  return buildPartnerRedirectUrl(session.callbackUrl, {
    result: session.status,
    signature:
      session.status === "PASS" ? session.verificationSignature : undefined,
    state: session.partnerState || undefined,
    sessionToken: session.sessionToken,
    partnerId: session.partnerId,
    userId: session.userId,
  });
};

const ensureEnrollmentOwnership = (credential, authUserId) => {
  if (!credential) {
    throw new HttpError(404, "Visual profile not found");
  }

  if (credential.ownerUserId !== authUserId) {
    throw new HttpError(403, "You can only access your own visual profile");
  }
};

const deriveDeterministicRiskAction = ({
  passed,
  sessionStatus,
  honeypotDetected,
}) => {
  if (honeypotDetected || sessionStatus === "LOCKED") {
    return "BLOCK";
  }

  if (passed) {
    return "ALLOW";
  }

  return "CHALLENGE";
};

const enroll = asyncHandler(async (req, res) => {
  const authUserId = assertRequiredString("auth.sub", req.auth?.sub, {
    min: 8,
    max: 120,
  });
  const partnerId = normalizeIdentity(
    assertRequiredString("partnerId", req.body.partnerId, { min: 3, max: 80 }),
  );
  const userId = normalizeIdentity(
    assertRequiredString("userId", req.body.userId, { min: 3, max: 120 }),
  );

  const catalogType = normalizeCatalogType(
    req.body.catalogType || CATALOG_TYPE.VEGETABLE,
  );
  const secretVegetables = normalizeSecretVegetableList(
    req.body.secretVegetables,
    catalogType,
  );
  const secretLetters = normalizeSecretLetters(req.body.secretLetters);
  const saltValue = normalizeSaltValue(
    req.body.saltValue,
    env.visualSaltValue || DEFAULT_SALT_VALUE,
  );
  const formulaMode = normalizeFormulaMode(req.body.formulaMode);
  const alphabetMode = normalizeAlphabetMode(req.body.alphabetMode);
  const rawPositionPair =
    req.body.positionPair !== undefined ?
      req.body.positionPair
    : req.body.positionCell;
  const normalizedPositionPair =
    formulaMode === FORMULA_MODE.POSITION_SUM ?
      normalizePositionPair(rawPositionPair)
    : [];
  const positionPair =
    formulaMode === FORMULA_MODE.POSITION_SUM && normalizedPositionPair.length ?
      [normalizedPositionPair[0]]
    : [];

  if (formulaMode === FORMULA_MODE.POSITION_SUM && positionPair.length !== 1) {
    throw new HttpError(
      400,
      "positionPair must contain exactly 1 position for POSITION_SUM mode",
    );
  }

  const existing = await VisualCredential.findOne({ partnerId, userId });
  if (existing && existing.ownerUserId !== authUserId) {
    throw new HttpError(403, "You can only update your own visual profile");
  }

  const credential = await VisualCredential.findOneAndUpdate(
    { partnerId, userId },
    {
      ownerUserId: authUserId,
      partnerId,
      userId,
      catalogType,
      secretVegetables,
      pairVegetables: [],
      secretLetters,
      saltValue,
      formulaMode,
      alphabetMode,
      positionPair,
      active: true,
    },
    {
      upsert: true,
      returnDocument: "after",
      setDefaultsOnInsert: true,
    },
  );

  res.status(201).json({
    id: credential.id,
    partnerId: credential.partnerId,
    userId: credential.userId,
    catalogType: credential.catalogType || CATALOG_TYPE.VEGETABLE,
    secretVegetables: credential.secretVegetables,
    pairVegetables: [],
    secretLetters: credential.secretLetters,
    saltValue: credential.saltValue,
    formulaMode: credential.formulaMode,
    alphabetMode: credential.alphabetMode,
    positionPair: credential.positionPair || [],
    updatedAt: credential.updatedAt,
  });

  // Fire-and-forget audit log
  logEvent({
    action: existing ? "ENROLL_UPDATE" : "ENROLL",
    partnerId,
    ownerUserId: authUserId,
    userId,
    req,
    metadata: { catalogType, formulaMode },
  });
});

const getEnrollmentStatus = asyncHandler(async (req, res) => {
  const authUserId = assertRequiredString("auth.sub", req.auth?.sub, {
    min: 8,
    max: 120,
  });
  const partnerId = normalizeIdentity(
    assertRequiredString("partnerId", req.params.partnerId, {
      min: 3,
      max: 80,
    }),
  );
  const userId = normalizeIdentity(
    assertRequiredString("userId", req.params.userId, { min: 3, max: 120 }),
  );

  const credential = await VisualCredential.findOne({
    partnerId,
    userId,
  });

  if (credential) {
    ensureEnrollmentOwnership(credential, authUserId);
  }

  const challengeConfig =
    credential ?
      resolveCredentialChallengeConfig(credential)
    : { formulaMode: FORMULA_MODE.SALT_ADD };

  res.json({
    enrolled: Boolean(credential?.active),
    partnerId,
    userId,
    catalogType: credential?.catalogType || CATALOG_TYPE.VEGETABLE,
    secretVegetables: credential?.secretVegetables || [],
    formulaMode: challengeConfig.formulaMode,
    alphabetMode: credential?.alphabetMode || "SEQUENTIAL",
    positionPair: credential?.positionPair || [],
    updatedAt: credential?.updatedAt || null,
  });
});

const initAuth = asyncHandler(async (req, res) => {
  const partnerId = normalizeIdentity(
    assertRequiredString("partnerId", req.body.partnerId, { min: 3, max: 80 }),
  );
  const userId = normalizeIdentity(
    assertRequiredString("userId", req.body.userId, { min: 3, max: 120 }),
  );
  const callbackUrl = assertOptionalHttpUrl(
    "callbackUrl",
    req.body.callbackUrl,
  );
  const state = assertOptionalString("state", req.body.state, { max: 200 });

  if (
    callbackUrl &&
    env.nodeEnv === "production" &&
    callbackUrl.startsWith("http://")
  ) {
    throw new HttpError(400, "callbackUrl must use https in production");
  }

  if (!isAllowedCallbackUrl(callbackUrl)) {
    throw new HttpError(403, "callbackUrl origin is not allowed");
  }

  if (env.nodeEnv !== "production") {
    // Helps diagnose mismatches between enrollment and init-auth identifiers.
    // Do not log secrets; only the lookup keys.
    // eslint-disable-next-line no-console
    console.log(
      `[visual-password] init-auth lookup partnerId="${partnerId}" userId="${userId}"`,
    );
  }

  const credential = await VisualCredential.findOne({
    partnerId,
    userId,
    active: true,
  });
  if (!credential) {
    throw new HttpError(
      404,
      `No visual profile enrolled for partnerId="${partnerId}" and userId="${userId}"`,
    );
  }

  const resolvedCatalogType = credential.catalogType || CATALOG_TYPE.VEGETABLE;
  const challengeConfig = resolveCredentialChallengeConfig(credential);
  const { secretVegetables, secretLetters } =
    resolveCredentialSecrets(credential);

  const challenge = createChallengePayload({
    secretVegetables,
    secretLetters,
    saltValue: challengeConfig.saltValue,
    gridSize: env.visualAlphabetGridSize,
    formulaMode: challengeConfig.formulaMode,
    alphabetMode: credential.alphabetMode || "SEQUENTIAL",
    catalogType: resolvedCatalogType,
    positionPair: credential.positionPair || [],
    pairVegetables: [],
  });
  challenge.vegetables = await Promise.all(
    challenge.vegetables.map(async (item) => ({
      ...item,
      imageUrl: await resolveCatalogImageUrl(item.name, resolvedCatalogType),
    })),
  );

  const sessionToken = randomUUID();
  const expiresAt = new Date(
    Date.now() + (env.visualSessionTtlMs || SESSION_TTL_MS),
  );
  const sourceHost = resolveSourceHost(callbackUrl, req.get("origin"));
  const authKeyId = String(req.partner?.keyId || "").trim();
  const authKeyDocId = String(req.partner?.keyDocId || "").trim();
  const authMethod = String(req.partner?.authMethod || "").trim();

  await VisualSession.create({
    sessionId: sessionToken,
    sessionToken,
    partnerId,
    userId,
    catalogType: resolvedCatalogType,
    ownerUserId: credential.ownerUserId,
    authKeyDocId,
    authKeyId,
    authMethod,
    sourceHost,
    callbackUrl,
    partnerState: state,
    vegetables: challenge.vegetables,
    alphabetGrid: challenge.alphabetGrid,
    secretLetters,
    selectedSecretVegetable: challenge.selectedSecretVegetable,
    fruitSelectionVerifiedAt: null,
    selectedSecretNumber: challenge.selectedSecretNumber,
    saltValue: challengeConfig.saltValue,
    expectedDigitOne: challenge.expectedDigitOne,
    expectedDigitTwo: challenge.expectedDigitTwo,
    formulaMode: challenge.formulaMode,
    formulaHint: challenge.formulaHint,
    maxAttempts: env.visualMaxAttempts || MAX_FAILED_ATTEMPTS_BEFORE_LOCK,
    expiresAt,
  });

  // ── Security enrichment (fire-and-forget, non-blocking) ──
  const clientIp = req.ip || req.headers?.["x-forwarded-for"] || "";
  const requestFingerprint = createRequestFingerprint(req);

  const [geoVelocityResult, deviceTrustResult, geo] = await Promise.all([
    checkGeoVelocity({ partnerId, userId, currentIp: clientIp, req }).catch(
      () => ({ flagged: false }),
    ),
    computeDeviceTrustScore({
      partnerId,
      userId,
      requestFingerprint,
      deviceFingerprint: "",
    }).catch(() => ({ score: 50 })),
    lookupGeo(clientIp).catch(() => ({})),
  ]);

  const riskFlags = [];
  if (geoVelocityResult.flagged) riskFlags.push("IMPOSSIBLE_TRAVEL");
  if (deviceTrustResult.score < 30) riskFlags.push("LOW_DEVICE_TRUST");

  logEvent({
    action: "INIT_AUTH",
    partnerId,
    ownerUserId: credential.ownerUserId,
    userId,
    sessionToken,
    req,
    geo,
    metadata: {
      catalogType: resolvedCatalogType,
      formulaMode: challenge.formulaMode,
      deviceTrustScore: deviceTrustResult.score,
      geoVelocityFlagged: geoVelocityResult.flagged,
      riskFlags,
    },
  });

  if (deviceTrustResult.score < 30) {
    logEvent({
      action: "DEVICE_TRUST_LOW",
      partnerId,
      ownerUserId: credential.ownerUserId,
      userId,
      sessionToken,
      req,
      geo,
      metadata: deviceTrustResult,
    });
  }

  res.status(201).json({
    sessionToken,
    expiresAt,
    verifyPath: `/verify/${sessionToken}`,
    riskFlags: riskFlags.length ? riskFlags : undefined,
  });
});

const getChallenge = asyncHandler(async (req, res) => {
  const sessionToken = assertRequiredString(
    "sessionToken",
    req.params.sessionToken,
    {
      min: 20,
      max: 120,
    },
  );

  const session = await getSessionByToken(sessionToken);

  if (await lockIfExpired(session)) {
    throw new HttpError(410, "Session expired");
  }

  const requestFingerprint = createRequestFingerprint(req);
  if (!session.requestFingerprint) {
    session.requestFingerprint = requestFingerprint;
  } else if (
    env.isProduction &&
    session.requestFingerprint !== requestFingerprint
  ) {
    throw new HttpError(
      403,
      "Challenge can only be loaded from the original browser/device",
    );
  }

  // Rebuild the entire board on every challenge load so that a different
  // random secret vegetable is chosen from the user's enrolled set each time.
  const credential = await VisualCredential.findOne({
    partnerId: session.partnerId,
    userId: session.userId,
    active: true,
  });

  if (!credential) {
    throw new HttpError(404, "Visual profile not found for this session");
  }

  const resolvedCatalogType = credential.catalogType || CATALOG_TYPE.VEGETABLE;
  const challengeConfig = resolveCredentialChallengeConfig(credential);
  const { secretVegetables, secretLetters } =
    resolveCredentialSecrets(credential);

  const freshChallenge = createChallengePayload({
    secretVegetables,
    secretLetters,
    saltValue: challengeConfig.saltValue,
    gridSize: env.visualAlphabetGridSize,
    formulaMode: challengeConfig.formulaMode,
    alphabetMode: credential.alphabetMode || "SEQUENTIAL",
    catalogType: resolvedCatalogType,
    positionPair: credential.positionPair || [],
    pairVegetables: [],
  });
  freshChallenge.vegetables = await Promise.all(
    freshChallenge.vegetables.map(async (item) => ({
      ...item,
      imageUrl: await resolveCatalogImageUrl(item.name, resolvedCatalogType),
    })),
  );

  session.vegetables = freshChallenge.vegetables;
  session.selectedSecretVegetable = freshChallenge.selectedSecretVegetable;
  session.selectedSecretNumber = freshChallenge.selectedSecretNumber;
  session.expectedDigitOne = freshChallenge.expectedDigitOne;
  session.expectedDigitTwo = freshChallenge.expectedDigitTwo;
  session.formulaMode = freshChallenge.formulaMode;
  session.formulaHint = freshChallenge.formulaHint;
  session.alphabetGrid = freshChallenge.alphabetGrid;

  // Generate a CSRF nonce bound to this session — must be submitted with verify
  const csrfNonce = require("crypto").randomBytes(24).toString("hex");
  session.csrfNonce = csrfNonce;
  await session.save();

  logEvent({
    action: "CHALLENGE_LOADED",
    partnerId: session.partnerId,
    ownerUserId: session.ownerUserId,
    userId: session.userId,
    sessionToken,
    req,
    metadata: { fingerprint: requestFingerprint },
  });

  res.json({
    sessionToken: session.sessionToken,
    csrfNonce,
    expiresAt: session.expiresAt,
    maxAttempts: session.maxAttempts + 1,
    attempts: session.attemptCount,
    vegetables: freshChallenge.vegetables,
    alphabetGrid: session.alphabetGrid,
    keypadLayout: buildShuffledKeypadLayout(),
    requiresFullGrid: true,
    catalogType: session.catalogType || CATALOG_TYPE.VEGETABLE,
    requiresFruitSelection: true,
    fruitSelectionComplete: Boolean(session.fruitSelectionVerifiedAt),
    stage: session.fruitSelectionVerifiedAt ? "COGNITIVE" : "FRUIT",
  });
});

const verify = asyncHandler(async (req, res) => {
  const sessionToken = assertRequiredString(
    "sessionToken",
    req.body.sessionToken,
    { min: 20, max: 120 },
  );
  const session = await getSessionByToken(sessionToken);

  if (session.status === "PASS") {
    throw new HttpError(409, "Session already verified");
  }

  if (session.status === "LOCKED") {
    throw new HttpError(423, "Session is locked");
  }

  if (await lockIfExpired(session)) {
    throw new HttpError(410, "Session expired");
  }

  const requestFingerprint = createRequestFingerprint(req);
  if (
    env.isProduction &&
    (!session.requestFingerprint ||
      session.requestFingerprint !== requestFingerprint)
  ) {
    throw new HttpError(
      403,
      "Verification must happen from the original browser/device",
    );
  }

  // CSRF nonce replay protection
  const submittedNonce = (req.body.csrfNonce || "").trim();
  if (!session.csrfNonce || submittedNonce !== session.csrfNonce) {
    throw new HttpError(
      403,
      "Invalid or missing CSRF nonce — possible session replay",
    );
  }
  // Invalidate nonce after use (one-time use)
  session.csrfNonce = "";

  const hasInputsPayload =
    req.body.inputs !== undefined && req.body.inputs !== null;

  // Fruit selection is no longer a separate interactive step.
  // The board is a read-only number reference; the cognitive (alphabet) step is the only verification.
  // Auto-mark fruit stage as complete on first cognitive submission.
  if (!session.fruitSelectionVerifiedAt) {
    session.fruitSelectionVerifiedAt = new Date();
    session.status = "PENDING";
  }

  if (!hasInputsPayload) {
    throw new HttpError(400, "inputs are required for verification");
  }

  const inputs = normalizeAlphabetInput(req.body.inputs);
  assertForceFilledGrid({ alphabetGrid: session.alphabetGrid, inputs });

  const [letterOne, letterTwo] = session.secretLetters;
  const providedOne = String(inputs[letterOne] || "").trim();
  const providedTwo = String(inputs[letterTwo] || "").trim();

  const honeypotDetected =
    session.formulaMode === FORMULA_MODE.SALT_ADD ?
      detectHoneyPotAttempt({
        secretNumber: session.selectedSecretNumber,
        secretLetters: session.secretLetters,
        inputs,
      })
    : false;

  const passed =
    providedOne === session.expectedDigitOne &&
    providedTwo === session.expectedDigitTwo;

  session.lastAttemptAt = new Date();
  session.honeypotDetected = honeypotDetected;

  // ── Behavioral biometrics analysis ──
  const behaviorResult = await analyzeBehavior({
    partnerId: session.partnerId,
    userId: session.userId,
    timingData: req.body.timingData || null,
    req,
  }).catch(() => ({ anomaly: false, score: 100, factors: {} }));

  const clientIp = req.ip || req.headers?.["x-forwarded-for"] || "";
  const [geoVelocityResult, deviceTrustResult] = await Promise.all([
    checkGeoVelocity({
      partnerId: session.partnerId,
      userId: session.userId,
      currentIp: clientIp,
      req,
    }).catch(() => ({ flagged: false, distanceKm: 0, speedKmh: 0 })),
    computeDeviceTrustScore({
      partnerId: session.partnerId,
      userId: session.userId,
      requestFingerprint,
      deviceFingerprint: "",
    }).catch(() => ({ score: 50, factors: {} })),
  ]);

  const aiShadowEnabled = Boolean(req.ai?.features?.fraudShadowMode);
  let aiRiskResult = null;

  if (aiShadowEnabled) {
    aiRiskResult = await evaluateFraudRisk({
      signals: {
        behaviorScore: behaviorResult.score,
        behaviorAnomaly: behaviorResult.anomaly,
        honeypotDetected,
        attemptCount: session.attemptCount,
        maxAttempts: session.maxAttempts,
        geoVelocityFlagged: Boolean(geoVelocityResult.flagged),
        geoDistanceKm: Number(geoVelocityResult.distanceKm || 0),
        geoSpeedKmh: Number(geoVelocityResult.speedKmh || 0),
        deviceTrustScore: Number(deviceTrustResult.score || 0),
      },
      context: {
        partnerId: session.partnerId,
        userId: session.userId,
        sessionToken: session.sessionToken,
        requestId: req.requestId,
        mode: "SHADOW",
      },
    }).catch((error) => ({
      ok: false,
      error: error.message,
      latencyMs: 0,
      promptVersion: "fraud-risk-v1",
      fallback: {
        riskScore: 50,
        action: "REVIEW",
        confidence: 0,
        reasons: ["AI evaluation error, fallback used"],
        flags: ["AI_FALLBACK"],
      },
    }));
  }

  if (passed && !honeypotDetected) {
    session.status = "PASS";
    session.verifiedAt = new Date();
    session.verificationSignature = signToken(
      {
        sid: session.sessionToken,
        partnerId: session.partnerId,
        userId: session.userId,
        state: session.partnerState,
        result: "PASS",
      },
      {
        secret: env.tokenSecret,
        expiresInSec: Math.max(
          60,
          Math.floor((env.visualSessionTtlMs || SESSION_TTL_MS) / 1000),
        ),
      },
    );

    await VisualCredential.updateOne(
      { partnerId: session.partnerId, userId: session.userId },
      {
        $addToSet: { knownFingerprints: requestFingerprint },
      },
    );

    logEvent({
      action: "VERIFY_PASS",
      partnerId: session.partnerId,
      ownerUserId: session.ownerUserId,
      userId: session.userId,
      sessionToken,
      req,
      metadata: {
        behaviorScore: behaviorResult.score,
        attemptCount: session.attemptCount,
        aiShadowMode: aiShadowEnabled,
        aiProvider: aiRiskResult?.provider,
        aiModel: aiRiskResult?.model,
        aiAttempts: aiRiskResult?.attempts,
        aiDecision:
          aiRiskResult ?
            aiRiskResult.ok ?
              aiRiskResult.decision
            : aiRiskResult.fallback
          : undefined,
      },
    });
  } else {
    registerFailureAttempt(session);

    if (honeypotDetected) {
      await VisualCredential.updateOne(
        { partnerId: session.partnerId, userId: session.userId },
        {
          $inc: { suspiciousAttemptCount: 1 },
          $set: { lastSuspiciousAt: new Date() },
        },
      );

      logEvent({
        action: "HONEYPOT_DETECTED",
        partnerId: session.partnerId,
        ownerUserId: session.ownerUserId,
        userId: session.userId,
        sessionToken,
        req,
        metadata: {
          attemptCount: session.attemptCount,
          aiShadowMode: aiShadowEnabled,
          aiProvider: aiRiskResult?.provider,
          aiModel: aiRiskResult?.model,
          aiAttempts: aiRiskResult?.attempts,
          aiDecision:
            aiRiskResult ?
              aiRiskResult.ok ?
                aiRiskResult.decision
              : aiRiskResult.fallback
            : undefined,
        },
      });
    } else {
      logEvent({
        action: session.status === "LOCKED" ? "SESSION_LOCKED" : "VERIFY_FAIL",
        partnerId: session.partnerId,
        ownerUserId: session.ownerUserId,
        userId: session.userId,
        sessionToken,
        req,
        metadata: {
          attemptCount: session.attemptCount,
          behaviorScore: behaviorResult.score,
          aiShadowMode: aiShadowEnabled,
          aiProvider: aiRiskResult?.provider,
          aiModel: aiRiskResult?.model,
          aiAttempts: aiRiskResult?.attempts,
          aiDecision:
            aiRiskResult ?
              aiRiskResult.ok ?
                aiRiskResult.decision
              : aiRiskResult.fallback
            : undefined,
        },
      });
    }
  }

  const deterministicAction = deriveDeterministicRiskAction({
    passed,
    sessionStatus: session.status,
    honeypotDetected,
  });

  if (aiShadowEnabled && aiRiskResult) {
    const aiDecision =
      aiRiskResult.ok ? aiRiskResult.decision : aiRiskResult.fallback;
    const aiAction = String(aiDecision?.action || "REVIEW").toUpperCase();

    session.aiShadowSnapshot = {
      at: new Date(),
      mode: "SHADOW",
      promptVersion: aiRiskResult.promptVersion,
      latencyMs: aiRiskResult.latencyMs,
      provider: aiRiskResult.provider,
      model: aiRiskResult.model,
      attempts: aiRiskResult.attempts,
      skipped: aiRiskResult.skipped,
      ok: aiRiskResult.ok,
      error: aiRiskResult.ok ? undefined : aiRiskResult.error,
      deterministicAction,
      aiAction,
      disagreedWithDeterministic: aiAction !== deterministicAction,
      decision: aiDecision,
      fallbackUsed: !aiRiskResult.ok,
    };

    logEvent({
      action: "AI_FRAUD_ASSESSMENT",
      partnerId: session.partnerId,
      ownerUserId: session.ownerUserId,
      userId: session.userId,
      sessionToken,
      req,
      metadata: {
        mode: "SHADOW",
        promptVersion: aiRiskResult.promptVersion,
        latencyMs: aiRiskResult.latencyMs,
        provider: aiRiskResult.provider,
        model: aiRiskResult.model,
        attempts: aiRiskResult.attempts,
        skipped: aiRiskResult.skipped,
        ok: aiRiskResult.ok,
        error: aiRiskResult.ok ? undefined : aiRiskResult.error,
        deterministicAction,
        aiAction,
        disagreedWithDeterministic: aiAction !== deterministicAction,
        decision: aiDecision,
      },
    });
  }

  await session.save();

  const isTerminalForPartner =
    session.status === "PASS" || session.status === "LOCKED";
  const partnerRedirectUrl =
    isTerminalForPartner ? buildSessionPartnerRedirect(session) : "";

  // ── Webhook delivery for terminal states ──
  if (isTerminalForPartner) {
    // Look up partner's webhook URL
    PartnerKey.findOne({
      partnerId: session.partnerId,
      active: true,
      webhookUrl: { $ne: "" },
    })
      .lean()
      .then((partnerKey) => {
        if (partnerKey?.webhookUrl) {
          deliverWebhook({
            url: partnerKey.webhookUrl,
            payload: {
              event:
                session.status === "PASS" ? "session.passed" : "session.locked",
              sessionToken: session.sessionToken,
              partnerId: session.partnerId,
              userId: session.userId,
              status: session.status,
              signature: session.verificationSignature || undefined,
            },
            partnerId: session.partnerId,
            sessionToken,
            req,
            webhookSecret: partnerKey.webhookSecret || "",
          });
        }
      })
      .catch(() => {});
  }

  const riskFlags = [];
  if (behaviorResult.anomaly) riskFlags.push("BEHAVIOR_ANOMALY");
  if (honeypotDetected) riskFlags.push("HONEYPOT");
  if (geoVelocityResult.flagged) riskFlags.push("GEO_VELOCITY");
  if (deviceTrustResult.score < 30) riskFlags.push("LOW_DEVICE_TRUST");
  if (aiShadowEnabled && aiRiskResult) {
    const aiDecision =
      aiRiskResult.ok ? aiRiskResult.decision : aiRiskResult.fallback;
    if (Number(aiDecision?.riskScore || 0) >= 70) {
      riskFlags.push("AI_HIGH_RISK");
    }
  }

  res.json({
    result: session.status === "PASS" ? "PASS" : "FAIL",
    status: session.status,
    stage: "COMPLETE",
    fruitSelectionComplete: true,
    honeypotDetected,
    attempts: session.attemptCount,
    maxAttempts: session.maxAttempts + 1,
    remainingAttempts: getRemainingAttempts(session),
    verificationSignature:
      session.status === "PASS" ? session.verificationSignature : undefined,
    partnerRedirectUrl: partnerRedirectUrl || undefined,
    behaviorScore: behaviorResult.score,
    riskFlags: riskFlags.length ? riskFlags : undefined,
    aiShadow:
      aiShadowEnabled && aiRiskResult ?
        {
          enabled: true,
          mode: "SHADOW",
          promptVersion: aiRiskResult.promptVersion,
          latencyMs: aiRiskResult.latencyMs,
          provider: aiRiskResult.provider,
          model: aiRiskResult.model,
          attempts: aiRiskResult.attempts,
          skipped: aiRiskResult.skipped,
          fallbackUsed: !aiRiskResult.ok,
          decision:
            aiRiskResult.ok ? aiRiskResult.decision : aiRiskResult.fallback,
          deterministicAction,
        }
      : undefined,
    expiresAt: session.expiresAt,
  });
});

const consumeResult = asyncHandler(async (req, res) => {
  const signature = assertRequiredString("signature", req.body.signature, {
    min: 20,
    max: 2000,
  });
  const payload = verifyToken(signature, { secret: env.tokenSecret });

  const session = await VisualSession.findOne({ sessionToken: payload.sid });
  if (!session) {
    throw new HttpError(404, "Session not found");
  }

  if (
    session.status !== "PASS" ||
    session.verificationSignature !== signature
  ) {
    throw new HttpError(401, "Invalid verification signature for this session");
  }

  if (!session.consumedAt) {
    session.consumedAt = new Date();
    await session.save();
  }

  logEvent({
    action: "CONSUME_RESULT",
    partnerId: payload.partnerId,
    ownerUserId: session.ownerUserId,
    userId: payload.userId,
    sessionToken: session.sessionToken,
    req,
  });

  res.json({
    result: "PASS",
    sessionToken: session.sessionToken,
    partnerId: payload.partnerId,
    userId: payload.userId,
    state: payload.state || "",
    consumedAt: session.consumedAt,
  });
});

const getSessionStatus = asyncHandler(async (req, res) => {
  const sessionToken = assertRequiredString(
    "sessionToken",
    req.params.sessionToken,
    {
      min: 20,
      max: 120,
    },
  );

  const session = await VisualSession.findOne({ sessionToken }).lean();
  if (!session) {
    throw new HttpError(404, "Session not found");
  }

  res.json({
    sessionToken: session.sessionToken,
    partnerId: session.partnerId,
    userId: session.userId,
    status: session.status,
    stage: session.fruitSelectionVerifiedAt ? "COGNITIVE_OR_COMPLETE" : "FRUIT",
    fruitSelectionComplete: Boolean(session.fruitSelectionVerifiedAt),
    attemptCount: session.attemptCount,
    maxAttempts: session.maxAttempts + 1,
    honeypotDetected: session.honeypotDetected,
    expiresAt: session.expiresAt,
    verifiedAt: session.verifiedAt,
    consumedAt: session.consumedAt,
  });
});

const getCatalog = asyncHandler(async (req, res) => {
  const catalogType = normalizeCatalogType(
    req.query.catalogType || CATALOG_TYPE.VEGETABLE,
  );
  const items = await Promise.all(
    getCatalogItemsByType(catalogType).map(async (name) => ({
      name,
      imageUrl: await resolveCatalogImageUrl(name, catalogType),
    })),
  );

  res.json({
    catalogType,
    items,
    vegetables: items.map((item) => item.name),
  });
});

// ─── Partner-redirect enrollment flow ──────────────────────────────────────

const initEnroll = asyncHandler(async (req, res) => {
  const partnerId = normalizeIdentity(
    assertRequiredString("partnerId", req.body.partnerId, { min: 3, max: 80 }),
  );
  const userId = normalizeIdentity(
    assertRequiredString("userId", req.body.userId, { min: 3, max: 120 }),
  );
  const callbackUrl = assertOptionalHttpUrl(
    "callbackUrl",
    req.body.callbackUrl,
  );
  const state = assertOptionalString("state", req.body.state, { max: 200 });

  if (
    callbackUrl &&
    env.nodeEnv === "production" &&
    callbackUrl.startsWith("http://")
  ) {
    throw new HttpError(400, "callbackUrl must use https in production");
  }

  if (!isAllowedCallbackUrl(callbackUrl)) {
    throw new HttpError(403, "callbackUrl origin is not allowed");
  }

  const session = await VisualEnrollSession.createSession({
    partnerId,
    userId,
    callbackUrl: callbackUrl || null,
    partnerState: state || null,
  });

  res.status(201).json({
    enrollToken: session.enrollToken,
    enrollPath: `/enroll/${session.enrollToken}`,
    expiresAt: session.expiresAt,
    partnerId,
    userId,
  });
});

const getEnrollSession = asyncHandler(async (req, res) => {
  const enrollToken = assertRequiredString(
    "enrollToken",
    req.params.enrollToken,
    { min: 8, max: 200 },
  );
  const session = await VisualEnrollSession.findOne({ enrollToken }).lean();

  if (!session) {
    throw new HttpError(404, "Enrollment session not found");
  }

  if (session.expiresAt.getTime() < Date.now()) {
    throw new HttpError(410, "Enrollment session has expired");
  }

  res.json({
    enrollToken: session.enrollToken,
    partnerId: session.partnerId,
    userId: session.userId,
    status: session.status,
    expiresAt: session.expiresAt,
  });
});

const submitEnrollSession = asyncHandler(async (req, res) => {
  const enrollToken = assertRequiredString(
    "enrollToken",
    req.params.enrollToken,
    { min: 8, max: 200 },
  );
  const session = await VisualEnrollSession.findOne({ enrollToken });

  if (!session) {
    throw new HttpError(404, "Enrollment session not found");
  }

  if (session.expiresAt.getTime() < Date.now()) {
    await VisualEnrollSession.updateOne({ enrollToken }, { status: "EXPIRED" });
    throw new HttpError(410, "Enrollment session has expired");
  }

  if (session.status === "COMPLETED") {
    throw new HttpError(409, "Enrollment session already completed");
  }

  const { partnerId, userId } = session;

  const catalogType = normalizeCatalogType(
    req.body.catalogType || CATALOG_TYPE.VEGETABLE,
  );
  const secretVegetables = normalizeSecretVegetableList(
    req.body.secretVegetables,
    catalogType,
  );
  const secretLetters = normalizeSecretLetters(req.body.secretLetters);
  const saltValue = normalizeSaltValue(
    req.body.saltValue,
    env.visualSaltValue || DEFAULT_SALT_VALUE,
  );
  const formulaMode = normalizeFormulaMode(req.body.formulaMode);
  const alphabetMode = normalizeAlphabetMode(req.body.alphabetMode);
  const rawPositionPair =
    req.body.positionPair !== undefined ?
      req.body.positionPair
    : req.body.positionCell;
  const normalizedPositionPair =
    formulaMode === FORMULA_MODE.POSITION_SUM ?
      normalizePositionPair(rawPositionPair)
    : [];
  const positionPair =
    formulaMode === FORMULA_MODE.POSITION_SUM && normalizedPositionPair.length ?
      [normalizedPositionPair[0]]
    : [];

  if (formulaMode === FORMULA_MODE.POSITION_SUM && positionPair.length !== 1) {
    throw new HttpError(
      400,
      "positionPair must contain exactly 1 position for POSITION_SUM mode",
    );
  }

  // Store the credential (any ownerUserId placeholder for partner-initiated enrollment)
  const ownerUserId = `partner:${partnerId}:${userId}`;

  await VisualCredential.findOneAndUpdate(
    { partnerId, userId },
    {
      ownerUserId,
      partnerId,
      userId,
      catalogType,
      secretVegetables,
      pairVegetables: [],
      secretLetters,
      saltValue,
      formulaMode,
      alphabetMode,
      positionPair,
      active: true,
    },
    { upsert: true, returnDocument: "after", setDefaultsOnInsert: true },
  );

  session.status = "COMPLETED";
  await session.save();

  const callbackUrl = session.callbackUrl;
  const partnerState = session.partnerState;

  if (callbackUrl) {
    const redirectUrl = new URL(callbackUrl);
    redirectUrl.searchParams.set("result", "ENROLLED");
    redirectUrl.searchParams.set("enrollToken", enrollToken);
    if (partnerState) {
      redirectUrl.searchParams.set("state", partnerState);
    }
    return res.json({ ok: true, redirectUrl: redirectUrl.toString() });
  }

  return res.json({ ok: true, redirectUrl: null });
});

module.exports = {
  consumeResult,
  enroll,
  getCatalog,
  getChallenge,
  getEnrollmentStatus,
  getEnrollSession,
  getSessionStatus,
  initAuth,
  initEnroll,
  submitEnrollSession,
  verify,
};
