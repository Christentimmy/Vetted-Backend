import { NextFunction, Request, Response } from "express";

export const proChecker = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const user = res.locals.user;
    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }
    if (user.subscription.status !== "active") {
      res.status(403).json({ message: "User is not a pro" });
      return;
    }
    next();
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: "Internal server error" });
  }
};
