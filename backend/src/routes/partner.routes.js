const router = require("express").Router();
const partnerController = require("../controllers/partner.controller");
const auth = require("../middlewares/auth");

router.use(auth);

router.get("/keys", partnerController.listKeys);
router.post("/keys", partnerController.generateKey);
router.put("/keys/:keyId", partnerController.updateKey);
router.post("/keys/:keyId/rotate", partnerController.rotateKey);
router.delete("/keys/:keyId", partnerController.revokeKey);
router.get("/keys/:keyId/usage", partnerController.getKeyUsage);

module.exports = router;
