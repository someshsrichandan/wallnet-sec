const HttpError = require('./httpError');

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const assertRequiredString = (name, value, options = {}) => {
  const { min = 1, max = 500 } = options;

  if (typeof value !== 'string') {
    throw new HttpError(400, `${name} must be a string`);
  }

  const trimmed = value.trim();
  if (!trimmed) {
    throw new HttpError(400, `${name} is required`);
  }

  if (trimmed.length < min || trimmed.length > max) {
    throw new HttpError(400, `${name} must be between ${min} and ${max} characters`);
  }

  return trimmed;
};

const assertOptionalString = (name, value, options = {}) => {
  if (value === undefined || value === null || value === '') {
    return '';
  }

  return assertRequiredString(name, value, options);
};

const assertOptionalHttpUrl = (name, value, options = {}) => {
  const { max = 2000 } = options;
  const urlString = assertOptionalString(name, value, { min: 8, max });

  if (!urlString) {
    return '';
  }

  let url;
  try {
    url = new URL(urlString);
  } catch (_error) {
    throw new HttpError(400, `${name} must be a valid URL`);
  }

  if (!['http:', 'https:'].includes(url.protocol)) {
    throw new HttpError(400, `${name} must start with http:// or https://`);
  }

  return url.toString();
};

const assertEmail = (value, name = 'email') => {
  const email = assertRequiredString(name, value, { min: 6, max: 254 }).toLowerCase();

  if (!EMAIL_REGEX.test(email)) {
    throw new HttpError(400, `${name} is not valid`);
  }

  return email;
};

const assertBoolean = (name, value, fallback = false) => {
  if (value === undefined || value === null) {
    return fallback;
  }

  if (typeof value === 'boolean') {
    return value;
  }

  if (value === 'true' || value === '1') {
    return true;
  }

  if (value === 'false' || value === '0') {
    return false;
  }

  throw new HttpError(400, `${name} must be a boolean`);
};

const assertStringArray = (name, value, options = {}) => {
  const { minItems = 0, maxItems = 20, itemMin = 1, itemMax = 200 } = options;

  if (!Array.isArray(value)) {
    throw new HttpError(400, `${name} must be an array`);
  }

  if (value.length < minItems || value.length > maxItems) {
    throw new HttpError(400, `${name} must contain between ${minItems} and ${maxItems} items`);
  }

  return value.map((item, index) =>
    assertRequiredString(`${name}[${index}]`, item, { min: itemMin, max: itemMax })
  );
};

const assertInteger = (name, value, options = {}) => {
  const { min = Number.MIN_SAFE_INTEGER, max = Number.MAX_SAFE_INTEGER } = options;
  const number = Number(value);

  if (!Number.isInteger(number)) {
    throw new HttpError(400, `${name} must be an integer`);
  }

  if (number < min || number > max) {
    throw new HttpError(400, `${name} must be between ${min} and ${max}`);
  }

  return number;
};

const parsePagination = (query = {}, options = {}) => {
  const { defaultPage = 1, defaultLimit = 20, maxLimit = 100 } = options;
  const page = query.page ? assertInteger('page', query.page, { min: 1 }) : defaultPage;
  const limit = query.limit
    ? assertInteger('limit', query.limit, { min: 1, max: maxLimit })
    : defaultLimit;

  return { page, limit, skip: (page - 1) * limit };
};

module.exports = {
  assertBoolean,
  assertEmail,
  assertInteger,
  assertOptionalHttpUrl,
  assertOptionalString,
  assertRequiredString,
  assertStringArray,
  parsePagination,
};
