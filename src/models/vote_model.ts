import { Schema, model } from "mongoose";
import { IVote } from "../types/vote_type";

const voteSchema = new Schema<IVote>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    postId: { type: Schema.Types.ObjectId, ref: "Post", required: true },
    color: { type: String, enum: ["red", "green"], required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

// prevent duplicate votes per user/post
voteSchema.index({ userId: 1, postId: 1 }, { unique: true });

export const Vote = model<IVote>("Vote", voteSchema);
