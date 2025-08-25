import { Document } from "mongoose";

export interface IUser extends Document {
  displayName: string;
  email: string;
  phone: string;
  role: string;
  avatar: string;
  oneSignalId: string;
  bio: string;
  dateOfBirth: Date;
  accountStatus: "active" | "inactive" | "banned" | "suspended";
  isProfileCompleted: boolean;
  isPhoneVerified: boolean;
}
