const router = require('express').Router();
const userController = require('../controllers/user.controller');
const auth = require('../middlewares/auth');

router.post('/', userController.create);
router.post('/signup', userController.create);
router.post('/login', userController.login);
router.get('/me', auth, userController.me);
router.get('/', auth, userController.list);

module.exports = router;
