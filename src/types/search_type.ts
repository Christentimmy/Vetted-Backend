import mongoose, {  Document } from 'mongoose';

export interface ISearchLog extends Document {
  userId: mongoose.Types.ObjectId;
  searchType: 'phone' | 'name' | 'sex_offender' | 'location' | 'other';
  query: any; 
  resultCount: number;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
}