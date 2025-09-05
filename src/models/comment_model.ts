import { Schema, model } from "mongoose";
import { IComment } from "../types/comment_type";
import { IUser } from "../types/user_type";
import { Reaction } from "./reaction_model";

const CommentSchema = new Schema<IComment>(
  {
    postId: {
      type: Schema.Types.ObjectId,
      ref: "Post",
      required: true,
      index: true,
    },
    parentId: {
      type: Schema.Types.ObjectId,
      ref: "Comment",
    },
    authorId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    content: {
      type: String,
      required: true,
      maxlength: 2000,
    },
    clientId: { type: String, default: "" },
    reactionCount: {
      type: Number,
      default: 0,
    },
    reaction: {
      type: Schema.Types.ObjectId,
      ref: "Reaction",
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    isPinned: {
      type: Boolean,
      default: false,
    },
    replyCount: {
      type: Number,
      default: 0,
    },
    emoji: {
      type: String,
      default: "",
    },

  },
  {
    timestamps: true,
  }
);

// Methods
CommentSchema.methods.reactToComment = async function (
  user: IUser,
  reactionType: string,
  emoji: string
) {
  const reactionExist = await Reaction.findOne({
    commentId: this._id,
    postId: this.postId,
    userId: user._id,
  });

  if (reactionExist) {
    if (reactionExist.type === reactionType) {
      await reactionExist.deleteOne();
      this.reactionCount = Math.max(0, this.reactionCount - 1);
      this.reaction = null;
      this.emoji = "";
    }
  } else {
    const reaction = new Reaction({
      postId: this.postId,
      commentId: this._id,
      userId: user._id,
      type: reactionType,
      emoji,
    });
    await reaction.save();
    this.reactionCount++;
    this.emoji = emoji;
    this.reaction = reaction._id.toString();
  }
  return await this.save();
};

const Comment = model<IComment>("Comment", CommentSchema);

export default Comment;
