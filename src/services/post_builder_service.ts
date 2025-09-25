import { IUser } from "../types/user_type";
import { IPoll } from "../types/post_type";
import { IMediaItem } from "../types/post_type";
import { Reaction } from "../models/reaction_model";
import { Follow } from "../models/follow";
import { Vote } from "../models/vote_model";
import SavedPost from "../models/saved_post_model";

export class PostBuilderService {
  
  static buildPostData(params: {
    user: IUser;
    processedPoll: IPoll | undefined;
    mediaItems: IMediaItem[];
    requestBody: any;
  }) {
    const { user, processedPoll, mediaItems, requestBody } = params;

    const {
      title,
      text,
      formatting,
      postType = "regular",
      personName,
      personAge,
      personLocation,
    } = requestBody;

    return {
      authorId: user._id,
      postType,

      // Content
      content: {
        title: title || "",
        text: text || "",
        formatting: {
          alignment: formatting?.alignment || "left",
          isBold: formatting?.isBold || false,
          font: formatting?.font,
        },
      },
      media: mediaItems,
      poll: processedPoll
        ? {
            ...processedPoll,
            isActive: true,
            totalVotes: 0,
            options: processedPoll.options?.map((option: any) => ({
              ...option,
              voteCount: 0,
              voters: [],
            })),
          }
        : undefined,

      personName,
      personAge,
      personLocation,

      // State
      isDraft: false,
      isDeleted: false,
      isEdited: false,
      publishedAt: new Date(),
      lastEngagementAt: new Date(),
    };
  }

  static async formatPostResponse(post: any, userId: string) {
    let reactedEmoji: any;
    let totalReaction: any;
    let isFollowing: any;
    let hasVoted: any;

    [reactedEmoji, totalReaction, isFollowing, hasVoted] = await Promise.all([
      Reaction.findOne({ postId: post._id, userId: userId }) || null,
      Reaction.countDocuments({ postId: post._id }),
      Follow.exists({
        follower: userId,
        following: post.authorId._id.toString(),
      }),
      Vote.findOne({ userId, postId: post._id }),
    ]);
    const savedPost = await SavedPost.findOne({ userId, postId: post._id });
    const isSaved = savedPost !== null;
    // const savedCounts = await SavedPost.countDocuments({ postId: post._id });

    const response: any = {
      id: post._id,
      content: post.content,
      media: post.media,
      poll: post.poll,
      postType: post.postType,
      author: {
        id: post.authorId._id,
        displayName: post.authorId.displayName || null,
        avatar: post.authorId.avatar || null,
      },
      personName: post.personName,
      personAge: post.personAge,
      personLocation: post.personLocation,
      stats: {
        reactionCount: totalReaction,
        comments: post.engagement.commentCount,
        // reposts: post.engagement.reposts,
        // shares: post.engagement.shares,
        views: post.engagement.views,
        totalFlagVote: post.engagement.totalFlagVote,
        leadingFlag: post.engagement.leadingFlag,
        greenVotes: post.engagement.greenVotes,
        redVotes: post.engagement.redVotes,
        // saves: savedCounts,
      },
      isFollowing: !!isFollowing,
      createdAt: post.createdAt,
      // updatedAt: post.updatedAt,
      // isDeleted: post.isDeleted||false,
      reactedEmoji: reactedEmoji?.emoji || null,
      hasVoted: !!hasVoted,
      votedColor: hasVoted?.color || null,
      isBookmarked: isSaved,
      // isExplicitContent: post.isExplicitContent,
      // ageRestrictedContent: post.ageRestrictedContent,
    };

    return response;
  }
}
