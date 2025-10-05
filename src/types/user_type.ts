import  { Document, Types } from "mongoose";

export interface IUser extends Document {
  _id: Types.ObjectId;
  displayName: string;
  email: string;
  phone: string;
  avatar: string;
  password: string;
  bio: string;
  dateOfBirth: Date;
  accountStatus: "active" | "inactive" | "banned" | "suspended";
  isProfileCompleted: boolean;
  isPhoneVerified: boolean;
  relationshipStatus:
    | "single"
    | "in a relationship"
    | "engaged"
    | "married"
    | "deparated"
    | "divorced"
    | "widowed";
  location?: {
    type: "Point";
    address: string;
    coordinates: [number, number]; // [lng, lat]
  };
  oneSignalPlayerId: string;
  stripeCustomerId?: string;
  role: "user" | "admin" | "super_admin";
  subscription?: {
    planId?: string;
    status?: "active" | "canceled" | "past_due" | "unpaid" | "incomplete" | "none";
    currentPeriodEnd?: Date;
    cancelAtPeriodEnd?: boolean;
  };

  inviteCode: string,
  invitedBy: Types.ObjectId,
  premiumCredits: number,
  premiumExpiresAt: Date,
  totalInvites: number,

  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}
