const { createHmac, timingSafeEqual } = require('crypto');
const HttpError = require('./httpError');

const encodeBase64Url = (value) =>
  Buffer.from(value).toString('base64url');

const decodeBase64Url = (value) =>
  Buffer.from(value, 'base64url').toString();

const signToken = (payload, options = {}) => {
  const { secret, expiresInSec = 3600 } = options;
  if (!secret) {
    throw new Error('Token secret is missing');
  }

  const now = Math.floor(Date.now() / 1000);
  const fullPayload = {
    ...payload,
    iat: now,
    exp: now + expiresInSec,
  };

  const encodedPayload = encodeBase64Url(JSON.stringify(fullPayload));
  const signature = createHmac('sha256', secret).update(encodedPayload).digest('base64url');

  return `${encodedPayload}.${signature}`;
};

const verifyToken = (token, options = {}) => {
  const { secret } = options;
  if (!secret) {
    throw new Error('Token secret is missing');
  }

  if (typeof token !== 'string' || !token.includes('.')) {
    throw new HttpError(401, 'Invalid token');
  }

  const [encodedPayload, signature] = token.split('.');
  const expectedSignature = createHmac('sha256', secret)
    .update(encodedPayload)
    .digest('base64url');

  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSignature);
  if (
    signatureBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(signatureBuffer, expectedBuffer)
  ) {
    throw new HttpError(401, 'Invalid token signature');
  }

  let payload;
  try {
    payload = JSON.parse(decodeBase64Url(encodedPayload));
  } catch (_error) {
    throw new HttpError(401, 'Invalid token payload');
  }

  const now = Math.floor(Date.now() / 1000);
  if (typeof payload.exp !== 'number' || payload.exp < now) {
    throw new HttpError(401, 'Token expired');
  }

  return payload;
};

module.exports = { signToken, verifyToken };
