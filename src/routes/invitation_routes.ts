
import express from "express";
import { invitationController } from "../controllers/invitation_controller";
import tokenValidationMiddleware from "../middlewares/token_validator";
import { statusChecker } from "../middlewares/status_middleware";

const router = express.Router();

router.use(tokenValidationMiddleware, statusChecker);

router.get("/my-code", invitationController.getMyInviteCode);
router.post("/redeem", invitationController.redeemInviteCode);
router.get("/stats", invitationController.getInviteStats);
router.get("/premium-status", invitationController.getPremiumStatus);

export default router;