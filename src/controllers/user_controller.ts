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
};
