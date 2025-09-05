import mongoose, { Schema, Document } from 'mongoose';

export interface IVotePoll extends Document {
    postId: mongoose.Types.ObjectId;
    userId: mongoose.Types.ObjectId;
    optionId: string;
    createdAt: Date;
    updatedAt: Date;
}


const VotePollSchema: Schema<IVotePoll> = new Schema<IVotePoll>(
    {
        postId: {
            type: Schema.Types.ObjectId,
            ref: 'Post',
            required: true,
        },
        userId: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        optionId: { type: String },
    },
    {
        timestamps: true,
    }
);

VotePollSchema.index({ postId: 1, userId: 1 }, { unique: true });
VotePollSchema.index({ postId: 1, optionId: 1 });


export default mongoose.model<IVotePoll>('VotePoll', VotePollSchema);
