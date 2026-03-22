const router = require("express").Router();
const dashboardController = require("../controllers/dashboard.controller");
const auth = require("../middlewares/auth");

router.use(auth);

router.get("/stats", dashboardController.getDashboardStats);
router.get("/threats", dashboardController.getThreatFeed);
router.get("/timeline", dashboardController.getTimelineData);
router.get("/audit-logs", dashboardController.getAuditLogs);
router.get("/analytics", dashboardController.getSessionAnalytics);
router.get("/users", dashboardController.getTrackedUsers);
router.post(
  "/users/reset-visual-password",
  dashboardController.sendTrackedUserVisualResetEmail,
);

module.exports = router;
