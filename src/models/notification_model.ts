
import mongoose, { Schema, Document } from "mongoose";

export interface INotification extends Document {
  userId: mongoose.Types.ObjectId; // Receiver
  actorId?: mongoose.Types.ObjectId; // Who triggered the notification
  type:
    | "follow"
    | "like"
    | "comment"
    | "reply"
    | "mention"
    | "repost"
    | "tag"
    | "message"
    | "system";
  message: string;
  link?: string; // e.g., `/post/abc123`
  isRead: boolean;
  createdAt: Date;
}

const NotificationSchema = new Schema<INotification>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true }, // Receiver
    type: {
      type: String,
      enum: ["follow", "like", "comment", "reply", "mention", "repost", "tag", "message", "system"],
      required: true,
    },
    message: { type: String, required: true },
    link: { type: String },
    isRead: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

const Notification = mongoose.model<INotification>("Notification", NotificationSchema);

export default Notification;
