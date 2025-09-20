import mongoose from "mongoose";
import { IUser } from "../types/user_type";

const userSchema = new mongoose.Schema<IUser>(
  {
    displayName: { type: String },
    email: {
      type: String,
      sparse: true,
      index: {
        unique: true,
        partialFilterExpression: { email: { $type: "string" } },
      },
    },
    phone: {
      type: String,
      sparse: true,
      index: {
        unique: true,
        partialFilterExpression: { phone: { $type: "string" } },
      },
    },
    role: { type: String, enum: ["user", "admin", "super_admin"], default: "user" },
    avatar: { type: String },
    bio: {
      type: String,
      maxlength: 500,
      default: "",
    },
    dateOfBirth: {
      type: Date,
    },
    accountStatus: {
      type: String,
      enum: ["active", "inactive", "banned", "suspended"],
      default: "active",
    },

    isPhoneVerified: {
      type: Boolean,
      default: false,
    },
    isProfileCompleted: {
      type: Boolean,
      default: false,
    },
    relationshipStatus: {
      type: String,
      enum: [
        "single",
        "in a relationship",
        "engaged",
        "married",
        "separated",
        "divorced",
        "widowed",
      ],
      default: "single",
    },
    location: {
      type: { type: String, enum: ["Point"], default: "Point" },
      address: { type: String, default: "" },
      coordinates: { type: [Number], default: [0, 0] }, //lng,lat
    },
    oneSignalPlayerId: { type: String },
    stripeCustomerId: { type: String },
    subscription: {
      planId: { type: String },
      status: { type: String, enum: ["active", "canceled", "past_due", "unpaid", "incomplete"], default: "active" },
      currentPeriodEnd: { type: Date },
      cancelAtPeriodEnd: { type: Boolean, default: false },
    },
  },
  {
    timestamps: true,
  }
);

userSchema.index({ location: "2dsphere" });

const UserModel = mongoose.model<IUser>("User", userSchema);

export default UserModel;
