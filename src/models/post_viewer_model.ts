
import { Schema, model, Types } from "mongoose";

const PostViewerSchema = new Schema(
  {
    postId: { type: Types.ObjectId, ref: "Post", required: true, index: true },
    userId: { type: Types.ObjectId, ref: "User" }, // null if anonymous
    ghostView: { type: Boolean, default: false },
    viewedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);


PostViewerSchema.index({ postId: 1, userId: 1 }, { unique: true });

export const PostViewer = model("PostViewer", PostViewerSchema);
