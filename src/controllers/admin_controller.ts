import { Request, Response } from "express";
import UserModel from "../models/user_model";
import SearchLog from "../models/search_model";
import { Post } from "../models/post_model";
import bcryptjs from "bcryptjs";
import generateToken from "../utils/token_generator";
import { sendEmail } from "../services/email_service";

export const adminController = {
  createAdmin: async (req: Request, res: Response) => {
    try {
      if (!req.body) {
        return res.status(400).json({ message: "Invalid request" });
      }
      const { email, password, role = "admin" } = req.body;
      if (!email || !password) {
        return res
          .status(400)
          .json({ message: "Email and password are required" });
      }

      const salt = await bcryptjs.genSalt(10);
      const hashedPassword = await bcryptjs.hash(password, salt);

      const user = await UserModel.create({
        email,
        password: hashedPassword,
        role: "super_admin",
      });

      const jwtToken = generateToken(user);

      res.json({
        message: "Admin created successfully",
        data: user,
        token: jwtToken,
      });
    } catch (error) {
      console.error("Error creating admin:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  },

  loginAdmin: async (req: Request, res: Response) => {
    try {
      if (!req.body) {
        return res.status(400).json({ message: "Invalid request" });
      }
      const { email, password } = req.body;
      if (!email || !password) {
        return res
          .status(400)
          .json({ message: "Email and password are required" });
      }

      const user = await UserModel.findOne({
        email,
        role: { $in: ["admin", "super_admin"] },
      });
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const isPasswordValid = await bcryptjs.compare(password, user.password);
      if (!isPasswordValid) {
        return res.status(401).json({ message: "Invalid password" });
      }

      if (user.accountStatus === "banned") {
        res.status(403).json({ message: "Account banned" });
        return;
      }

      if (user.accountStatus === "suspended") {
        res.status(403).json({ message: "Account suspended" });
        return;
      }

      const jwtToken = generateToken(user);

      res.json({ message: "Admin logged in successfully", token: jwtToken });
    } catch (error) {
      console.error("Error logging in admin:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  },

  getDashboardStats: async (req: Request, res: Response) => {
    try {
      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);

      const endOfToday = new Date();
      endOfToday.setHours(23, 59, 59, 999);

      const [totalUsers, todaySearches, totalPosts, totalActiveSubscriptions] =
        await Promise.all([
          UserModel.countDocuments(),
          SearchLog.countDocuments({
            createdAt: {
              $gte: startOfToday,
              $lte: endOfToday,
            },
          }),
          Post.countDocuments(),
          UserModel.countDocuments({ "subscription.status": "active" }),
        ]);

      res.json({
        message: "Success",
        data: {
          totalUsers,
          todaySearches,
          totalPosts,
          totalActiveSubscriptions,
        },
      });
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  },

  recentLooksUps: async (req: Request, res: Response) => {
    try {
      const recentLooksUps = await SearchLog.find()
        .populate("userId", "email displayName")
        .sort({ createdAt: -1 })
        .limit(10);
      res.json({ message: "Success", data: recentLooksUps });
    } catch (error) {
      console.error("Error fetching recent looks ups:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  },

  getAllUsers: async (req: Request, res: Response) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const skip = (page - 1) * limit;
      const total = await UserModel.countDocuments();
      const users = await UserModel.find()
        .select("-password")
        .skip(skip)
        .limit(limit);
      const mapped = users.map((user) => {
        return {
          displayName: user.displayName,
          email: user.email,
          accountStatus: user.accountStatus,
          createdAt: user.createdAt || new Date(),
          updatedAt: user.updatedAt || new Date(),
          _id: user._id,
        };
      });
      res.json({
        message: "Success",
        data: mapped,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
          hasMore: total > page * limit,
        },
      });
    } catch (error) {
      console.error("Error fetching all users:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  },

  toggleBan: async (req: Request, res: Response) => {
    try {
      if (!req.body) {
        return res.status(400).json({ message: "Invalid request" });
      }
      const { userId } = req.body;
      if (!userId) {
        res.status(400).json({ message: "User ID is required" });
        return;
      }
      const user = await UserModel.findById(userId);
      if (!user) {
        res.status(404).json({ message: "User not found" });
        return;
      }
      user.accountStatus =
        user.accountStatus === "banned" ? "active" : "banned";
      await user.save();
      res.json({ message: "Success", data: user });
    } catch (error) {
      console.error("Error toggling ban:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  },

  sendMessage: async (req: Request, res: Response) => {
    try {
      if (!req.body) {
        return res.status(400).json({ message: "Invalid request" });
      }
      const { email, recipientName, message } = req.body;
      if (!email || !recipientName || !message) {
        res.json({ message: "Email, recipient name and message are required" });
        return;
      }
      const responce = await sendEmail(email, recipientName, message);
      if (!responce.success) {
        res.json({ message: responce.message });
        return;
      }
      res.json({ message: "Message sent successfully" });
    } catch (error) {
      console.error("Error sending message:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  },
};
