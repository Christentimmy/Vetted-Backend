import { adminController } from "../controllers/admin_controller";
import express from "express";
import tokenValidationMiddleware from "../middlewares/token_validator";
import {
  adminStatusChecker,
  superAdminStatusChecker,
} from "../middlewares/status_middleware";

const router = express.Router();

router.post("/login", adminController.loginAdmin);

router.use(tokenValidationMiddleware, adminStatusChecker);
router.get("/dashboard-stats", adminController.getDashboardStats);
router.get("/recent-looks-ups", adminController.recentLooksUps);

router.use(superAdminStatusChecker);
router.post("/create-admin", adminController.createAdmin);

export default router;
