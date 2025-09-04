import { Document, Types } from "mongoose";
import { IUser } from "./user_type";

// Media and Content Interfaces
export interface IMediaItem {
  type: "image" | "video" | "audio";
  url: string;
  thumbnailUrl?: string;
  duration?: number; // For video/audio in seconds
  size?: number; // File size in bytes
  dimensions?: {
    width: number;
    height: number;
  };
  metadata?: {
    format?: string | undefined | null;
    quality?: string | undefined | null;
    isProcessed?: boolean;
  };
}

export interface ITextContent {
  text: string;
  formatting?: {
    alignment: "left" | "center" | "right";
    isBold: boolean;
    font?: string;
  };
}

export interface IPollOption {
  id: string;
  text: string;
  voteCount: number;
  // voters: Types.ObjectId[]; // User IDs who voted for this option
}

export interface IPoll {
  question: string;
  options: IPollOption[];
  allowMultipleChoices: boolean;
  expiresAt?: Date;
  totalVotes: number;
  isActive: boolean;
  hasVoted?: boolean;
  selectedOptionId?: string;
}


export interface IEngagementStats {
  views: number;
  viewerIds: Types.ObjectId[];
  totalReactions: number;
  commentCount: number;
  shares: number;
  sharerIds: Types.ObjectId[];
  saves: number;
  saverIds: Types.ObjectId[];
  reposts: number;
  reposterIds: Types.ObjectId[];
}



// Main Post Interface
export interface IPost extends Document {
  // Basic Post Information
  _id: Types.ObjectId;
  authorId: Types.ObjectId;
  postType: "regular" | "ghost" | "confession" | "repost";

  // Content
  content: ITextContent;
  media: IMediaItem[];
  poll?: IPoll;

  // For confession posts - allows custom display name per post
  confessionDisplayName?: string;
  confessionAvatarUrl?: string;

  // For reposts
  originalPostId?: Types.ObjectId;
  // repostComment?: string; // User's comment when reposting
  repostChain?: Types.ObjectId[];
  repostDepth?: number;

  // Engagement and Interactions
  engagement: IEngagementStats;

  hashtags: string[];
  mentionedUsers: Types.ObjectId[];

  // Moderation and Safety
  isReported: boolean;
  reportCount: number;
  moderationStatus: "pending" | "approved" | "flagged" | "removed";
  moderationNotes?: string;
  isExplicitContent: boolean;
  ageRestrictedContent: boolean;

  // Post State
  isDeleted: boolean;
  isDraft: boolean;
  isEdited: boolean;
  editHistory?: Array<{
    editedAt: Date;
    previousContent: string;
    editReason?: string;
  }>;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  publishedAt?: Date; // For scheduled posts
  lastEngagementAt: Date; // For feed algorithm

  reactToPost: (user: IUser, reactionType: string, emoji: string) => Promise<IPost>;
  deleteReaction: (userId: Types.ObjectId) => Promise<IPost>;

}

export type PostCapabilities = {
  canWriteText: boolean;
  canAddPhotos: boolean;
  canAddVideos: boolean;
  canAddMusic: boolean;
};
