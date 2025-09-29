import { Request, Response } from "express";
import { SupportTicket } from "../models/support_ticket_model";
import UserSchema from "../models/user_model";
import { sendEmail, sendBulkEmail } from "../services/email_service";
import { uploadToCloudinary } from "../middlewares/upload";

export const supportTicketController = {
  // Create a new support ticket
  createTicket: async (req: Request, res: Response) => {
    try {
      const userId = res.locals.userId;
      const { subject, description } = req.body;

      const files = req.files as Express.Multer.File[];
      if (!files) {
        res.status(400).json({ message: "Attachments are required" });
        return;
      }

      if (!subject || !description ) {
        res
          .status(400)
          .json({ message: "Subject, description, required" });
        return;
      }

      let attachments: string[] = [];
      for (const file of files) {
        attachments.push(file.path);
      }

      const ticket = new SupportTicket({
        user: userId,
        subject,
        description,
        category: "technical",
        priority: "medium",
        attachments,
        createdAt: new Date(),
      });

      await ticket.save();

      // Notify admin about new ticket
      const admins = await UserSchema.find({
        role: { $in: ["super_admin", "sub_admin"] },
      });
      const user = await UserSchema.findById(userId);

      if (user) {
        const adminEmails = admins.map((admin) => admin.email);
        const message = `
                    New support ticket created by ${user.displayName} (${user.email})<br>
                    Subject: ${subject}<br>
                    Category: ${"Technical"}<br>
                    Description: ${description}<br><br>
                    ${attachments.length > 0 ? `\nAttachments: ${attachments.join("\n")}` : ""}
                `;

        const emailResult = await sendBulkEmail(
          adminEmails,
          "New Support Ticket Created",
          "Admin",
          message
        );

        if (!emailResult.success) {
          console.error(
            "Failed to send admin notifications:",
            emailResult.error
          );
        }
      }

      res.status(201).json({
        message: "Support ticket created successfully",
        data: ticket,
      });
    } catch (error) {
      console.error("createTicket error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  },

  // Get all tickets for a user
  getUserTickets: async (req: Request, res: Response) => {
    try {
      const userId = res.locals.userId;
      const tickets = await SupportTicket.find({ user: userId })
        .populate("assignedTo", "displayName email")
        .sort({ createdAt: -1 });

      const response = tickets.map((ticket) => ({
        _id: ticket._id,
        status: ticket.status,
        category: ticket.category,
        description: ticket.description,
        createdAt: ticket.createdAt,
        updatedAt: ticket.updatedAt,
      }));

      res.status(200).json({
        message: "Tickets fetched successfully",
        data: response,
      });
    } catch (error) {
      console.error("getUserTickets error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  },

  // Get a single ticket
  getTicket: async (req: Request, res: Response) => {
    try {
      const { ticketId } = req.params;
      const userId = res.locals.userId;
      const userRole = res.locals.userRole;

      const ticket = await SupportTicket.findById(ticketId)
        .populate("user", "displayName email")
        .populate("assignedTo", "displayName email")
        .populate("responses.responder", "displayName email");

      if (!ticket) {
        res.status(404).json({ message: "Ticket not found" });
        return;
      }

      res.status(200).json({
        message: "Ticket fetched successfully",
        data: ticket,
      });
    } catch (error) {
      console.error("getTicket error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  },

  // Update ticket status (admin only)
  updateStatus: async (req: Request, res: Response) => {
    try {
      const { status, ticketId, priority } = req.body;
      if (!ticketId) {
        res.status(400).json({ message: "TicketId required" });
        return;
      }

      const admin = res.locals.admin;

      const ticket = await SupportTicket.findById(ticketId);
      if (!ticket) {
        res.status(404).json({ message: "Ticket not found" });
        return;
      }

      if (ticket.assignedTo == null) {
        ticket.assignedTo = admin._id;
      }

      if (status) {
        if (!["open", "in_progress", "resolved", "closed"].includes(status)) {
          res.status(400).json({ message: "Invalid status value" });
          return;
        }
        ticket.status = status;
      }

      if (priority) {
        if (!["low", "medium", "high"].includes(priority)) {
          res.status(400).json({ message: "Invalid priority value" });
          return;
        }
        ticket.priority = priority;
      }

      ticket.updatedAt = new Date();
      await ticket.save();

      const user = await UserSchema.findById(ticket.user);
      if (user) {
        const message = `
                    Your support ticket status has been updated:<br>
                    Subject: ${ticket.subject}<br>
                    New Status: ${status}<br>
                    ${admin ? `Assigned To: ${admin.displayName}` : ""}
                `;

        await sendEmail(user.email, user.displayName, message);
      }

      res.status(200).json({ message: "Ticket status updated successfully" });
    } catch (error) {
      console.error("updateStatus error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  },

  // Get all tickets (admin only)
  getAllTickets: async (req: Request, res: Response) => {
    try {
      const { status, priority, category } = req.query;
      const query: any = {};

      if (status) query.status = status;
      if (priority) query.priority = priority;
      if (category) query.category = category;

      const tickets = await SupportTicket.find(query)
        .populate("user", "displayName email avatar phone")
        .populate("assignedTo", "displayName email")
        .sort({ createdAt: -1 });

      res.status(200).json({
        message: "Tickets fetched successfully",
        data: tickets,
      });
    } catch (error) {
      console.error("getAllTickets error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  },

  markAsResolved: async (req: Request, res: Response) => {
    try {
      const { id } = req.body;
      if (!id) {
        res.status(400).json({ message: "Id required" });
        return;
      }
      const ticket = await SupportTicket.findById(id);
      if (!ticket) {
        res.status(404).json({ message: "Ticket not found" });
        return;
      }
      ticket.status = "resolved";
      await ticket.save();
      res.status(200).json({ message: "Ticket marked as resolved successfully" });
    } catch (error) {
      console.error("markAsResolved error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  },
};
