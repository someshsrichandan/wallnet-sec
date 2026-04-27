const router = require("express").Router();
const superAdminController = require("../controllers/superAdmin.controller");
const superAdminAuth = require("../middlewares/superAdminAuth");

// ── Public: Super Admin Login ───────────────────────────────────────────────
router.post("/login", superAdminController.login);

// ── Protected: All below require super admin auth ───────────────────────────
router.use(superAdminAuth);

// Dashboard overview
router.get("/dashboard", superAdminController.getDashboardOverview);

// Partner/User management
router.get("/partners", superAdminController.listPartners);
router.get("/partners/:userId", superAdminController.getPartnerDetail);
router.post("/partners/:userId/activate", superAdminController.activatePartner);
router.post("/partners/:userId/deactivate", superAdminController.deactivatePartner);
router.post("/partners/:userId/suspend", superAdminController.suspendPartner);
router.post("/partners/:userId/extend-trial", superAdminController.extendTrial);
router.put("/partners/:userId/account", superAdminController.updatePartnerAccount);
router.post("/partners/:userId/email", superAdminController.sendPartnerEmail);
router.post("/settings/test-email", superAdminController.sendTestEmail);

// API Key approval
router.get("/api-keys", superAdminController.listAllApiKeys);
router.post("/api-keys/:keyId/approve", superAdminController.approveApiKey);
router.post("/api-keys/:keyId/reject", superAdminController.rejectApiKey);

// Analytics
router.get("/analytics", superAdminController.getApiAnalytics);

// Audit logs
router.get("/audit-logs", superAdminController.getAdminAuditLogs);

// Settings
router.get("/settings", superAdminController.getSettings);
router.put("/settings", superAdminController.updateSettings);

module.exports = router;
