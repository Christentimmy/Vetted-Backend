import mongoose, { Schema, Document } from "mongoose";

export interface IReport extends Document {
  reporter: mongoose.Types.ObjectId; 
  reportedUser: mongoose.Types.ObjectId; 
  description?: string;
  type: "profile" | "message" | "story" | "other" | "post";
  referenceId?: mongoose.Types.ObjectId;
  createdAt: Date;
  status: "pending" | "reviewed" | "dismissed" | "action_taken";
  reviewedBy?: mongoose.Types.ObjectId;
  reviewedAt?: Date;
}


const ReportSchema: Schema<IReport> = new Schema(
  {
    reporter: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    reportedUser: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    description: { type: String },
    type: {
      type: String,
      enum: ["profile", "message", "story", "other", "post"],
      required: true,
    },
    referenceId: { type: mongoose.Schema.Types.ObjectId }, 
    status: {
      type: String,
      enum: ["pending", "reviewed", "dismissed", "action_taken"],
      default: "pending",
    },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    reviewedAt: { type: Date },
  },
  { timestamps: { createdAt: "createdAt", updatedAt: false } }
);

export default mongoose.model<IReport>("Report", ReportSchema);