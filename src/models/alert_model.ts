import mongoose, { Document, Schema } from 'mongoose';
import { IAlert } from '../types/alert_type';

const alertSchema = new Schema<IAlert>({
  userId: { 
    type: Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  name: { 
    type: String, 
    required: true,
    trim: true,
    lowercase: true
  },
  isActive: { 
    type: Boolean, 
    default: true 
  }
}, {
  timestamps: true
});

// Add index for faster lookups
alertSchema.index({ userId: 1, name: 1 }, { unique: true });

export default mongoose.model<IAlert>('Alert', alertSchema);