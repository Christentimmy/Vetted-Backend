import { adminController } from "../controllers/admin_controller";
import express from "express";
import tokenValidationMiddleware from "../middlewares/token_validator";
import {
  adminStatusChecker,
  superAdminStatusChecker,
} from "../middlewares/status_middleware";
import { supportTicketController } from "../controllers/support_ticket_controller";

const router = express.Router();

router.post("/login", adminController.loginAdmin);

router.use(tokenValidationMiddleware, adminStatusChecker);
router.get("/dashboard-stats", adminController.getDashboardStats);
router.get("/recent-looks-ups", adminController.recentLooksUps);
router.get("/all-users", adminController.getAllUsers);
router.post("/toggle-ban", adminController.toggleBan);
router.post("/send-message", adminController.sendMessage);
router.get("/subscription-stats", adminController.getSubscriptionStat);
router.get("/all-subscriptions", adminController.getAllSubscriptions);
router.get("/user-invoice-history/:userId", adminController.getUserInvoiceHistory);
router.post("/cancel-subscription", adminController.cancelUserSubscription);
router.get("/get-post-reports", adminController.getReports);
router.post("/delete-post", adminController.deletePost);
router.get("/all-admins", adminController.getAllAdmins);
router.post("/toggle-active", adminController.toggleActive);
router.post("/delete-admin", adminController.deleteAdmin);
router.post("/mark-ticket", supportTicketController.markAsResolved);


router.use(superAdminStatusChecker);
router.post("/create-admin", adminController.createAdmin);

export default router;
