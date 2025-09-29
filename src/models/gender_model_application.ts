
import mongoose, { Schema, Document } from "mongoose";


export interface IGenderApplication extends Document {
  applicant: mongoose.Types.ObjectId;
  note?: string;
  attachment: string;
  status: "pending" | "approved" | "rejected";
  reviewedBy?: mongoose.Types.ObjectId;
  reviewedAt?: Date;
  decisionReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

const GenderApplicationSchema: Schema<IGenderApplication> = new Schema(
  {
    applicant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    note: { type: String },
    attachment: { type: String },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
      index: true,
    },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    reviewedAt: { type: Date },
    decisionReason: { type: String },
  },
  { timestamps: true }
);

// Helpful indexes for querying by applicant and recency
GenderApplicationSchema.index({ applicant: 1, createdAt: -1 });

const GenderApplicationModel = mongoose.model<IGenderApplication>(
  "GenderApplication",
  GenderApplicationSchema
);

export default GenderApplicationModel;