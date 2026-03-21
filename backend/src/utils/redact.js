const SENSITIVE_KEY_PATTERN =
  /(token|secret|password|api[-_]?key|signature|authorization|cookie|session)/i;
const EMAIL_PATTERN =
  /([a-zA-Z0-9._%+-]{2})[a-zA-Z0-9._%+-]*@([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g;

const MAX_STRING_LENGTH = 2000;

const maskString = (value) => {
  const str = String(value || "");
  if (!str) return str;
  if (str.length <= 6) return "***";
  return `${str.slice(0, 2)}***${str.slice(-2)}`;
};

const redactString = (value) => {
  const normalized = String(value || "").slice(0, MAX_STRING_LENGTH);
  return normalized.replace(EMAIL_PATTERN, "$1***@$2");
};

const redactSensitiveObject = (input, depth = 0) => {
  if (depth > 5) {
    return "[REDACTED_DEPTH_LIMIT]";
  }

  if (input === null || input === undefined) {
    return input;
  }

  if (Array.isArray(input)) {
    return input
      .slice(0, 50)
      .map((item) => redactSensitiveObject(item, depth + 1));
  }

  if (typeof input === "object") {
    const result = {};
    for (const [key, value] of Object.entries(input)) {
      if (SENSITIVE_KEY_PATTERN.test(key)) {
        result[key] =
          typeof value === "string" ? maskString(value) : "[REDACTED]";
      } else {
        result[key] = redactSensitiveObject(value, depth + 1);
      }
    }
    return result;
  }

  if (typeof input === "string") {
    return redactString(input);
  }

  return input;
};

module.exports = {
  redactSensitiveObject,
};
