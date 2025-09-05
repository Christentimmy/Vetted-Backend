import { Request, Response } from "express";
import UserModel from "../models/user_model";
import { Follow } from "../models/follow";
import User from "../models/user_model";
import { NotificationType, sendPushNotification } from "../config/onesignal";
import mongoose from "mongoose";

const isValidObjectId = mongoose.Types.ObjectId.isValid;

export const userController = {
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
      const { relationStatus } = req.body;
      if (!relationStatus) {
        res.status(400).json({ message: "Relation status is required" });
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
        "phone accountStatus isPhoneVerified isProfileCompleted"
      );

      if (!user) {
        res.status(404).json({ message: "User not found" });
        return;
      }

      res.status(200).json({
        message: "User status retrieved",
        data: user,
      });
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
};
