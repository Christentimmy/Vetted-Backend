import { Request, Response } from "express";
import UserModel from "../models/user_model";
import { Follow } from "../models/follow";
import User from "../models/user_model";
import { NotificationType, sendPushNotification } from "../config/onesignal";
import mongoose from "mongoose";
import Notification from "../models/notification_model";
import { Post } from "../models/post_model";
import { Block } from "../models/block_model";
import { IUser } from "../types/user_type";
import { PostBuilderService } from "../services/post_builder_service";
import Alert from "../models/alert_model";
import { detectGenderWithGemini } from "../utils/gemini_helper";
import GenderApplicationModel from "../models/gender_model_application";

const isValidObjectId = mongoose.Types.ObjectId.isValid;

export const userController = {
  userExist: async (req: Request, res: Response) => {
    try {
      const { email } = req.body;
      if (!email) {
        res.status(400).json({ message: "Email is required" });
        return;
      }
      const user = await UserModel.findOne({ email });
      if (!user) {
        res.status(400).json({ message: "User does not exist" });
        return;
      }
      res.status(200).json({ message: "User exists" });
      return;
    } catch (error) {
      console.error("User exist error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  },

  updateName: async (req: Request, res: Response) => {
    try {
      if (!req.body) {
        res.status(400).json({ message: "Missing request body" });
        return;
      }
      const { name } = req.body;
      if (!name) {
        res.status(400).json({ message: "Name is required" });
        return;
      }
      const userId = res.locals.userId;
      if (!userId) {
        res.status(401).json({ message: "Unauthorized" });
        return;
      }
      await UserModel.findByIdAndUpdate(
        userId,
        { displayName: name },
        { new: true }
      );
      return res.status(200).json({
        message: "Name updated successfully",
      });
    } catch (error) {
      console.error("Update name error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  },

  updateDob: async (req: Request, res: Response) => {
    try {
      if (!req.body) {
        res.status(400).json({ message: "Missing request body" });
        return;
      }
      const { dateOfBirth } = req.body;
      if (!dateOfBirth) {
        res.status(400).json({ message: "Date of birth is required" });
        return;
      }
      const userId = res.locals.userId;
      if (!userId) {
        res.status(401).json({ message: "Unauthorized" });
        return;
      }
      await UserModel.findByIdAndUpdate(userId, { dateOfBirth }, { new: true });
      return res.status(200).json({
        message: "Date of birth updated successfully",
      });
    } catch (error) {
      console.error("Update date of birth error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  },

  updateLocation: async (req: Request, res: Response) => {
    try {
      const userId = res.locals.userId;
      if (!userId) {
        res.status(400).json({ message: "Invalid Request" });
        return;
      }
      const { lat, lng, address } = req.body;
      if (!lat || !lng || !address) {
        res.status(400).json({ message: "Invalid Request" });
        return;
      }
      const user = await UserModel.findById(userId);
      if (!user) {
        res.status(404).json({ message: "User not found" });
        return;
      }
      user.location = {
        type: "Point",
        address,
        coordinates: [lng, lat],
      };
      await user.save();
      res.status(200).json({ message: "Location updated successfully" });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Internal server error" });
    }
  },

  uploadProfilePicture: async (req: Request, res: Response) => {
    try {
      const userId = res.locals.userId;
      if (!userId) {
        res.status(401).json({ message: "Unauthorized" });
        return;
      }
      const file = req.file;
      if (!file) {
        res.status(400).json({ message: "File is required" });
        return;
      }
      const user = await UserModel.findById(userId);
      if (!user) {
        res.status(404).json({ message: "User not found" });
        return;
      }
      user.avatar = file.path;
      await user.save();
      res.status(200).json({ message: "Profile picture updated successfully" });
    } catch (error) {
      console.error("Update profile picture error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  },

  updateRelationStatus: async (req: Request, res: Response) => {
    try {
      const userId = res.locals.userId;
      if (!userId) {
        res.status(401).json({ message: "Unauthorized" });
        return;
      }
      let { relationStatus } = req.body;
      relationStatus = relationStatus.toLowerCase();
      if (!relationStatus) {
        res.status(400).json({ message: "Relation status is required" });
        return;
      }
      if (
        !Object.values([
          "single",
          "in a relationship",
          "engaged",
          "married",
          "deparated",
          "divorced",
          "widowed",
        ]).includes(relationStatus)
      ) {
        res.status(400).json({ message: "Invalid relation status" });
        return;
      }
      const user = await UserModel.findById(userId);
      if (!user) {
        res.status(404).json({ message: "User not found" });
        return;
      }

      user.relationshipStatus = relationStatus;
      await user.save();
      res.status(200).json({ message: "Relation status updated successfully" });
    } catch (error) {
      console.error("Update relation status error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  },

  profileVerified: async (req: Request, res: Response) => {
    try {
      const userId = res.locals.userId;
      if (!userId) {
        res.status(401).json({ message: "Unauthorized" });
        return;
      }
      const user = await UserModel.findById(userId);
      if (!user) {
        res.status(404).json({ message: "User not found" });
        return;
      }
      user.isProfileCompleted = true;
      await user.save();
      res.status(200).json({ message: "Profile verified successfully" });
    } catch (error) {
      console.error("Profile verification error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  },

  editProfile: async (req: Request, res: Response) => {
    try {
      const { displayName, email, phone, location } = req.body;
      const userId = res.locals.userId;
      if (!userId) {
        res.status(401).json({ message: "Unauthorized" });
        return;
      }
      const user = await User.findById(userId);
      if (!user) {
        res.status(404).json({ message: "User not found" });
        return;
      }

      if (displayName) user.displayName = displayName;
      if (email) user.email = email;
      if (phone) user.phone = phone;
      // if(location){
      //   user.location.address = location.address;
      //   user.location.coordinates[0] = location.lng;
      //   user.location.coordinates[1] = location.lat;
      // }

      await user.save();
      res.status(200).json({ message: "Profile updated successfully" });
    } catch (error) {
      console.error("Edit profile error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  },

  toggleFollow: async (req: Request, res: Response) => {
    try {
      if (!req.body) {
        return res.status(400).json({ message: "No follow data provided" });
      }

      const userId = res.locals.userId; // ← The actor (follower)
      const { followId } = req.body; // ← The receiver (followed)

      if (!followId) {
        return res.status(400).json({ message: "Follow ID is required" });
      }
      if (!isValidObjectId(followId)) {
        return res.status(400).json({ message: "Invalid follow ID" });
      }

      if (followId === userId) {
        return res.status(400).json({ message: "Cannot follow yourself" });
      }

      const follow = await Follow.findOne({
        follower: userId,
        following: followId,
      });

      if (follow) {
        await follow.deleteOne();
        return res.status(200).json({ message: "Unfollowed" });
      } else {
        await Follow.create({ follower: userId, following: followId });

        const receiver = await User.findById(followId);

        if (!receiver) {
          res.status(404).json({ message: "User not found" });
          return;
        }

        if (receiver.oneSignalPlayerId) {
          await sendPushNotification(
            receiver._id.toString(),
            receiver.oneSignalPlayerId,
            NotificationType.FOLLOW,
            `${res.locals.user.displayName} started following you.`,
            `/profile/${userId}`
          );
        }

        return res.status(200).json({ message: "Followed" });
      }
    } catch (error) {
      console.error("Error toggling follow:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  },

  getUserStatus: async (req: Request, res: Response) => {
    try {
      const userId = res.locals.userId;
      const user = await User.findById(userId).select(
        "phone accountStatus isPhoneVerified isProfileCompleted displayName dateOfBirth relationshipStatus location"
      );

      const genderVerification = await GenderApplicationModel.findOne({
        applicant: userId,
      });

      if (!user) {
        res.status(404).json({ message: "User not found" });
        return;
      }

      let response: any = {
        message: "User status retrieved",
        data: user,
      };

      if (genderVerification) {
        response.vStatus = genderVerification.status;
      }

      res.status(200).json(response);
    } catch (error) {
      console.error("Error retrieving user status:", error);
      res.status(500).json({ message: "Internal Server Error" });
    }
  },

  getUserDetails: async (req: Request, res: Response) => {
    try {
      const userId = res.locals.userId;
      if (!userId) {
        res.status(400).json({ message: "Missing user ID" });
        return;
      }

      const user = await User.findById(userId).select("-password");

      if (!user) {
        res.status(404).json({ message: "User not found" });
        return;
      }

      const followers = await Follow.find({ following: userId });
      const following = await Follow.find({ follower: userId });

      const userObj: any = user.toObject();

      userObj.followerCount = followers.length;
      userObj.followingCount = following.length;

      res.status(200).json({
        message: "User details fetched successfully",
        data: userObj,
      });
      return;
    } catch (error) {
      console.error("❌ Error in getUserById:", error);
      return res.status(500).json({ message: "Internal Server Error" });
    }
  },

  getNotification: async (req: Request, res: Response) => {
    try {
      const userId = res.locals.user._id;

      const notifications = await Notification.find({ userId }).sort({
        createdAt: -1,
      });

      const response = notifications.map((notification) => {
        return {
          userId: notification.userId,
          _id: notification._id,
          type: notification.type,
          message: notification.message,
          link: notification.link,
          isRead: notification.isRead,
          createdAt: notification.createdAt,
        };
      });

      res.status(200).json({
        message: "Notifications fetched successfully",
        data: response,
      });
    } catch (error) {
      console.error("Error fetching notifications:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  },

  saveSignalId: async (req: Request, res: Response) => {
    try {
      const userId = res.locals.userId;
      if (!userId) {
        res.status(400).json({ message: "Missing user ID" });
        return;
      }
      if (!req.body) {
        res.status(400).json({ message: "Missing request body" });
        return;
      }
      const { pushId } = req.body;
      if (!pushId) {
        res.status(400).json({ message: "Missing push ID" });
        return;
      }
      const user = await User.findById(userId);
      if (!user) {
        res.status(404).json({ message: "User not found" });
        return;
      }
      user.oneSignalPlayerId = pushId;
      await user.save();
      res.status(200).json({ message: "Signal ID saved successfully" });
    } catch (error) {
      console.error("Error saving signal ID:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  },

  markNotificationAsRead: async (req: Request, res: Response) => {
    try {
      const userId = res.locals.user._id;
      if (!userId) {
        res.status(400).json({ message: "Missing user ID" });
        return;
      }
      if (!isValidObjectId(userId)) {
        res.status(400).json({ message: "Invalid user ID" });
        return;
      }
      if (!req.body) {
        res.status(400).json({ message: "Missing request body" });
        return;
      }
      const { notificationId } = req.body;

      if (!notificationId) {
        res.status(400).json({ message: "Notification ID is required" });
        return;
      }

      const notification = await Notification.findOne({
        _id: notificationId,
        userId,
      });

      if (!notification) {
        res.status(404).json({ message: "Notification not found" });
        return;
      }

      notification.isRead = true;
      await notification.save();

      res.status(200).json({ message: "Notification updated successfully" });
    } catch (error) {
      console.error("Error updating notification:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  },

  toggleBlock: async (req: Request, res: Response) => {
    try {
      if (!req.body || typeof req.body !== "object") {
        return res.status(400).json({ message: "Missing request body" });
      }

      const userId = res.locals.user._id;
      const { blockId } = req.body;

      if (!blockId) {
        res.status(400).json({ message: "Block ID is required" });
        return;
      }

      const existing = await Block.findOne({
        blocker: userId,
        blocked: blockId,
      });

      if (existing) {
        await Block.deleteOne({ _id: existing._id });
        return res.status(200).json({ message: "Unblocked" });
      }

      await Block.create({ blocker: userId, blocked: blockId });
      return res.status(200).json({ message: "Blocked" });
    } catch (error) {
      console.error("Error blocking user:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  },

  getBlockedUsers: async (req: Request, res: Response) => {
    try {
      const userId = res.locals.user._id;

      const blocks = await Block.find({ blocker: userId }).populate<{
        blocked: IUser;
      }>("blocked", "username displayName avatarUrl");
      const formattedBlocks = await Promise.all(
        blocks.map((block) => {
          return {
            _id: block.blocked._id,
            avatarUrl: block?.blocked?.avatar,
            displayName: block?.blocked?.displayName,
          };
        })
      );

      res.status(200).json({
        message: "Blocked users fetched successfully",
        data: formattedBlocks,
      });
    } catch (error) {
      console.error("Error fetching blocked users:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  },

  getMyPost: async (req: Request, res: Response) => {
    try {
      const userId = res.locals.user._id;

      const posts = await Post.find({ authorId: userId })
        .populate("authorId")
        .sort({
          createdAt: -1,
        });

      const formattedPosts = await Promise.all(
        posts.map((post) =>
          PostBuilderService.formatPostResponse(post, userId.toString())
        )
      );

      res.status(200).json({
        message: "Posts fetched successfully",
        data: formattedPosts,
      });
    } catch (error) {
      console.error("Error fetching my posts:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  },

  createAlert: async (req: Request, res: Response) => {
    try {
      const { name } = req.body;
      const userId = res.locals.user._id;

      const existingAlert = await Alert.findOne({
        userId,
        name: name.toLowerCase(),
      });
      if (existingAlert) {
        return res.status(400).json({
          message: "You already have an alert for this name",
        });
      }

      const alert = new Alert({
        userId,
        name: name.toLowerCase(),
      });

      await alert.save();

      res.status(201).json({
        message: "Alert created successfully",
        data: alert,
      });
    } catch (error) {
      res.status(500).json({
        message: "Server error",
        error: error.message,
      });
    }
  },

  getUserAlerts: async (req: Request, res: Response) => {
    try {
      const userId = res.locals.user._id;
      const alerts = await Alert.find({ userId, isActive: true });

      res.status(200).json({
        message: "Alerts fetched successfully",
        data: alerts,
      });
    } catch (error) {
      res.status(500).json({
        message: "Server error",
        error: error.message,
      });
    }
  },

  deleteAlert: async (req: Request, res: Response) => {
    try {
      const { alertId } = req.params;
      const userId = res.locals.user._id;

      const alert = await Alert.findOneAndDelete({
        _id: alertId,
        userId,
      });

      if (!alert) {
        return res.status(404).json({
          message: "Alert not found",
        });
      }

      res.status(200).json({
        message: "Alert deleted successfully",
      });
    } catch (error) {
      res.status(500).json({
        message: "Server error",
        error: error.message,
      });
    }
  },

  verifyGender: async (req: Request, res: Response) => {
    try {
      const userId = res.locals.userId;
      if (!userId) {
        res.status(400).json({ message: "Missing user ID" });
        return;
      }
      const video = req.file.path;
      if (!video) {
        res.status(400).json({ message: "No video uploaded" });
        return;
      }

      const existingApplication = await GenderApplicationModel.findOne({
        applicant: userId,
        status: "pending",
      });

      if (existingApplication) {
        return res.status(400).json({ message: "You have already applied" });
      }

      const genderApplication = new GenderApplicationModel({
        applicant: userId,
        attachment: video,
        status: "pending",
      });

      await genderApplication.save();

      res.json({ message: "Gender Application successfully" });
    } catch (err) {
      console.log(err);
      res.status(500).json({ error: err.message });
    }
  },

  changeNotificationSetting: async (req: Request, res: Response) => {
    try {
      if (req.body!) {
        res.status(400).json({ message: "Invalid-Request" });
        return;
      }

      const user = res.locals.user;
      if (!user) {
        res.status(400).json({ message: "User not authorized" });
        return;
      }

      const {
        general,
        trendingPost,
        newComments,
        alertForWomenNames,
        reactions,
      } = req.body;

      if (typeof general === "boolean") {
        user.notificationSettings.general = general;
      }
      if (typeof trendingPost === "boolean") {
        user.notificationSettings.trendingPost = trendingPost;
      }
      if (typeof newComments === "boolean") {
        user.notificationSettings.newComments = newComments;
      }
      if (typeof alertForWomenNames === "boolean") {
        user.notificationSettings.alertForWomenNames = alertForWomenNames;
      }
      if (typeof reactions === "boolean") {
        user.notificationSettings.reactions = reactions;
      }

      await user.save();
      res.status(200).json({ message: "Notification setting modified" });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Server-Error" });
    }
  },
};
