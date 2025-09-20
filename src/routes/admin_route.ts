

import { adminController } from "../controllers/admin_controller";
import express from "express";
import tokenValidationMiddleware from "../middlewares/token_validator";
import { adminStatusChecker } from "../middlewares/status_middleware";

const router = express.Router();

router.post("/create-admin", adminController.createAdmin);

router.use(tokenValidationMiddleware, adminStatusChecker);

router.get("/dashboard-stats", adminController.getDashboardStats);

export default router;
