const env = require("../config/env");
const HttpError = require("../utils/httpError");
const { verifyToken } = require("../utils/token");

/**
 * Middleware that verifies the request carries a valid super-admin JWT.
 * The token must contain `role: "superadmin"`.
 */
module.exports = (req, _res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return next(new HttpError(401, "Super admin authorization required"));
  }

  const token = authHeader.slice("Bearer ".length).trim();

  try {
    const payload = verifyToken(token, { secret: env.tokenSecret });

    if (payload.role !== "superadmin" || payload.email !== env.superAdminEmail) {
      return next(new HttpError(403, "Forbidden: Invalid super admin identity"));
    }

    req.auth = payload;
    req.admin = { email: payload.email }; // For logging
    return next();
  } catch (error) {
    return next(error);
  }
};
