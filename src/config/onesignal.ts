
import axios from "axios";
import dotenv from "dotenv";
import Notification from "../models/notification_model";
import mongoose from "mongoose";

dotenv.config();

const oneSignalAppId = process.env.ONESIGNAL_APP_ID;
const oneSignalApiKey = process.env.ONESIGNAL_API_KEY;

if (!oneSignalAppId || !oneSignalApiKey) {
  console.error("Missing OneSignal credentials in environment variables.");
  process.exit(1);
}

enum NotificationType {
  FOLLOW = "follow",
  LIKE = "like",
  COMMENT = "comment",
  REPLY = "reply",
  MENTION = "mention",
  REPOST = "repost",
  TAG = "tag",
  MESSAGE = "message",
  SYSTEM = "system",
}

const sendPushNotification = async (
  userId: string,
  playerId: string | null,
  type: NotificationType,
  message: string,
  link?: string
): Promise<void> => {
  try {
    // Save notification to MongoDB
    const notification = new Notification({
      userId: new mongoose.Types.ObjectId(userId),
      type,
      message,
      link,
    });

    await notification.save();
  } catch (dbError) {
    console.error("❌ Error saving notification to DB:", dbError);
    return;
  }

  // Skip push if playerId is missing
  if (!playerId) {
    console.warn(
      `⚠️ User ${userId} has no OneSignal Player ID. Skipping push.`
    );
    return;
  }

  // Send push notification via OneSignal
  const payload = {
    app_id: oneSignalAppId,
    include_player_ids: [playerId],
    headings: { en: "New Notification" },
    contents: { en: message },
    url: link,
    data: {
      type,
      userId,
      link,
    },
  };

  try {
    const response = await axios.post(
      "https://onesignal.com/api/v1/notifications",
      payload,
      {
        headers: {
          Authorization: `Basic ${oneSignalApiKey}`,
          "Content-Type": "application/json",
        },
      }
    );
    console.log("✅ Push notification sent:", response.data.id);
  } catch (pushError: any) {
    console.error(
      "❌ Error sending push notification:",
      pushError.response?.data || pushError.message
    );
  }
};

export { sendPushNotification, NotificationType };
