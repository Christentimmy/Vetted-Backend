import mongoose from "mongoose";
import { IUser } from "../types/user_type";

const userSchema = new mongoose.Schema<IUser>({
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
  role: { type: String, enum: ["user", "admin"], default: "user" },
  avatar: { type: String },
  oneSignalId: { type: String },
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
});

const UserModel = mongoose.model<IUser>("User", userSchema);

export default UserModel;
