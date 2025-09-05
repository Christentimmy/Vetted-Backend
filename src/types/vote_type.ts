import { Document, Types } from "mongoose";

export interface IVote extends Document {
  userId: Types.ObjectId; // Who voted
  postId: Types.ObjectId; // On which post
  color: "red" | "green"; // Vote type
  createdAt: Date;
}
