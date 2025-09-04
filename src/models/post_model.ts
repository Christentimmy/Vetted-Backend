import mongoose, { Schema, Document, Types } from "mongoose";
import { IPost } from "../types/post_type";
import { Reaction } from "./reaction_model";
import { IEngagementStats } from "../types/post_type";
import { IMediaItem } from "../types/post_type";
import { ITextContent } from "../types/post_type";
import { IPollOption } from "../types/post_type";
import { IPoll } from "../types/post_type";
import { IUser } from "../types/user_type";

const MediaItemSchema = new Schema<IMediaItem>(
  {
    type: {
      type: String,
      enum: ["image", "video", "audio"],
      required: true,
    },
    url: {
      type: String,
      required: true,
    },
    thumbnailUrl: String,
    duration: Number, // For video/audio in seconds
    size: {
      type: Number,
    },
    dimensions: {
      width: Number,
      height: Number,
    },
    metadata: {
      format: String,
      quality: String,
      isProcessed: {
        type: Boolean,
        default: false,
      },
    },
  },
  { _id: false }
);

const TextContentSchema = new Schema<ITextContent>(
  {
    text: {
      type: String,
      maxlength: 5000,
    },
    formatting: {
      alignment: {
        type: String,
        enum: ["left", "center", "right"],
        default: "left",
      },
      isBold: {
        type: Boolean,
        default: false,
      },
      font: String,
    },
  },
  { _id: false }
);

const PollOptionSchema = new Schema<IPollOption>(
  {
    id: {
      type: String,
      required: true,
    },
    text: {
      type: String,
      required: true,
      maxlength: 200,
    },
    voteCount: {
      type: Number,
      default: 0,
    },
  },
  { _id: false }
);

const PollSchema = new Schema<IPoll>(
  {
    question: {
      type: String,
      required: true,
      maxlength: 300,
    },
    options: [PollOptionSchema],
    allowMultipleChoices: {
      type: Boolean,
      default: false,
    },
    expiresAt: Date,
    totalVotes: {
      type: Number,
      default: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    hasVoted: {
      type: Boolean,
      default: false,
    },
    selectedOptionId: {
      type: String,
      default: "",
    },
  },
  { _id: false }
);

const EngagementStatsSchema = new Schema<IEngagementStats>(
  {
    views: {
      type: Number,
      default: 0,
    },
    viewerIds: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    totalReactions: {
      type: Number,
      default: 0,
    },
    commentCount: {
      type: Number,
      default: 0,
    },
    shares: {
      type: Number,
      default: 0,
    },
    sharerIds: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    saves: {
      type: Number,
      default: 0,
    },
    saverIds: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    reposts: {
      type: Number,
      default: 0,
    },
    reposterIds: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    totalFlagVote: {
      type: Number,
      default: 0,
    },
    leadingFlag: {
      type: String,
      default: "",
    },
  },
  { _id: false }
);

// Main Post Schema
const PostSchema = new Schema<IPost>(
  {
    // Basic Post Information
    authorId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    postType: {
      type: String,
      enum: ["regular", "woman"],
      required: true,
      index: true,
    },

    // Content
    content: {
      type: TextContentSchema,
      required: true,
    },
    media: [MediaItemSchema],
    poll: PollSchema,

    personName: String,
    personLocation: String,

    // Engagement and Interactions
    engagement: {
      type: EngagementStatsSchema,
      default: () => ({}),
    },


    // Moderation and Safety
    isReported: {
      type: Boolean,
      default: false,
      index: true,
    },
    reportCount: {
      type: Number,
      default: 0,
    },

    // Post State
    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },
    isDraft: {
      type: Boolean,
      default: false,
      index: true,
    },
    isEdited: {
      type: Boolean,
      default: false,
    },
    editHistory: [
      {
        editedAt: {
          type: Date,
          default: Date.now,
        },
        previousContent: String,
        editReason: String,
      },
    ],

    // Timestamps
    publishedAt: Date,
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes for performance
PostSchema.index({ authorId: 1, createdAt: -1 }); // User's posts timeline
PostSchema.index({ postType: 1, createdAt: -1 }); // Posts by type

// Methods
PostSchema.methods.reactToPost = async function (
  user: IUser,
  reactionType: string,
  emoji: string
) {
  const reactionExist = await Reaction.findOne({
    postId: this._id,
    userId: user._id,
  });
  if (reactionExist) {
    if (reactionExist.type === reactionType) {
      await reactionExist.deleteOne();
      this.engagement.totalReactions = Math.max(
        0,
        this.engagement.totalReactions - 1
      );
      return await this.save();
    }
  }
  const reaction = new Reaction({
    postId: this._id,
    userId: user._id,
    type: reactionType,
    emoji,
  });
  await reaction.save();
  this.engagement.totalReactions = Math.max(
    0,
    this.engagement.totalReactions + 1
  );
  return await this.save();
};

PostSchema.methods.deleteReaction = async function (userId: Types.ObjectId) {
  const reactionExist = await Reaction.findOne({
    postId: this._id,
    userId: userId,
  });

  if (reactionExist) {
    await reactionExist.deleteOne();
    this.engagement.totalReactions = Math.max(
      0,
      this.engagement.totalReactions - 1
    );
  }
  return this.save();
};

PostSchema.methods.incrementViews = function (userId?: Types.ObjectId) {
  this.engagement.views++;

  if (userId && !this.engagement.viewerIds.includes(userId)) {
    this.engagement.viewerIds.push(userId);
  }

  return this.save();
};

// Create the model
const Post = mongoose.model<IPost>("Post", PostSchema);
export { Post };
