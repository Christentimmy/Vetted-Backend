
import { Request, Response } from "express";
import Report from "../models/report_model";
import mongoose from "mongoose";
import {Post} from "../models/post_model";

export const reportController = {
    
    createReport: async (req: Request, res: Response) => {
        try {
            const { reportedUser, description, type, referenceId } = req.body;
            const reporter = res.locals?.userId;
            if (!reporter) {
                res.status(401).json({ message: "Authentication required" });
                return;
            }

            // Validate required fields
            if (!reportedUser || !type) {
                res.status(400).json({
                    message: "Missing required fields: reportedUser, reason, type"
                });
                return;
            }

            // Prevent self-reporting
            if (reporter === reportedUser) {
                res.status(400).json({ message: "Cannot report yourself" });
                return;
            }

            // Check if user has already reported this item
            const existingReport = await Report.findOne({
                reporter,
                reportedUser,
                type,
                referenceId: referenceId || null
            });

            if (existingReport) {
                res.status(409).json({ message: "You have already reported this item" });
                return;
            }

            const report = new Report({
                reporter,
                reportedUser,
                description,
                type,
                referenceId: referenceId || null,
                status: "pending"
            });

            await report.save();

            if (type === "post") {
                const post = await Post.findById(referenceId);
                if (post) {
                    post.reportCount = post.reportCount + 1;
                    await post.save();
                }
            }

            res.status(201).json({
                message: "Report submitted successfully",
                reportId: report._id
            });
        } catch (error) {
            console.error("Error creating report:", error);
            res.status(500).json({ error: "Internal server error" });
        }
    },

    getAllUserReportedAccount: async (req: Request, res: Response) => {
        try {
            const userId = res.locals.userId;
            if (!userId) {
                res.status(401).json({ message: "Authentication required" });
                return;
            }

            const reports = await Report.find({ reporter: userId });
            res.status(200).json({
                message: "User reports fetched successfully",
                data: reports
            });
        } catch (error) {
            console.error("Error fetching user reports:", error);
            res.status(500).json({ error: "Internal server error" });
        }
    },

    getAllReports: async (req: Request, res: Response) => {
        try {
            const {
                page = 1,
                limit = 20,
                status,
                type,
                reporter,
                reportedUser,
                sortBy = "createdAt",
                sortOrder = "desc"
            } = req.query;

            const filter: any = {};
            if (status) filter.status = status;
            if (type) filter.type = type;
            if (reporter) filter.reporter = reporter;
            if (reportedUser) filter.reportedUser = reportedUser;

            const sort: any = {};
            sort[sortBy as string] = sortOrder === "desc" ? -1 : 1;

            const reports = await Report.find(filter)
                .populate("reporter", "full_name email")
                .populate("reportedUser", "full_name email avatar")
                .populate("reviewedBy", "full_name email")
                .sort(sort)
                .limit(Number(limit))
                .skip((Number(page) - 1) * Number(limit));

            const total = await Report.countDocuments(filter);

            const truncatedReports = reports.map(report => {
                const truncatedDescription = report.description?.length > 100
                    ? report.description.substring(0, 100) + "..."
                    : report.description;

                return {
                    ...report.toObject(),
                    description: truncatedDescription
                };
            });

            res.json({
                reports: truncatedReports,
                pagination: {
                    page: Number(page),
                    limit: Number(limit),
                    total,
                    pages: Math.ceil(total / Number(limit))
                }
            });
        } catch (error) {
            console.error("Error fetching all reports:", error);
            res.status(500).json({ error: "Internal server error" });
        }
    },

    getReportById: async (req: Request, res: Response) => {
        try {
            const { reportId } = req.params;

            if (!reportId) {
                res.status(400).json({ message: "Report ID is required" });
                return;
            }

            if (!mongoose.Types.ObjectId.isValid(reportId)) {
                res.status(400).json({ message: "Invalid report ID" });
                return;
            }

            const report = await Report.findById(reportId)
                .populate("reporter", "full_name email avatar")
                .populate("reportedUser", "full_name email avatar")
                .populate("reviewedBy", "full_name email");

            if (!report) {
                res.status(404).json({ message: "Report not found" });
                return;
            }

            res.status(200).json({ message: "Report fetched successfully", data: report });
        } catch (error) {
            console.error("Error fetching report:", error);
            res.status(500).json({ message: "Internal server error" });
        }
    },

    updateReportStatus: async (req: Request, res: Response) => {
        try {
            const { status, reportId } = req.body;
            const adminId = res.locals?.adminId;

            if (!reportId || !status) {
                res.status(400).json({ message: "Missing fields required" });
                return;
            }

            if (!mongoose.Types.ObjectId.isValid(reportId)) {
                res.status(400).json({ message: "Invalid report ID" });
                return;
            }

            if (!adminId) {
                res.status(401).json({ message: "Authentication required" });
                return;
            }

            const validStatuses = ["pending", "reviewed", "dismissed", "action_taken"];
            if (!validStatuses.includes(status)) {
                res.status(400).json({ message: "Invalid status" });
                return;
            }

            const updateData: any = {
                status,
                reviewedBy: adminId,
                reviewedAt: new Date()
            };

            const report = await Report.findByIdAndUpdate(
                reportId,
                updateData,
                { new: true }
            );

            if (!report) {
                res.status(404).json({ message: "Report not found" });
                return;
            }

            res.json({ message: "Report status updated successfully" });
        } catch (error) {
            console.error("Error updating report status:", error);
            res.status(500).json({ message: "Internal server error" });
        }
    },

};