import { Request, Response } from "express";
import Message from "../models/message_model";
import User from "../models/user_model";
import { decrypt, encrypt } from "../utils/encryption";
import { IMessageDocument } from "../types/message_type";
import { IUser } from "../types/user_type";
import mongoose from "mongoose";

const isValidObjectId = mongoose.Types.ObjectId.isValid;

export const messageController = {
  sendMessage: async (req: Request, res: Response) => {
    const user : IUser = res.locals.user;
    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    if (!req.body || typeof req.body !== "object") {
      return res.status(400).json({ message: "No message data provided" });
    }
    const {
      receiverId,
      message,
      messageType = "text",
      mediaUrl,
      mediaIv,
      multpleMedia,
      clientGeneratedId,
      replyToMessageId,
    } = req.body;
    const senderId = res.locals.userId;

    if (!receiverId || !isValidObjectId(receiverId)) {
      res
        .status(400)
        .json({ message: "Receiver ID, message and receiver ID are required" });
      return;
    }
    if (!message && !mediaUrl && !multpleMedia && !replyToMessageId) {
      res.status(400).json({
        message:
          "Message, mediaUrl, multpleMedia or replyToMessageId is required",
      });
      return;
    }

    if (receiverId === senderId) {
      return res
        .status(400)
        .json({ message: "You cannot send messages to yourself." });
    }

    var replyToMessage: IMessageDocument | null = null;
    if (replyToMessageId !== null && replyToMessageId !== undefined) {
      replyToMessage = await Message.findById(replyToMessageId);
    }

    const encryptedMessage = encrypt(message);

    if (!encryptedMessage) {
      console.error("Failed to encrypt message:", message);
      return res.status(500).json({ message: "Failed to encrypt message." });
    }

    if (
      multpleMedia &&
      !Array.isArray(multpleMedia) &&
      multpleMedia.length <= 0
    ) {
      console.error("Invalid media files provided:", multpleMedia);
      return res.status(400).json({ message: "No media files provided." });
    }
    if (multpleMedia) {
      for (const media of multpleMedia) {
        if (!media.mediaUrl || !media.mediaIv) {
          console.error("Invalid media file:", media);
          return res.status(400).json({ message: "Invalid media file, mediaUrl or mediaIv is missing" });
        }
      }
    }

    try {
      const newMessage = await Message.create({
        senderId,
        receiverId,
        message: message ? encryptedMessage.data : null,
        messageType,
        mediaUrl: mediaUrl || null,
        multipleImages: multpleMedia,
        iv: message ? encryptedMessage.iv : null,
        mediaIv: mediaIv || null,
        status: "sent",
        clientGeneratedId: clientGeneratedId || null,
        avater: user?.avatar || null,
        replyToMessage: replyToMessage || null,
        replyToMessageId: replyToMessageId || null,
      });

      await newMessage.save();

      res
        .status(201)
        .json({ message: "Message sent successfully", data: newMessage });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Failed to send message", error });
    }
  },

  convertFileToMedia: async (req: Request, res: Response) => {
    if (!req.file) {
      res.status(400).json({ success: false, message: "No file uploaded" });
      return;
    }

    try {
      const mimeType = req.file.mimetype;
      let messageType: string;

      if (mimeType.startsWith("audio/")) {
        messageType = "audio";
      } else if (mimeType.startsWith("video/")) {
        messageType = "video";
      } else {
        messageType = "image";
      }

      // Encrypt the media URL
      const encryptedUrl = encrypt(req.file.path);

      res.json({
        message: "File uploaded successfully",
        data: {
          mediaUrl: encryptedUrl.data,
          mediaIv: encryptedUrl.iv,
          public_id: req.file.filename,
          messageType,
        },
      });
    } catch (error) {
      console.error("Upload error:", error);
      res
        .status(500)
        .json({ success: false, message: "File upload failed", error });
    }
  },

  uploadMultipleImages: async (req: Request, res: Response) => {
    try {
      if (!req.files || req.files.length === 0) {
        res.status(400).json({ message: "No file uploaded" });
        return;
      }

      const files = req.files as Express.Multer.File[];
      const urls = files.map((file) => {
        const mimeType = file.mimetype;
        let messageType: string;

        if (mimeType.startsWith("audio/")) {
          messageType = "audio";
        } else if (mimeType.startsWith("video/")) {
          messageType = "video";
        } else {
          messageType = "image";
        }

        // Encrypt the media URL
        const encryptedUrl = encrypt(file.path);
        return {
          public_id: file.filename,
          mimetype: file.mimetype,
          mediaUrl: encryptedUrl.data,
          mediaIv: encryptedUrl.iv,
          messageType,
        };
      });

      res.json({
        message: "Files uploaded successfully",
        data: urls,
      });
    } catch (error) {
      console.error("Upload error:", error);
      res.status(500).json({ message: "File upload failed", error });
    }
  },
};
