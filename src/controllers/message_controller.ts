import { Request, Response } from "express";
import Message from "../models/message_model";
import User from "../models/user_model";
import { decrypt, encrypt } from "../utils/encryption";
import { IMessageDocument } from "../types/message_type";
import { IUser } from "../types/user_type";
import mongoose from "mongoose";
import { onlineUsers } from "../config/socket";

const isValidObjectId = mongoose.Types.ObjectId.isValid;

export const messageController = {
  sendMessage: async (req: Request, res: Response) => {
    const user: IUser = res.locals.user;
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
          return res.status(400).json({
            message: "Invalid media file, mediaUrl or mediaIv is missing",
          });
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

  getMessageHistory: async (req: Request, res: Response) => {
    try {
      const userId = res.locals.userId;
      const { otherUserId } = req.params;

      if (!otherUserId) {
        res
          .status(400)
          .json({ message: "User ID of the other user is required" });
        return;
      }

      const messages = await Message.find({
        $or: [
          { senderId: userId, receiverId: otherUserId },
          { senderId: otherUserId, receiverId: userId },
        ],
      })
        .sort({ timestamp: 1 })
        .exec();

      // Decrypt messages and media URLs
      const decryptedMessages = messages.map((msg) => {
        try {
          if (msg?.message !== null && msg?.iv !== null) {
            msg.message = decrypt(msg.message, msg.iv);
          }
          if (
            msg?.replyToMessage &&
            msg.replyToMessage.message !== null &&
            msg.replyToMessage.iv !== null
          ) {
            msg.replyToMessage.message = decrypt(
              msg.replyToMessage.message,
              msg.replyToMessage.iv
            );
          }
        } catch (e) {
          console.log(e);
        }

        try {
          if (msg?.mediaUrl !== null && msg?.mediaIv !== null) {
            msg.mediaUrl = decrypt(msg.mediaUrl, msg.mediaIv);
          }
          if (
            msg?.replyToMessage &&
            msg.replyToMessage.mediaUrl !== null &&
            msg.replyToMessage.mediaIv !== null
          ) {
            msg.replyToMessage.mediaUrl = decrypt(
              msg.replyToMessage.mediaUrl,
              msg.replyToMessage.mediaIv
            );
          }
        } catch (e) {
          console.log(e);
        }
        if (msg.multipleImages && msg.multipleImages.length > 0) {
          msg.multipleImages = msg.multipleImages.map((image) => {
            try {
              return {
                ...image,
                mediaUrl: decrypt(image.mediaUrl, image.mediaIv),
              };
            } catch (e) {
              console.log(e);
              return image; // Return the original image if decryption fails
            }
          });
        }

        if (
          msg.replyToMessage &&
          msg.replyToMessage.multipleImages &&
          msg.replyToMessage.multipleImages.length > 0
        ) {
          msg.replyToMessage.multipleImages =
            msg.replyToMessage.multipleImages.map((image) => {
              try {
                return {
                  ...image,
                  mediaUrl: decrypt(image.mediaUrl, image.mediaIv),
                };
              } catch (e) {
                console.log(e);
                return image; // Return the original image if decryption fails
              }
            });
        }
        return msg;
      });

      res.status(200).json({ message: "chat history", data: decryptedMessages });
    } catch (error) {
      console.error(error);
      res
        .status(500)
        .json({ message: "Failed to retrieve message history", error });
    }
  },

  markMessageAsRead: async (req: Request, res: Response) => {
    try {
      const { messageId } = req.params;

      if (!messageId) {
        res.status(400).json({ message: "Message ID is required" });
        return;
      }

      if (!isValidObjectId(messageId)) {
        res.status(400).json({ message: "Invalid message ID" });
        return;
      }

      const message = await Message.findById(messageId);

      if (!message) {
        res.status(404).json({ message: "Message not found" });
        return;
      }

      if (message.status === "read") {
        res.status(400).json({ message: "Message already marked as read" });
        return;
      }

      message.status = "read";
      await message.save();

      res.status(200).json({
        message: "Message marked as read",
        data: message,
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({
        message: "Failed to mark message as read",
        error,
      });
    }
  },

  getChatList: async (req: Request, res: Response) => {
    try {
      const userId = res.locals.userId;
      const messages = await Message.find({
        $or: [{ senderId: userId }, { receiverId: userId }],
      }).sort({ timestamp: -1 });

      const chatMap = new Map<string, any>();
      const maxLastMessageLength = 50;

      messages.forEach((message) => {
        const otherUserId =
          message.senderId.toString() === userId.toString()
            ? message.receiverId.toString()
            : message.senderId.toString();

        let decryptedMessage = message.message;
        // Decrypt text message if it exists and has an IV
        if (message.message && message.iv) {
          try {
            decryptedMessage = decrypt(message.message, message.iv);
          } catch (e) {
            console.warn("Failed to decrypt message", message._id);
          }
        }

        // Decrypt media URL if it exists and has an IV
        let decryptedMediaUrl = message.mediaUrl;
        if (message.mediaUrl && message.mediaIv) {
          try {
            decryptedMediaUrl = decrypt(message.mediaUrl, message.mediaIv);
          } catch (e) {
            console.warn("Failed to decrypt media URL", message._id);
          }
        }

        if (!decryptedMessage && decryptedMediaUrl) {
          decryptedMessage = message.messageType;
        }

        if (!chatMap.has(otherUserId)) {
          chatMap.set(otherUserId, {
            userId: otherUserId,
            lastMessage: decryptedMessage,
            lastMessageTimestamp: message.timestamp,
            unreadCount:
              message.receiverId.toString() === userId.toString() &&
              message.status === "sent"
                ? 1
                : 0,
            mediaUrl: decryptedMediaUrl,
            messageType: message.messageType,
          });
        } else {
          const chatData = chatMap.get(otherUserId);
          if (message.timestamp > chatData.lastMessageTimestamp) {
            chatData.lastMessage = decryptedMessage;
            chatData.mediaUrl = decryptedMediaUrl;
            chatData.messageType = message.messageType;
            chatData.lastMessageTimestamp = message.timestamp;
          }
          if (
            message.receiverId.toString() === userId.toString() &&
            message.status === "sent"
          ) {
            chatData.unreadCount += 1;
          }
        }
      });

      const chatList = await Promise.all(
        Array.from(chatMap.values()).map(async (chat) => {
          const user = await User.findById(chat.userId).select(
            "displayName avatarUrl"
          );
          const isOnline = onlineUsers.has(chat.userId);

          // Truncate the last message if it exceeds the maximum length
          const truncatedLastMessage =
            chat.lastMessage && chat.lastMessage.length > maxLastMessageLength
              ? chat.lastMessage.substring(0, maxLastMessageLength) + "..."
              : chat.lastMessage;

          return {
            userId: chat.userId,
            fullName: user?.displayName,
            avatar: user?.avatar,
            lastMessage: truncatedLastMessage || chat.messageType,
            mediaUrl: chat.mediaUrl,
            messageType: chat.messageType,
            unreadCount: chat.unreadCount,
            online: isOnline,
          };
        })
      );

      res.status(200).json({ message: "Chat List", chatList });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Server error", error });
    }
  },

  getUnreadMessageCount: async (req: Request, res: Response) => {
    const userId = res.locals.userId;
    const { chatWith } = req.params;

    if (!chatWith) {
      res.status(400).json({ message: "Missing chatWith parameter" });
      return;
    }

    try {
      const unreadCount = await Message.countDocuments({
        receiverId: userId,
        senderId: chatWith,
        status: "sent",
      });

      res.status(200).json({
        message: "unread messages counts",
        unreadMessages: unreadCount,
      });
    } catch (error) {
      console.error(error);
      res
        .status(500)
        .json({ message: "Failed to get unread message count", error });
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
