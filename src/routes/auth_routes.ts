

import express from "express";
import { authController } from "../controllers/auth_controller";

const router = express.Router();

router.post("/login-with-phoneNumber", authController.loginWithNumber);
router.post("/register-with-phoneNumber", authController.registerWithNumber);
router.post("/google-sign-up", authController.googleAuthSignUp);
router.post("/google-login", authController.googleAuthSignIn);
router.post("/logout", authController.logoutUser);

router.post("/send-otp", authController.sendOtp);
router.post("/verify-otp", authController.verifyOtp);
router.post("/login", authController.login);
router.post("/register", authController.register);
router.post("/reset-password", authController.resetPassword);

router.post("/send-number-otp", authController.sendNumberOtp);
router.post("/verify-number-otp", authController.verifyNumberOtp);
router.post("/validate-token", authController.validateToken);

export default router;
