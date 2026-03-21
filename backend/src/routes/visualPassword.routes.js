const router = require('express').Router();
const controller = require('../controllers/visualPassword.controller');
const auth = require('../middlewares/auth');
const partnerApiKey = require('../middlewares/partnerApiKey');

router.get('/catalog', controller.getCatalog);
router.post('/enroll', auth, controller.enroll);
router.get('/enroll/:partnerId/:userId', auth, controller.getEnrollmentStatus);

// Partner-redirect enrollment flow (no end-user auth required; enrollToken is the secret)
router.post('/v1/partner/init-enroll', partnerApiKey, controller.initEnroll);
router.get('/v1/enroll-session/:enrollToken', controller.getEnrollSession);
router.post('/v1/enroll-session/:enrollToken/submit', controller.submitEnrollSession);

router.post('/v1/init-auth', partnerApiKey, controller.initAuth);
router.get('/v1/challenge/:sessionToken', controller.getChallenge);
router.post('/v1/verify', controller.verify);
router.post('/v1/partner/consume-result', partnerApiKey, controller.consumeResult);
router.get('/v1/session/:sessionToken', partnerApiKey, controller.getSessionStatus);

module.exports = router;
