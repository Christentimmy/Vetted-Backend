import { Request, Response } from "express";
import UserModel from "../models/user_model";
import SearchLog from "../models/search_model";
import { Post } from "../models/post_model";
import bcryptjs from "bcryptjs";
import generateToken from "../utils/token_generator";
import { sendEmail } from "../services/email_service";
import {
  getSubscription,
  cancelSubscription,
} from "../services/stripe_service";
import subscriptionModel from "../models/subscription_model";
import { IUser } from "../types/user_type";
import { getUserStripeInvoiceHistory } from "../services/stripe_service";
import GenderApplicationModel from "../models/gender_model_application";
import { sendPushNotification } from "../config/onesignal";
import { NotificationType } from "../config/onesignal";

export const adminController = {
  //Auth
  createAdmin: async (req: Request, res: Response) => {
    try {
      if (!req.body) {
        return res.status(400).json({ message: "Invalid request" });
      }
      const { email, password, role = "admin", username } = req.body;
      if (!email || !password || !username) {
        return res.status(400).json({
          message: "Email, password and username name are required",
        });
      }

      const salt = await bcryptjs.genSalt(10);
      const hashedPassword = await bcryptjs.hash(password, salt);

      const user = await UserModel.create({
        email,
        password: hashedPassword,
        role,
        displayName: username,
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

  getAllAdmins: async (req: Request, res: Response) => {
    try {
      const admins = await UserModel.find({
        role: { $ne: "user" },
        isDeleted: false,
      });

      const mappedResponse = admins.map((admin) => {
        return {
          username: admin.displayName,
          email: admin.email,
          role: admin.role,
          accountStatus: admin.accountStatus,
          createdAt: admin.createdAt || new Date(),
          updatedAt: admin.updatedAt || new Date(),
          _id: admin._id,
        };
      });
      res.json({ message: "Success", data: mappedResponse });
    } catch (error) {
      console.error("Error fetching all admins:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  },

  toggleActive: async (req: Request, res: Response) => {
    try {
      const { userId } = req.body;
      if (!userId) {
        return res.status(400).json({ message: "User ID is required" });
      }
      const user = await UserModel.findById(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      if (user.accountStatus === "active") {
        user.accountStatus = "suspended";
      } else {
        user.accountStatus = "active";
      }
      await user.save();
      res.json({ message: "Success" });
    } catch (error) {
      console.error("Error deactivating admin:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  },

  deleteAdmin: async (req: Request, res: Response) => {
    try {
      const { userId } = req.body;
      if (!userId) {
        return res.status(400).json({ message: "User ID is required" });
      }
      const user = await UserModel.findById(userId);
      if (!user) {
        res.status(404).json({ message: "User not found" });
        return;
      }
      user.isDeleted = true;
      await user.save();
      res.json({ message: "Success" });
    } catch (error) {
      console.error("Error deleting admin:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  },

  //Dashboard
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

  //Users
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

  //Subscription
  getSubscriptionStat: async (req: Request, res: Response) => {
    try {
      const [
        subscription,
        activeSubscription,
        canceledSubscription,
        pastDueSubscription,
      ] = await Promise.all([
        subscriptionModel.countDocuments(),
        subscriptionModel.countDocuments({ status: "active" }),
        subscriptionModel.countDocuments({ status: "canceled" }),
        subscriptionModel.countDocuments({ status: "past_due" }),
      ]);

      res.json({
        message: "Success",
        data: {
          subscription,
          activeSubscription,
          canceledSubscription,
          pastDueSubscription,
        },
      });
    } catch (error) {
      console.error("Error fetching subscription:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  },

  getAllSubscriptions: async (req: Request, res: Response) => {
    try {
      let { page = 1, limit = 20 } = req.query;
      page = parseInt(page as string);
      limit = parseInt(limit as string);
      const skip = (page - 1) * limit;

      const total = await subscriptionModel.countDocuments();
      const subscriptions = await subscriptionModel
        .find()
        .populate<{ userId: IUser }>("userId", "email displayName phone")
        .skip(skip)
        .limit(limit);

      const mappedResponse = subscriptions.map((subscription) => {
        return {
          id: subscription._id,
          userId: subscription.userId.id,
          displayName: subscription.userId.displayName,
          email: subscription.userId.email || "",
          phoneNumber: subscription.userId.phone || "",
          planName: subscription.planName,
          currentPeriodEnd: subscription.currentPeriodEnd,
          status: subscription.status,
          createdAt: subscription.createdAt,
          updatedAt: subscription.updatedAt,
        };
      });

      res.json({
        message: "Success",
        data: mappedResponse,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
          hasMore: total > page * limit,
        },
      });
    } catch (error) {
      console.log(error);
      res.status(500).json({ message: "Internal server error" });
    }
  },

  getUserInvoiceHistory: async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;
      if (!userId) {
        res.status(400).json({ message: "User ID is required" });
        return;
      }
      const user = await UserModel.findById(userId);
      if (!user) {
        res.status(404).json({ message: "User not found" });
        return;
      }
      if (!user.stripeCustomerId) {
        res.status(404).json({ message: "User not found" });
        return;
      }
      const invoiceHistory = await getUserStripeInvoiceHistory(
        user.stripeCustomerId
      );
      res.json({ message: "Success", data: invoiceHistory });
    } catch (error) {
      console.error("Error fetching invoice history:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  },

  cancelUserSubscription: async (req: Request, res: Response) => {
    try {
      const userId = req.body.userId;

      if (!userId) {
        res.status(401).json({ success: false, error: "Unauthorized" });
        return;
      }

      await cancelSubscription(userId);

      res.status(200).json({
        message:
          "Subscription will be canceled at the end of the current period",
      });
    } catch (error: any) {
      console.error("Cancel subscription error:", error);
      res.status(500).json({
        success: false,
        error: error.message || "Failed to cancel subscription",
      });
    }
  },

  //Report Page
  getReports: async (req: Request, res: Response) => {
    try {
      let { page = 1, limit = 20 } = req.query;
      page = parseInt(page as string);
      limit = parseInt(limit as string);
      const skip = (page - 1) * limit;

      const posts = await Post.find({
        reportCount: { $gt: 10 },
        isDeleted: false,
      })
        .skip(skip)
        .limit(limit);

      const mappedResponse = posts.map((post) => {
        return {
          _id: post._id,
          title: post.content.text,
          media: post.media,
          reportCount: post.reportCount,
          createdAt: post.createdAt,
          updatedAt: post.updatedAt,
        };
      });

      const total = await Post.countDocuments({
        reportCount: { $gt: 10 },
        isDeleted: false,
      });

      res.json({
        message: "Success",
        data: mappedResponse,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
          hasMore: total > page * limit,
        },
      });
    } catch (error) {
      console.error("Error fetching reports:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  },

  deletePost: async (req: Request, res: Response) => {
    try {
      const { postId } = req.body;
      if (!postId) {
        res.status(400).json({ message: "Post Id is required" });
        return;
      }
      await Post.findByIdAndUpdate({ _id: postId }, { isDeleted: true });
      res.json({ message: "Post deleted successfully" });
    } catch (error) {
      console.log("Error deleting post", error);
      res.status(500).json({ message: "Internal server error" });
    }
  },

  //Gender verification
  getAllPendingVerification: async (req: Request, res: Response) => {
    try {
      const verifications = await GenderApplicationModel.find().populate<{ applicant: IUser }>("applicant");

      const response = verifications.map((verification) => {
        return {
          id: verification._id,
          user: {
            _id: verification.applicant._id,
            displayName: verification.applicant.displayName,
            email: verification.applicant.email,
          },
          media: verification.attachment,
          status: verification.status,
          createdAt: verification.createdAt,
          updatedAt: verification.updatedAt,
        };
      });

      res.json({ message: "Success", data: response });
    } catch (error) {
      console.error("Error fetching pending verifications:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  },

  acceptGenderVerification: async (req: Request, res: Response) => {
    try {
      const { id, userId } = req.body;
      if (!id) {
        res.status(400).json({ message: "Verification Id is required" });
        return;
      }
      await GenderApplicationModel.findByIdAndUpdate(
        { _id: id },
        { status: "accepted" }
      );

      const user = await UserModel.findByIdAndUpdate(
        { _id: userId },
        { isProfileCompleted: true }
      );

      if (user.oneSignalPlayerId) {
        await sendPushNotification(
          user.id,
          user.oneSignalPlayerId,
          NotificationType.SYSTEM,
          "Your gender application has been approved"
        );
      }

      res.json({ message: "Verification accepted successfully" });
    } catch (error) {
      console.error("Error accepting verification:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  },

  rejectGenderVerification: async (req: Request, res: Response) => {
    try {
      const { id, userId } = req.body;
      if (!id || !userId) {
        res.status(400).json({ message: "Verification Id and User Id are required" });
        return;
      }

      await GenderApplicationModel.findByIdAndDelete(id);

      const user = await UserModel.findByIdAndUpdate(
        { _id: userId },
        { isProfileCompleted: false }
      );

      if (user.oneSignalPlayerId) {
        await sendPushNotification(
          user.id,
          user.oneSignalPlayerId,
          NotificationType.SYSTEM,
          "Your gender application has been rejected"
        );
      }

      res.json({ message: "Verification rejected successfully" });
    } catch (error) {
      console.error("Error rejecting verification:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  },
};
