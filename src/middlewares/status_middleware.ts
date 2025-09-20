import { Types } from "mongoose";
import userSchema from "../models/user_model";
import { Response, Request, NextFunction } from "express";

export async function statusChecker(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = res.locals.userId;

    const isObjectId = Types.ObjectId.isValid(userId);

    if (!isObjectId) {
      res.status(400).json({ message: "Invalid user id" });
      return;
    }

    const user = await userSchema.findById(userId);

    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    if (!user?.isPhoneVerified) {
      res.status(400).json({ message: "user phone is not verified" });
      return;
    }

    if (!user.isProfileCompleted) {
      res.status(400).json({ message: "User profile is not completed" });
      return;
    }

    if (user.accountStatus === "banned") {
      res.status(400).json({ message: "Account banned" });
      return;
    }

    res.locals.userId = userId;
    res.locals.user = user;
    next();
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

export async function adminStatusChecker(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const role = res.locals.role;
    if (role !== "admin" || role !== "super_admin" || role === null) {
      res.status(403).json({ message: "Access denied. Admin only" });
      return;
    }
    next();
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal Server Error" });
  }
}
