import { Request, Response } from "express";
import UserModel from "../models/user_model";
import SearchLog from "../models/search_model";
import { Post } from "../models/post_model";
import MessageModel from "../models/message_model";

export const adminController = {

  getDashboardStats: async (req: Request, res: Response) => {
    try {
      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);

      const endOfToday = new Date();
      endOfToday.setHours(23, 59, 59, 999);

      const [totalUsers, todaySearches, totalPosts, totalMessages] =
        await Promise.all([
          UserModel.countDocuments(),
          SearchLog.countDocuments({
            createdAt: {
              $gte: startOfToday,
              $lte: endOfToday,
            },
          }),
          Post.countDocuments(),
          MessageModel.countDocuments(),
        ]);

      res.json({
        message: "Success",
        data: {
          totalUsers,
          todaySearches,
          totalPosts,
          totalMessages,
        },
      });
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  },

  
};
