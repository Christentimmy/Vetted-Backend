import { Request, Response } from "express";
import UserModel from "../models/user_model";
import {
  checkNumberValidity,
  sendOtpToUserPhoneNumber,
} from "../services/twilio_service";
import generateToken from "../utils/token_generator";
import { verifyGoogleToken } from "../services/google_token";
import { redisController } from "./redis_controller";
import jwt, { JwtPayload } from "jsonwebtoken";
import mongoose from "mongoose";
import config from "../config/config";
import tokenBlacklistSchema from "../models/token_blacklist_model";
import bcryptjs from "bcryptjs";
import { sendEmailOtp } from "../services/email_service";

const token_secret = config.jwt.secret;
const isValidObjectId = mongoose.Types.ObjectId.isValid;
if (!token_secret) {
  throw new Error("TOKEN_SECRET is not defined in the environment variables.");
}
interface DecodedToken extends JwtPayload {
  id: string;
  role: string;
}

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
          .status(405)
          .json({ message: "Phone Not Verified", token: jwtToken, phone });
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
        isEmailVerified: true,
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

      const user = await UserModel.findOne({ email: googleUser.email });

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
      const jwtToken = generateToken(user);

      // Check if user profile is completed
      if (!user.isProfileCompleted) {
        res.status(405).json({ message: "User Not Complete", token: jwtToken });
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

  login: async (req: Request, res: Response) => {
    try {
      if (!req.body || typeof req.body !== "object") {
        res.status(400).json({ message: "Missing request body" });
        return;
      }
      const { email, password } = req.body;
      if (!email || !password) {
        res.status(400).json({ message: "Email and password are required" });
        return;
      }
      const user = await UserModel.findOne({ email }).select("+password");
      if (!user) {
        res.status(404).json({ message: "Invalid Credentials" });
        return;
      }
      const isPasswordValid = await bcryptjs.compare(password, user.password);
      if (!isPasswordValid) {
        res.status(401).json({ message: "Invalid Credentials" });
        return;
      }

      if (user.accountStatus !== "active") {
        res.status(403).json({ message: "Account banned" });
        return;
      }

      const jwtToken = generateToken(user);
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

  register: async (req: Request, res: Response) => {
    try {
      if (!req.body || typeof req.body !== "object") {
        res.status(400).json({ message: "Missing request body" });
        return;
      }
      const { email, password } = req.body;
      if (!email || !password) {
        res.status(400).json({ message: "Email and password are required" });
        return;
      }
      const existingUser = await UserModel.findOne({ email });
      if (existingUser) {
        res.status(400).json({ message: "User already exists" });
        return;
      }

      const salt = await bcryptjs.genSalt(10);
      const hashedPassword = await bcryptjs.hash(password, salt);

      const user = new UserModel({
        email,
        password: hashedPassword,
      });
      await user.save();

      const otp = Math.floor(100000 + Math.random() * 900000);

      await sendEmailOtp(email, otp.toString());
      await redisController.saveOtpToStore(email, otp.toString());

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

  verifyOtp: async (req: Request, res: Response) => {
    try {
      if (!req.body) {
        res.status(400).json({ message: "No data provided" });
        return;
      }
      const { email, otp } = req.body;
      if (!email || !otp) {
        res.status(400).json({ message: "Email and OTP are required" });
        return;
      }
      const storedOtp = await redisController.getOtpFromStore(email);
      if (!storedOtp) {
        res.status(400).json({ message: "Invalid OTP" });
        return;
      }
      if (storedOtp !== otp) {
        res.status(400).json({ message: "Invalid OTP" });
        return;
      }
      await redisController.removeOtp(email);
      const user = await UserModel.findOne({ email });
      if (!user) {
        res.status(400).json({ message: "User not found" });
        return;
      }
      if (!user.isEmailVerified) {
        user.isEmailVerified = true;
        await user.save();
      }

      res.status(200).json({ message: "OTP verified successfully" });
    } catch (error) {
      console.log(error);
      res.status(500).json({ message: "Internal server error" });
    }
  },

  sendOtp: async (req: Request, res: Response) => {
    try {
      if (!req.body) {
        res.status(400).json({ message: "No data provided" });
        return;
      }
      const { email } = req.body;
      if (!email) {
        res.status(400).json({ message: "Email is required" });
        return;
      }
      const user = await UserModel.findOne({ email });
      if (!user) {
        res.status(400).json({ message: "User not found" });
        return;
      }
      const otp = Math.floor(100000 + Math.random() * 900000);

      await redisController.saveOtpToStore(user.email, otp.toString());
      await sendEmailOtp(user.email, otp.toString());

      res.status(200).json({ message: "OTP sent successfully" });
    } catch (error) {
      console.log(error);
      res.status(500).json({ message: "Internal server error" });
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

  validateToken: async (req: Request, res: Response) => {
    try {
      const authHeader = req.header("Authorization");

      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        res.status(401).json({ message: "Access denied. No token provided." });
        return;
      }

      const token = authHeader.split(" ")[1];

      if (!token || token.split(".").length !== 3) {
        res.status(400).json({ message: "Invalid token format." });
        return;
      }

      const decoded = jwt.verify(token, token_secret) as DecodedToken;

      const isBlacklisted = await tokenBlacklistSchema.findOne({ token });
      if (isBlacklisted) {
        res
          .status(401)
          .json({ message: "Token is invalid. Please log in again." });
        return;
      }

      if (decoded.exp && Date.now() >= decoded.exp * 1000) {
        res.status(401).json({ message: "Token has expired." });
        return;
      }

      if (!isValidObjectId(decoded.id)) {
        res.status(400).json({ message: "Invalid user ID" });
        return;
      }

      res.status(200).json({ message: "Token is valid." });
      return;
    } catch (error) {
      console.error("Error in validateToken controller:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  },

  logoutUser: async (req: Request, res: Response) => {
    try {
      const token = req.headers.authorization?.split(" ")[1];
      if (!token) {
        return res.status(401).json({ message: "No token provided" });
      }

      const decoded = jwt.verify(token, token_secret!) as JwtPayload;

      // Optional: ensure token belongs to a valid user
      const user = await UserModel.findById(decoded.id);
      if (!user) {
        res.status(401).json({ message: "Invalid token" });
        return;
      }

      await tokenBlacklistSchema.create({ token, userId: user._id });

      res.status(200).json({ message: "Logout successful" });
    } catch (error) {
      console.error("❌ Error in logout:", error);
      res.status(500).json({ message: "Server error" });
    }
  },
};
