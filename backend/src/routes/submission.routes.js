const router = require('express').Router();
const controller = require('../controllers/submission.controller');
const auth = require('../middlewares/auth');

router.get('/', auth, controller.list);
router.post('/', controller.create);

module.exports = router;
