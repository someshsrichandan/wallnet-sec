const router = require("express").Router();
const userRoutes = require("./user.routes");
const problemStatementRoutes = require("./problemStatement.routes");
const submissionRoutes = require("./submission.routes");
const visualPasswordRoutes = require("./visualPassword.routes");
const dashboardRoutes = require("./dashboard.routes");
const partnerRoutes = require("./partner.routes");
const settingsRoutes = require("./settings.routes");
const superAdminRoutes = require("./superAdmin.routes");

router.use("/users", userRoutes);
router.use("/problem-statement", problemStatementRoutes);
router.use("/submissions", submissionRoutes);
router.use("/visual-password", visualPasswordRoutes);
router.use("/dashboard", dashboardRoutes);
router.use("/partners", partnerRoutes);
router.use("/settings", settingsRoutes);
router.use("/super-admin", superAdminRoutes);

module.exports = router;
