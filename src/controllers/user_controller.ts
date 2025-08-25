import { Request, Response } from "express";
import UserModel from "../models/user_model";

export const userController = {
  updateAnonymousName: async (req: Request, res: Response) => {
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
        message: "Anonymous name updated successfully",
      });
    } catch (error) {
      console.error("Update anonymous name error:", error);
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
      if (!req.body) {
        res.status(400).json({ message: "Missing request body" });
        return;
      }
      const { location } = req.body;
      if (!location) {
        res.status(400).json({ message: "Location is required" });
        return;
      }
      const { address, coordinates } = location;
      if (!address || !coordinates) {
        res.status(400).json({ message: "Invalid location format" });
        return;
      }
      const userId = res.locals.userId;
      if (!userId) {
        res.status(401).json({ message: "Unauthorized" });
        return;
      }
      await UserModel.findByIdAndUpdate(userId, { location: { address, coordinates } }, { new: true });
      return res.status(200).json({
        message: "Location updated successfully",
      });
    } catch (error) {
      console.error("Update location error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  },

  uploadProfilePicture:async(req:Request,res:Response)=>{
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
  }



};
