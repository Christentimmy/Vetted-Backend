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
  title: string;
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
}

export interface IPoll {
  question: string;
  options: IPollOption[];
  allowMultipleChoices: boolean;
  expiresAt?: Date;
  totalVotes: number;
  isActive: boolean;
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
  totalFlagVote: number;
  leadingFlag: string;
  greenVotes: number;
  redVotes: number;
}



// Main Post Interface
export interface IPost extends Document {
  // Basic Post Information
  _id: Types.ObjectId;
  authorId: Types.ObjectId;
  postType: "regular" | "woman";

  // Content
  content: ITextContent;
  media: IMediaItem[];
  poll?: IPoll;

  personName: string;
  personAge: string;
  personLocation: string;

  // Engagement and Interactions
  engagement: IEngagementStats;

  // Moderation and Safety
  isReported: boolean;
  reportCount: number;

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

  reactToPost: (user: IUser, reactionType: string, emoji: string) => Promise<IPost>;
  deleteReaction: (userId: Types.ObjectId) => Promise<IPost>;

}

export type PostCapabilities = {
  canWriteText: boolean;
  canAddPhotos: boolean;
  canAddVideos: boolean;
  canAddMusic: boolean;
};
