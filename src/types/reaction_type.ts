import { Types } from "mongoose";

export interface IReaction {
  postId: Types.ObjectId;
  commentId: Types.ObjectId;
  userId: Types.ObjectId;
  type: string;
  emoji: string;
  createdAt: Date;
}
