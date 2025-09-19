import { Request, Response } from "express";
import UserModel from "../models/user_model";
import {
  checkNumberValidity,
  sendOtpToUserPhoneNumber,
} from "../services/twilio_service";
import generateToken from "../utils/token_generator";
import { verifyGoogleToken } from "../services/google_token";
import { redisController } from "./redis_controller";

export const authController = {
  loginWithNumber: async (req: Request, res: Response) => {
    try {
      if (!req.body || typeof req.body !== "object") {
        res.status(400).json({ message: "Missing request body" });
        return;
      }
      const { phone } = req.body;
      if (!phone) {
        res.status(400).json({ message: "Phone number is required" });
        return;
      }

      const response = await checkNumberValidity(phone);
      if (response === false) {
        res.status(400).json({ message: "Number is not valid" });
        return;
      }

      const user = await UserModel.findOne({ phone });
      if (!user) {
        res.status(404).json({ message: "Invalid Credentials" });
        return;
      }

      const jwtToken = generateToken(user);

      // Check if user is banned
      if (user.accountStatus === "banned") {
        res.status(403).json({ message: "Account banned" });
        return;
      }

      // Check if user profile is completed
      if (!user.isProfileCompleted) {
        res.status(400).json({ message: "User Not Complete", token: jwtToken });
        return;
      }

      if (!user.isPhoneVerified) {
        res
          .status(400)
          .json({ message: "Phone Not Verified", token: jwtToken });
        return;
      }

      res.status(200).json({
        message: "Login Successful",
        token: jwtToken,
        email: user.email,
      });
    } catch (error) {
      console.log(error);
      return res.status(500).json({ message: "Internal server error" });
    }
  },

  registerWithNumber: async (req: Request, res: Response) => {
    try {
      if (!req.body || typeof req.body !== "object") {
        res.status(400).json({ message: "Missing request body" });
        return;
      }
      const { phone } = req.body;
      if (!phone) {
        res.status(400).json({ message: "Phone number is required" });
        return;
      }

      const response = await checkNumberValidity(phone);
      if (response === false) {
        res.status(400).json({ message: "Number is not valid" });
        return;
      }


      const existingUser = await UserModel.findOne({ phone });
      if (existingUser) {
        res.status(400).json({ message: "User already exists" });
        return;
      }

      const result = await sendOtpToUserPhoneNumber(phone);
      if (!result.success || !result.otp) {
        res.status(500).json({ message: "Failed to send OTP" });
        return;
      }

      await redisController.saveOtpToStore(phone, result.otp.toString());

      const user = new UserModel({
        phone,
        role: "user",
      });

      await user.save();

      const jwtToken = generateToken(user);

      res.status(201).json({
        message: "User registered successfully",
        token: jwtToken,
      });
    } catch (error) {
      console.log(error);
      return res.status(500).json({ message: "Internal server error" });
    }
  },

  googleAuthSignUp: async (req: Request, res: Response) => {
    try {
      if (!req.body || typeof req.body !== "object") {
        res.status(400).json({ message: "Missing request body" });
        return;
      }
      const { token } = req.body;
      if (!token) return res.status(400).json({ message: "Token is required" });

      const googleUser = await verifyGoogleToken(token);

      let exist = await UserModel.findOne({ email: googleUser.email });
      if (exist) {
        res.status(404).json({ message: "User already exists" });
        return;
      }

      const user = new UserModel({
        email: googleUser.email,
        displayName: googleUser.name,
        avatarUrl: googleUser.picture,
        role: "user",
      });
      await user.save();

      const jwtToken = generateToken(user);

      res.status(201).json({
        message: "SignUp successful",
        token: jwtToken,
      });
    } catch (error: any) {
      console.error("Google signup error:", error);
      if (error.message.includes("Invalid Google token")) {
        res.status(400).json({ message: "Invalid Google token" });
      } else {
        res.status(500).json({ message: "Internal server error" });
      }
    }
  },

  googleAuthSignIn: async (req: Request, res: Response) => {
    try {
      if (!req.body || typeof req.body !== "object") {
        res.status(400).json({ message: "Missing request body" });
        return;
      }
      const { token } = req.body;
      if (!token) return res.status(400).json({ message: "Token is required" });

      const googleUser = await verifyGoogleToken(token);

      const user = await UserModel.findOne({ email: googleUser.email }).select(
        "accountStatus"
      );

      if (!user) {
        res.status(404).json({ message: "Invalid Credentials" });
        return;
      }
      // Check if user is banned
      if (user.accountStatus === "banned") {
        res.status(403).json({ message: "Account banned" });
        return;
      }

      // Generate token
      const jwtToken = await generateToken(user);

      // Check if user profile is completed
      if (!user.isProfileCompleted) {
        res.status(400).json({ message: "User Not Complete", token: jwtToken });
        return;
      }

      res.status(200).json({
        message: "Login Successful",
        token: jwtToken,
        email: user.email,
      });
    } catch (error: any) {
      console.error("Google login error:", error);
      if (error.message.includes("Invalid Google token")) {
        res.status(400).json({ message: "Invalid Google token" });
      } else {
        res.status(500).json({ message: "Internal server error" });
      }
    }
  },

  sendNumberOtp: async (req: Request, res: Response) => {
    try {
      if (!req.body || typeof req.body !== "object") {
        res.status(400).json({ message: "Missing request body" });
        return;
      }
      const { phone } = req.body;
      if (!phone) {
        res.status(400).json({ message: "Phone number is required" });
        return;
      }
      const response = await checkNumberValidity(phone);
      if (!response) {
        res.status(400).json({ message: "Number is not valid" });
        return;
      }

      const { success, otp, error } = await sendOtpToUserPhoneNumber(phone);

      if (!success || !otp) {
        res.status(500).json({ message: error });
        return;
      }

      await redisController.saveOtpToStore(phone, otp.toString());

      res.status(200).json({ message: "OTP sent successfully." });
      return;
    } catch (error) {
      console.error("Error in requestOTP controller:", error);
      res
        .status(500)
        .json({ message: "An error occurred while processing your request." });
    }
  },

  verifyNumberOtp: async (req: Request, res: Response) => {
    try {
      if (!req.body || typeof req.body !== "object") {
        res.status(400).json({ message: "Missing request body" });
        return;
      }
      const { phone, otp } = req.body;
      if (!phone || !otp) {
        res.status(400).json({ message: "Phone number and OTP are required" });
        return;
      }
      const response = await checkNumberValidity(phone);
      if (!response) {
        res.status(400).json({ message: "Number is not valid" });
        return;
      }

      const storedOtp = await redisController.getOtpFromStore(phone);
      if (!storedOtp) {
        res.status(400).json({ message: "OTP not found" });
        return;
      }

      if (storedOtp !== otp) {
        res.status(400).json({ message: "Invalid OTP" });
        return;
      }

      await redisController.removeOtp(phone);

      res.status(200).json({ message: "OTP verified successfully." });
      return;
    } catch (error) {
      console.error("Error in requestOTP controller:", error);
      res
        .status(500)
        .json({ message: "An error occurred while processing your request." });
    }
  },
};
