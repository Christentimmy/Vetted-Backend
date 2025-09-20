import { Request, Response } from "express";
import UserModel from "../models/user_model";
import SearchLog from "../models/search_model";
import { Post } from "../models/post_model";

export const adminController = {
  createAdmin: async (req: Request, res: Response) => {
    try {
      if(!req.body){
        return res.status(400).json({ message: "Invalid request" });
      }
      const { email, password, role = "admin" } = req.body;
      if (!email || !password) {
        return res.status(400).json({ message: "Email and password are required" });
      }

      const user = await UserModel.create({
        email,
        password,
        role: "super_admin",
      });

      

      res.json({ message: "Admin created successfully", data: user });
    } catch (error) {
      console.error("Error creating admin:", error);
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
};
