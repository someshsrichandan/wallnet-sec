const { randomBytes, scrypt, timingSafeEqual } = require('crypto');
const { promisify } = require('util');

const scryptAsync = promisify(scrypt);

const hashPassword = async (password) => {
  const salt = randomBytes(16).toString('hex');
  const derivedKey = await scryptAsync(password, salt, 64);

  return `${salt}:${Buffer.from(derivedKey).toString('hex')}`;
};

const verifyPassword = async (password, storedHash) => {
  if (!storedHash || !storedHash.includes(':')) {
    return false;
  }

  const [salt, keyHex] = storedHash.split(':');
  const derivedKey = await scryptAsync(password, salt, 64);
  const storedKey = Buffer.from(keyHex, 'hex');
  const incomingKey = Buffer.from(derivedKey);

  if (storedKey.length !== incomingKey.length) {
    return false;
  }

  return timingSafeEqual(storedKey, incomingKey);
};

module.exports = { hashPassword, verifyPassword };
