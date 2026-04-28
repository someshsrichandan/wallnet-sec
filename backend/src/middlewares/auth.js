const env = require('../config/env');
const HttpError = require('../utils/httpError');
const { verifyToken } = require('../utils/token');
const User = require('../models/user.model');

module.exports = async (req, _res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(new HttpError(401, 'Authorization token is required'));
  }

  const token = authHeader.slice('Bearer '.length).trim();

  try {
    const payload = verifyToken(token, { secret: env.tokenSecret });
    
    // Security Check: Verify user status in DB for real-time deactivation/suspension
    const user = await User.findById(payload.sub).select('status trialExpiresAt');
    if (!user) {
      return next(new HttpError(403, 'User account not found'));
    }

    if (user.status === 'inactive' || user.status === 'suspended') {
      return next(new HttpError(403, `Your account has been ${user.status}. Please contact support.`));
    }

    if (user.status === 'trial' && user.trialExpiresAt && new Date(user.trialExpiresAt) <= new Date()) {
      return next(new HttpError(403, 'Your trial period has expired. Please upgrade to continue.'));
    }

    req.auth = payload;
    req.user = user;
    return next();
  } catch (error) {
    return next(error);
  }
};
