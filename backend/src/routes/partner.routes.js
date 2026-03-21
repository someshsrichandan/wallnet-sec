const router = require("express").Router();
const partnerController = require("../controllers/partner.controller");
const auth = require("../middlewares/auth");
const partnerApiKey = require("../middlewares/partnerApiKey");

// ── Key management (requires user auth — dashboard) ─────────────────────────
router.get("/keys", auth, partnerController.listKeys);
router.post("/keys", auth, partnerController.generateKey);
router.put("/keys/:keyId", auth, partnerController.updateKey);
router.post("/keys/:keyId/rotate", auth, partnerController.rotateKey);
router.delete("/keys/:keyId", auth, partnerController.revokeKey);
router.get("/keys/:keyId/usage", auth, partnerController.getKeyUsage);

// ── Credential test (requires partner API key — used by integrators) ────────
router.get("/test-credentials", partnerApiKey, partnerController.testCredentials);

module.exports = router;
