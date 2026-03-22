const env = require("../config/env");
const { redactSensitiveObject } = require("../utils/redact");

let geminiClient = null;

const DEFAULT_GEMINI_FALLBACK_MODELS = ["gemini-2.0-flash", "gemini-2.0-flash-lite"];

const extractJsonObject = (text) => {
  const trimmed = String(text || "").trim();
  if (!trimmed) {
    throw new Error("Empty LLM response");
  }

  try {
    return JSON.parse(trimmed);
  } catch {
    const first = trimmed.indexOf("{");
    const last = trimmed.lastIndexOf("}");
    if (first >= 0 && last > first) {
      return JSON.parse(trimmed.slice(first, last + 1));
    }
    throw new Error("LLM response was not valid JSON");
  }
};

const validateRiskResponse = (value) => {
  const riskScore = Number(value?.riskScore);
  const confidence = Number(value?.confidence);
  const action = String(value?.action || "").toUpperCase();
  const reasons =
    Array.isArray(value?.reasons) ?
      value.reasons.slice(0, 8).map((item) => String(item).slice(0, 200))
    : [];
  const flags =
    Array.isArray(value?.flags) ?
      value.flags.slice(0, 12).map((item) => String(item).slice(0, 120))
    : [];

  if (!Number.isFinite(riskScore) || riskScore < 0 || riskScore > 100) {
    throw new Error("Invalid riskScore in LLM response");
  }

  if (!Number.isFinite(confidence) || confidence < 0 || confidence > 1) {
    throw new Error("Invalid confidence in LLM response");
  }

  if (!["ALLOW", "CHALLENGE", "BLOCK", "REVIEW"].includes(action)) {
    throw new Error("Invalid action in LLM response");
  }

  return {
    riskScore: Math.round(riskScore),
    confidence: Math.round(confidence * 1000) / 1000,
    action,
    reasons,
    flags,
  };
};

const requestOpenAiJson = async ({
  systemPrompt,
  userPrompt,
  model,
  timeoutMs = env.aiTimeoutMs,
}) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(
      `${env.aiBaseUrl.replace(/\/$/, "")}/chat/completions`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${env.aiApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          temperature: 0.1,
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
        }),
        signal: controller.signal,
      },
    );

    if (!response.ok) {
      const body = await response.text();
      throw new Error(
        `LLM provider error ${response.status}: ${body.slice(0, 300)}`,
      );
    }

    const payload = await response.json();
    return String(payload?.choices?.[0]?.message?.content || "");
  } finally {
    clearTimeout(timer);
  }
};

const getGeminiClient = () => {
  if (geminiClient) {
    return geminiClient;
  }

  // Loaded lazily so projects that only use OpenAI do not require Gemini SDK at runtime.
  // eslint-disable-next-line global-require
  const { GoogleGenAI } = require("@google/genai");
  geminiClient = new GoogleGenAI({ apiKey: env.aiApiKey });
  return geminiClient;
};

const extractGeminiText = (response) => {
  if (!response) {
    return "";
  }

  if (typeof response.text === "function") {
    const value = response.text();
    return typeof value === "string" ? value : "";
  }

  if (typeof response.text === "string") {
    return response.text;
  }

  const candidate = response.candidates?.[0];
  const parts = candidate?.content?.parts;
  if (Array.isArray(parts)) {
    return parts
      .map((part) => String(part?.text || ""))
      .join("\n")
      .trim();
  }

  return "";
};

const requestGeminiJson = async ({
  systemPrompt,
  userPrompt,
  model,
  timeoutMs = env.aiTimeoutMs,
}) => {
  const client = getGeminiClient();

  let timeoutHandle = null;
  const timeoutPromise = new Promise((_, reject) => {
    timeoutHandle = setTimeout(
      () => reject(new Error("Gemini request timed out")),
      timeoutMs,
    );
  });

  const requestPromise = client.models.generateContent({
    model,
    contents: userPrompt,
    config: {
      systemInstruction: systemPrompt,
      responseMimeType: "application/json",
      temperature: 0.1,
    },
  });

  try {
    const response = await Promise.race([requestPromise, timeoutPromise]);
    return extractGeminiText(response);
  } finally {
    if (timeoutHandle) {
      clearTimeout(timeoutHandle);
    }
  }
};

const callJsonModel = async ({ systemPrompt, userPrompt }) => {
  if (!env.aiEnabled) {
    return {
      ok: false,
      skipped: true,
      attempts: 0,
      error: "AI is disabled",
    };
  }

  let attempt = 0;
  let lastError = null;
  let lastModel = env.aiModel;
  const maxAttempts = Math.max(1, env.aiMaxRetries + 1);

  const fallbackModels = Array.from(
    new Set(
      (env.aiModelFallbacks || [])
        .map((item) => String(item || "").trim())
        .filter(Boolean),
    ),
  );

  const modelCandidates = Array.from(
    new Set([
      String(env.aiModel || "").trim(),
      ...fallbackModels,
      ...(env.aiProvider === "gemini" ? DEFAULT_GEMINI_FALLBACK_MODELS : []),
    ].filter(Boolean)),
  );

  const normalizeProviderError = (error) => {
    const rawMessage = String(error?.message || error || "Unknown LLM error");
    const compact = rawMessage.replace(/\s+/g, " ").trim();

    if (
      /resource_exhausted|quota exceeded|rate[- ]?limit|too many requests|\b429\b/i.test(
        compact,
      )
    ) {
      return "AI provider quota/rate limit reached for configured model";
    }

    if (/timed out|abort/i.test(compact)) {
      return "AI provider request timed out";
    }

    return compact.slice(0, 220);
  };

  while (attempt < maxAttempts) {
    attempt += 1;

    for (const model of modelCandidates) {
      lastModel = model;

      try {
        const content =
          env.aiProvider === "openai" ?
            await requestOpenAiJson({ systemPrompt, userPrompt, model })
          : env.aiProvider === "gemini" ?
            await requestGeminiJson({ systemPrompt, userPrompt, model })
          : (() => {
              throw new Error(`Unsupported AI provider: ${env.aiProvider}`);
            })();

        return {
          ok: true,
          raw: extractJsonObject(content),
          attempts: attempt,
          model,
        };
      } catch (error) {
        lastError = error;
      }
    }
  }

  return {
    ok: false,
    skipped: false,
    attempts: maxAttempts,
    model: lastModel,
    error: normalizeProviderError(lastError),
  };
};

const evaluateFraudRisk = async ({ signals, context }) => {
  const redactedSignals = redactSensitiveObject(signals || {});
  const redactedContext = redactSensitiveObject(context || {});

  const systemPrompt = [
    "You are a security risk scoring assistant for authentication sessions.",
    "Output strict JSON only with fields:",
    "riskScore (0-100 number), action (ALLOW|CHALLENGE|BLOCK|REVIEW), confidence (0-1), reasons (string[]), flags (string[]).",
    "Do not include markdown, explanations, or extra fields.",
  ].join(" ");

  const userPrompt = JSON.stringify({
    task: "Assess authentication risk from telemetry and return policy recommendation.",
    promptVersion: "fraud-risk-v1",
    signals: redactedSignals,
    context: redactedContext,
  });

  const startedAt = Date.now();
  const result = await callJsonModel({ systemPrompt, userPrompt });
  const latencyMs = Date.now() - startedAt;

  if (!result.ok) {
    return {
      ok: false,
      latencyMs,
      provider: env.aiProvider,
      model: result.model || env.aiModel,
      attempts: result.attempts || 0,
      skipped: Boolean(result.skipped),
      fallback: {
        riskScore: 50,
        action: "REVIEW",
        confidence: 0,
        reasons: ["AI unavailable, fallback used"],
        flags: ["AI_FALLBACK"],
      },
      error: result.error,
      promptVersion: "fraud-risk-v1",
    };
  }

  const validated = validateRiskResponse(result.raw);
  return {
    ok: true,
    latencyMs,
    provider: env.aiProvider,
    model: result.model || env.aiModel,
    attempts: result.attempts || 1,
    skipped: false,
    promptVersion: "fraud-risk-v1",
    decision: validated,
  };
};

module.exports = {
  callJsonModel,
  evaluateFraudRisk,
};
