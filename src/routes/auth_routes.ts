

import express from "express";
import { authController } from "../controllers/auth_controller";

const router = express.Router();

router.post("/login-with-phoneNumber", authController.loginWithNumber);
router.post("/register-with-phoneNumber", authController.registerWithNumber);
router.post("/google-sign-up", authController.googleAuthSignUp);
router.post("/google-login", authController.googleAuthSignIn);

export default router;
