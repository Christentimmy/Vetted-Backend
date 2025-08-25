import { Request, Response } from "express";
import UserModel from "../models/user_model";
import { checkNumberValidity } from "../services/twilio_service";
import generateToken from "../utils/token_generator";
import { verifyGoogleToken } from "../services/google_token";

export const authController = {
  loginWithNumber: async (req: Request, res: Response) => {
    try {
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

      const jwtToken = await generateToken(user);

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

      const user = new UserModel({
        phone,
        role: "user",
      });

      await user.save();

      const jwtToken = generateToken(user);

      res.status(201).json({
        message: "User registered successfully",
        token: jwtToken,
        email: user.email,
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

      const jwtToken = await generateToken(user);

      res.status(201).json({
        message: "SignUp successful",
        token: jwtToken,
      });
    } catch (error) {
      console.error("Google signup error:", error);
      res.status(500).json({ message: "Internal server error" });
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
    } catch (error) {
      console.error("Google login error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  },
};
