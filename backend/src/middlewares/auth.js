const env = require('../config/env');
const HttpError = require('../utils/httpError');
const { verifyToken } = require('../utils/token');

module.exports = (req, _res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(new HttpError(401, 'Authorization token is required'));
  }

  const token = authHeader.slice('Bearer '.length).trim();

  try {
    const payload = verifyToken(token, { secret: env.tokenSecret });
    req.auth = payload;
    return next();
  } catch (error) {
    return next(error);
  }
};
