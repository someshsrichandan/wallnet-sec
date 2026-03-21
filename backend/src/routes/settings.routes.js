const router = require("express").Router();
const auth = require("../middlewares/auth");
const partnerApiKey = require("../middlewares/partnerApiKey");
const controller = require("../controllers/settings.controller");

router.get("/email", auth, controller.getEmailSettings);
router.put("/email", auth, controller.upsertEmailSettings);
router.get("/email/public", partnerApiKey, controller.getEmailSettingsForPartner);

router.get("/ai-agent", auth, controller.getAiAgentSettings);
router.put("/ai-agent", auth, controller.upsertAiAgentSettings);
router.get(
	"/ai-agent/public",
	partnerApiKey,
	controller.getAiAgentSettingsForPartner,
);

module.exports = router;
