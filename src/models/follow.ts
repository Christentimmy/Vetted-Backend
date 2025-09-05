
import { IFollow } from "../types/follow_type";
import { Schema, model } from "mongoose";

const followSchema = new Schema<IFollow>(
  {
    follower: { type: Schema.Types.ObjectId, ref: "User", required: true },
    following: { type: Schema.Types.ObjectId, ref: "User", required: true },
    followedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

followSchema.index({ follower: 1, following: 1 }, { unique: true });

export const Follow = model<IFollow>("Follow", followSchema);
