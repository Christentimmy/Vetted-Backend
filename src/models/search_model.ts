import mongoose, { Schema, Document } from 'mongoose';
import { ISearchLog } from '../types/search_type';

const searchLogSchema = new Schema<ISearchLog>({
  userId: { 
    type: Schema.Types.ObjectId, 
    ref: 'User',
    index: true 
  },
  searchType: { 
    type: String,
    required: true,
    enum: ['phone', 'name', 'sex_offender', 'location', 'other' , 'image'],
    index: true
  },
  query: { 
    type: Schema.Types.Mixed,
    required: true 
  },
  resultCount: {
    type: Number,
    required: true
  },
  ipAddress: String,
  userAgent: String
}, {
  timestamps: true
});

// Index for frequently queried fields
searchLogSchema.index({ createdAt: -1 });
searchLogSchema.index({ searchType: 1, createdAt: -1 });

export default mongoose.model<ISearchLog>('SearchLog', searchLogSchema);