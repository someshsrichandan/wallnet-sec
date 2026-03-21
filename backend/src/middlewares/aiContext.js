const env = require("../config/env");

module.exports = (req, _res, next) => {
  req.ai = {
    enabled: env.aiEnabled,
    provider: env.aiProvider,
    features: {
      fraudShadowMode: env.aiFraudShadowMode,
      fraudEnforcementMode: env.aiFraudEnforcementMode,
      threatSummaryEnabled: env.aiThreatSummaryEnabled,
      partnerAssistantEnabled: env.aiPartnerAssistantEnabled,
    },
  };

  next();
};
