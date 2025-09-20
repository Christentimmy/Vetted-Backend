import { Request, Response } from "express";
import UserModel from "../models/user_model";


export const adminController = {
    getDashboardStats: async (req: Request, res: Response) => {
        try {
            const totalUsers = await UserModel.countDocuments();
        } catch (error) {
            console.error("Error fetching dashboard stats:", error);
            res.status(500).json({ error: "Internal server error" });
        }
    },    
};
