const DEFAULT_VISUAL_SESSION_TTL_MS = 5 * 60 * 1000;
const DEFAULT_VISUAL_MAX_ATTEMPTS = 3;
const DEFAULT_VISUAL_SALT = 5;
const DEFAULT_VISUAL_GRID_SIZE = 10;
const DEFAULT_TOKEN_SECRET = 'change-this-token-secret-in-production';
const DEFAULT_PARTNER_API_KEY = 'dev-partner-key-change-me';

const toPositiveInteger = (value, fallback) => {
  const parsed = Number.parseInt(String(value ?? ''), 10);

  if (Number.isNaN(parsed) || parsed <= 0) {
    return fallback;
  }

  return parsed;
};

const toOrigins = (value) => {
  if (!value) {
    return ['*'];
  }

  return String(value)
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
};

const toList = (value) => {
  if (!value) {
    return [];
  }

  return String(value)
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
};

const toTrustProxy = (value) => {
  if (value === undefined || value === null || String(value).trim() === '') {
    return 1;
  }

  const normalized = String(value).trim().toLowerCase();
  if (normalized === 'false' || normalized === '0') {
    return false;
  }
  if (normalized === 'true') {
    return true;
  }

  const asNumber = Number.parseInt(normalized, 10);
  if (Number.isInteger(asNumber) && asNumber >= 0) {
    return asNumber;
  }

  return value;
};

const parsePartnerApiKeys = (value, options = {}) => {
  const { allowDevFallback = true } = options;
  const items = toList(value);
  const byPartner = new Map();

  for (const item of items) {
    const [partnerIdRaw, apiKeyRaw] = item.includes(':') ? item.split(':', 2) : ['*', item];
    const partnerId = String(partnerIdRaw || '*')
      .trim()
      .toLowerCase();
    const apiKey = String(apiKeyRaw || '').trim();

    if (!apiKey) {
      continue;
    }

    const existing = byPartner.get(partnerId) || new Set();
    existing.add(apiKey);
    byPartner.set(partnerId, existing);
  }

  if (!byPartner.size && allowDevFallback) {
    byPartner.set('*', new Set([DEFAULT_PARTNER_API_KEY]));
  }

  return byPartner;
};

const hasApiKey = (partnerApiKeys, value) => {
  for (const keys of partnerApiKeys.values()) {
    if (keys.has(value)) {
      return true;
    }
  }
  return false;
};

const toHttpsOnlyOrigins = (origins = []) =>
  origins.filter((origin) => String(origin || '').toLowerCase().startsWith('https://'));

const nodeEnv = process.env.NODE_ENV || 'development';
const isProduction = nodeEnv === 'production';

const env = {
  nodeEnv,
  isProduction,
  port: toPositiveInteger(process.env.PORT, 3000),
  mongodbUri: process.env.MONGODB_URI || '',
  corsOrigins: toOrigins(process.env.CORS_ORIGIN),
  trustProxy: toTrustProxy(process.env.TRUST_PROXY),
  jsonLimit: process.env.JSON_LIMIT || '10mb',
  visualSessionTtlMs: toPositiveInteger(
    process.env.VISUAL_SESSION_TTL_MS,
    DEFAULT_VISUAL_SESSION_TTL_MS
  ),
  visualMaxAttempts: toPositiveInteger(
    process.env.VISUAL_MAX_ATTEMPTS,
    DEFAULT_VISUAL_MAX_ATTEMPTS
  ),
  visualSaltValue: toPositiveInteger(process.env.VISUAL_SALT_VALUE, DEFAULT_VISUAL_SALT),
  visualAlphabetGridSize: toPositiveInteger(
    process.env.VISUAL_ALPHABET_GRID_SIZE,
    DEFAULT_VISUAL_GRID_SIZE
  ),
  partnerCallbackAllowlist: toList(process.env.PARTNER_CALLBACK_ALLOWLIST).map((origin) =>
    origin.toLowerCase()
  ),
  partnerApiKeys: parsePartnerApiKeys(process.env.PARTNER_API_KEYS, {
    allowDevFallback: !isProduction,
  }),
  tokenSecret: process.env.TOKEN_SECRET || DEFAULT_TOKEN_SECRET,
};

const validateEnv = () => {
  const errors = [];

  if (env.isProduction) {
    if (env.tokenSecret === DEFAULT_TOKEN_SECRET || env.tokenSecret.length < 32) {
      errors.push(
        'TOKEN_SECRET must be set to a random value of at least 32 characters in production'
      );
    }

    if (!env.partnerApiKeys.size) {
      errors.push('PARTNER_API_KEYS must be configured in production');
    }

    if (hasApiKey(env.partnerApiKeys, DEFAULT_PARTNER_API_KEY)) {
      errors.push(
        'PARTNER_API_KEYS contains insecure default key. Replace dev-partner-key-change-me in production'
      );
    }

    if (env.corsOrigins.includes('*')) {
      errors.push('CORS_ORIGIN cannot include "*" in production');
    }

    if (!env.partnerCallbackAllowlist.length) {
      errors.push('PARTNER_CALLBACK_ALLOWLIST must be configured in production');
    }

    if (
      env.partnerCallbackAllowlist.length &&
      toHttpsOnlyOrigins(env.partnerCallbackAllowlist).length !== env.partnerCallbackAllowlist.length
    ) {
      errors.push('PARTNER_CALLBACK_ALLOWLIST must contain only https origins in production');
    }
  }

  if (errors.length) {
    throw new Error(`Invalid environment configuration:\n- ${errors.join('\n- ')}`);
  }
};

validateEnv();

module.exports = env;
