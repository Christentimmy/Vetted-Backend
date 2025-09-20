import mongoose, { Document } from 'mongoose';

export interface IAlert extends Document {
  userId: mongoose.Types.ObjectId;
  name: string; 
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}