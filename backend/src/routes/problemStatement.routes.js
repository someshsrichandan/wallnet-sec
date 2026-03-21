const router = require('express').Router();
const controller = require('../controllers/problemStatement.controller');
const auth = require('../middlewares/auth');

router.get('/', controller.getCurrent);
router.post('/', auth, controller.createOrUpdate);

module.exports = router;
