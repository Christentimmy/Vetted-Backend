import { Schema, model } from 'mongoose';
import { IReaction } from '../types/reaction_type';

const reactionSchema = new Schema<IReaction>({
  postId: { 
    type: Schema.Types.ObjectId, 
    ref: 'Post',
    index: true,
  },
  commentId: { 
    type: Schema.Types.ObjectId, 
    ref: 'Comment',
    index: true,
  },
  userId: { 
    type: Schema.Types.ObjectId, 
    ref: 'User',
    index: true,
    required: true 
  },
  type: { 
    type: String, 
    enum: ['like', 'love', 'laugh', 'wow', 'sad', 'angry'],
    required: true 
  },
  emoji: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
}, { timestamps: true });

// Compound index to ensure one reaction type per user per post
reactionSchema.index({ postId: 1, commentId: 1, userId: 1 }, { unique: true });

export const Reaction = model<IReaction>('Reaction', reactionSchema);