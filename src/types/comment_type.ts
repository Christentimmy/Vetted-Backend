import { Document, Types } from 'mongoose';
import { IUser } from './user_type';
import { IReaction } from './reaction_type';

export interface IComment extends Document {
    postId: Types.ObjectId;
    replyCount: number;
    parentId?: Types.ObjectId;
    authorId: Types.ObjectId;
    content: string;
    reaction: IReaction;
    clientId?: string;
    reactionCount: number;
    isDeleted: boolean;
    isPinned: boolean;
    createdAt: Date;
    updatedAt: Date;
    emoji: string;


    reactToComment: (user: IUser, reactionType: string, emoji: string) => Promise<IComment>;
}