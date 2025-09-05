import { Request, Response } from "express";
import { PostDataService } from "../services/post_data_service";
import { PostBuilderService } from "../services/post_builder_service";
import { Post } from "../models/post_model";
import mongoose from "mongoose";
import { Vote } from "../models/vote_model";
import Comment from "../models/comment_model";
import { IUser } from "../types/user_type";
import { NotificationType, sendPushNotification } from "../config/onesignal";
import User from "../models/user_model";
import { Reaction } from "../models/reaction_model";
import { IPollOption } from "../types/post_type";
import VotePoll from "../models/votepoll_model";

const isValidObjectId = mongoose.Types.ObjectId.isValid;

export const postController = {
  createPost: async (req: Request, res: Response) => {
    try {
      const userId = res.locals.userId;
      if (!userId) {
        res.status(401).json({ message: "Authentication required" });
        return;
      }
      if (!req.body || typeof req.body !== "object") {
        res.status(400).json({ message: "Missing request body" });
        return;
      }

      const { text, poll, postType } = req.body;
      const files = req.files as Express.Multer.File[];

      const user = res.locals.user;

      if (!text && !req.files?.length && !poll) {
        res
          .status(400)
          .json({ message: "Post must contain text, media, poll" });
        return;
      }

      if (postType !== "woman" && postType !== "regular") {
        return res.status(400).json({ message: "Invalid post type" });
      }

      if (postType === "woman") {
        if (!req.body.personName || !req.body.personLocation) {
          return res.status(400).json({
            message: "Person name and location are required for woman posts",
          });
        }
      }

      // Process poll and content in parallel
      const [processedPoll, contentData] = await Promise.all([
        PostDataService.processPoll(req.body.poll),
        PostDataService.processContent(req.body.text, files),
      ]);

      const { mediaItems } = contentData;

      const postData = PostBuilderService.buildPostData({
        user,
        processedPoll,
        mediaItems,
        requestBody: req.body,
      });

      const newPost = new Post(postData);
      await newPost.save();

      res.status(201).json({ message: "Post created successfully" });
    } catch (error) {
      console.log(error);
      res.status(500).json({ message: "Internal server error" });
    }
  },

  getFeed: async (req: Request, res: Response) => {
    try {
      const user = res.locals.user;
      const { type = "woman", page = 1, limit = 20 } = req.query;

      if (!user) {
        return res.status(401).json({ message: "Authentication required" });
      }
      if (type !== "woman" && type !== "regular") {
        return res.status(400).json({ message: "Invalid post type" });
      }

      const pageNum = parseInt(page as string) || 1;
      const limitNum = parseInt(limit as string) || 20;

      const feedData = await PostDataService.getFeed(
        user,
        pageNum,
        limitNum,
        type
      );

      if (!feedData) {
        return res.status(404).json({ message: "Feed not found" });
      }

      // Format posts
      const formattedPosts = await Promise.all(
        feedData.posts.map((post) =>
          PostBuilderService.formatPostResponse(post, user._id.toString())
        )
      );

      return res.status(200).json({
        message: "Feed fetched successfully",
        data: {
          posts: formattedPosts,
          pagination: feedData.pagination,
        },
      });
    } catch (error) {
      console.error("Error fetching feed:", error);
      const message =
        error instanceof Error ? error.message : "Internal server error";
      return res.status(500).json({ message });
    }
  },

  voteOnWoman: async (req: Request, res: Response) => {
    try {
      const userId = res.locals.userId;
      const { postId, color } = req.body;

      if (!userId) return res.status(401).json({ message: "Unauthorized" });
      if (!postId || !["red", "green"].includes(color)) {
        return res.status(400).json({ message: "Invalid postId or color" });
      }
      if (!isValidObjectId(postId)) {
        return res.status(400).json({ message: "Invalid postId" });
      }

      // Check if post exists
      const post = await Post.findById(postId);
      if (!post) return res.status(404).json({ message: "Post not found" });

      // Check if user already voted
      const existingVote = await Vote.findOne({ userId, postId });
      if (existingVote) {
        return res.status(409).json({ message: "You already voted" });
      }

      // Save vote in Vote collection
      await Vote.create({ userId, postId, color });

      // Update aggregated stats in Post
      post.engagement.totalFlagVote++;
      if (color === "red") post.engagement.redVotes++;
      else post.engagement.greenVotes++;

      post.engagement.leadingFlag =
        post.engagement.redVotes > post.engagement.greenVotes ? "red" : "green";

      await post.save();

      res.status(200).json({ message: "Vote cast successfully" });
    } catch (error) {
      console.error("Error casting vote:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  },

  commentOnPost: async (req: Request, res: Response) => {
    try {
      if (!req.body) {
        return res.status(400).json({ message: "No comment data provided" });
      }
      const { text, postId, clientId } = req.body;
      const user = res.locals.user;

      if (!user) {
        return res.status(401).json({ message: "Authentication required" });
      }

      if (!postId || !text) {
        return res
          .status(400)
          .json({ message: "Post ID and text are required" });
      }

      const post = await Post.findById(postId).populate<{ authorId: IUser }>(
        "authorId"
      );
      if (!post) {
        res.status(404).json({ message: "Post not found" });
        return;
      }

      const comment = new Comment({
        postId,
        authorId: res.locals.userId,
        content: text,
        clientId,
      });

      await comment.save();

      post.engagement.commentCount++;
      await post.save();

      if (post.authorId.oneSignalPlayerId) {
        await sendPushNotification(
          post.authorId._id.toString(),
          post.authorId.oneSignalPlayerId,
          NotificationType.COMMENT,
          `${user.displayName} commented on your post`,
          `/post/${postId}`
        );
      }

      return res
        .status(200)
        .json({ message: "Comment added successfully", data: comment });
    } catch (error) {
      console.error("Error commenting on post:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  },

  reactToPost: async (req: Request, res: Response) => {
    try {
      if (!req.body) {
        return res.status(400).json({ message: "No reaction data provided" });
      }
      const { postId, reactionType, emoji } = req.body;
      const user: IUser = res.locals.user;

      // Validate required fields
      if (!postId || !reactionType || !emoji) {
        return res
          .status(400)
          .json({ message: "Post ID, reaction type, and emoji are required" });
      }

      // Validate reaction type
      const validReactionTypes = [
        "like",
        "love",
        "laugh",
        "wow",
        "sad",
        "angry",
      ];
      if (!validReactionTypes.includes(reactionType)) {
        return res.status(400).json({ message: "Invalid reaction type" });
      }

      const post = await Post.findById(postId).populate<{ authorId: IUser }>(
        "authorId"
      );
      if (!post) {
        return res.status(404).json({ message: "Post not found" });
      }

      await post.reactToPost(user, reactionType, emoji);
      res.status(200).json({ message: "Reaction updated successfully" });

      if (post.authorId.oneSignalPlayerId) {
        await sendPushNotification(
          post.authorId._id.toString(),
          post.authorId.oneSignalPlayerId,
          NotificationType.LIKE,
          `${user.displayName} liked your post`,
          `/post/${postId}`
        );
      }

      return;
    } catch (error) {
      console.error("Error reacting to post:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  },

  deletePostReaction: async (req: Request, res: Response) => {
    try {
      if (!req.body) {
        return res.status(400).json({ message: "No reaction data provided" });
      }
      const { postId } = req.body;
      const user = res.locals.user;
      const post = await Post.findById(postId);
      if (!post) {
        return res.status(404).json({ message: "Post not found" });
      }
      await post.deleteReaction(user._id.toString());

      res.status(200).json({ message: "Reaction deleted successfully" });
    } catch (error) {
      console.error("Error deleting post reaction:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  },

  reactToComment: async (req: Request, res: Response) => {
    try {
      const { postId, commentId, reactionType, emoji } = req.body;
      const user: IUser = res.locals.user;

      // Validate required fields
      if (!postId || !commentId || !reactionType || !emoji) {
        return res.status(400).json({
          message: "Post ID, comment ID, reaction type, and emoji are required",
        });
      }

      // Validate reaction type
      const validReactionTypes = [
        "like",
        "love",
        "laugh",
        "wow",
        "sad",
        "angry",
      ];
      if (!validReactionTypes.includes(reactionType)) {
        return res.status(400).json({ message: "Invalid reaction type" });
      }

      const post = await Post.findById(postId);
      if (!post) {
        return res.status(404).json({ message: "Post not found" });
      }
      const comment = await Comment.findById(commentId);
      if (!comment) {
        return res.status(404).json({ message: "Comment not found" });
      }

      await comment.reactToComment(user, reactionType, emoji);
      return res.status(200).json({ message: "Reaction updated successfully" });
    } catch (error) {
      console.error("Error reacting to post:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  },

  getAllComments: async (req: Request, res: Response) => {
    try {
      const { postId, page = 1, limit = 20 } = req.query;

      const pageNum = parseInt(page as string) || 1;
      const limitNum = parseInt(limit as string) || 20;
      const skip = (pageNum - 1) * limitNum;

      if (!postId) {
        res.status(400).json({ message: "Post ID is required" });
        return;
      }

      const post = await Post.findById(postId);
      if (!post) {
        res.status(404).json({ message: "Post not found" });
        return;
      }

      const comments = await Comment.find({ postId, parentId: null })
        .populate("authorId", "username displayName avatarUrl anonymousId")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean();

      const totalComments = await Comment.countDocuments({ postId });
      const totalPages = Math.ceil(totalComments / limitNum);

      res.status(200).json({
        message: "Comments fetched successfully",
        data: {
          comments,
          pagination: {
            total: totalComments,
            page,
            totalPages,
            hasMore: pageNum * limitNum < totalComments,
          },
        },
      });
      return;
    } catch (error) {
      console.error("Error fetching comments:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  },

  replyToComment: async (req: Request, res: Response) => {
    try {
      if (!req.body) {
        return res.status(400).json({ message: "No comment data provided" });
      }

      const { commentId, text, clientId } = req.body;
      const user = res.locals.user;

      if (!commentId || !text) {
        res.status(400).json({ message: "Comment ID and text are required" });
        return;
      }
      if (!text.trim()) {
        return res.status(400).json({ message: "Reply text cannot be empty" });
      }

      const comment = await Comment.findById(commentId);
      if (!comment) {
        res.status(404).json({ message: "Comment not found" });
        return;
      }

      const parentAuthor = await User.findById(comment.authorId);
      if (!parentAuthor) {
        res.status(404).json({ message: "Parent author not found" });
        return;
      }

      const reply = new Comment({
        postId: comment.postId,
        parentId: comment._id,
        authorId: user._id,
        content: text,
        clientId,
      });
      await reply.save();

      if (parentAuthor.oneSignalPlayerId) {
        await sendPushNotification(
          parentAuthor._id.toString(),
          parentAuthor.oneSignalPlayerId,
          NotificationType.REPLY,
          `${user.displayName} replied to your comment`,
          `/post/${comment.postId}`
        );
      }

      await Post.updateOne(
        { _id: comment.postId },
        { $inc: { commentCount: 1 } }
      );
      await Comment.updateOne(
        { _id: comment._id },
        { $inc: { replyCount: 1 } }
      );

      return res.status(200).json({ message: "Reply added successfully" });
    } catch (error) {
      console.error("Error replying to comment:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  },

  getAllCommentReplies: async (req: Request, res: Response) => {
    try {
      const { parentId, page = 1, limit = 20 } = req.query;

      const pageNum = parseInt(page as string) || 1;
      const limitNum = parseInt(limit as string) || 20;
      const skip = (pageNum - 1) * limitNum;

      if (!parentId) {
        res.status(400).json({ message: "Parent comment ID is required" });
        return;
      }

      const comment = await Comment.findById(parentId);
      if (!comment) {
        res.status(404).json({ message: "Parent comment not found" });
        return;
      }

      const replies = await Comment.find({ parentId: parentId })
        .populate("authorId", "username avatarUrl displayName anonymousId")
        .populate("reaction", "userId type emoji")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean();

      const totalReplies = await Comment.countDocuments({ parentId });
      const totalPages = Math.ceil(totalReplies / limitNum);

      res.status(200).json({
        message: "Comment replies fetched successfully",
        data: {
          replies,
          pagination: {
            total: totalReplies,
            page,
            totalPages,
            hasMore: pageNum * limitNum < totalReplies,
          },
        },
      });
      return;
    } catch (error) {
      console.error("Error fetching comment replies:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  },

  deleteComment: async (req: Request, res: Response) => {
    try {
      const { commentId } = req.body;
      const user: IUser = res.locals.user;

      if (!commentId) {
        return res.status(400).json({ message: "Comment ID is required" });
      }

      const comment = await Comment.findById(commentId);
      if (!comment) {
        return res.status(404).json({ message: "Comment not found" });
      }

      if (comment.authorId.toString() !== user._id.toString()) {
        return res.status(403).json({ message: "Unauthorized" });
      }

      await comment.deleteOne();

      await Post.updateOne(
        { _id: comment.postId },
        { $inc: { commentCount: -1 } }
      );

      if (comment.parentId) {
        await Comment.updateOne(
          { _id: comment.parentId },
          { $inc: { replyCount: -1 } }
        );
      }

      await Reaction.deleteMany({ commentId: comment._id });
      await Comment.deleteMany({ parentId: comment._id });

      return res.status(200).json({ message: "Comment deleted successfully" });
    } catch (error) {
      console.error("Error deleting comment:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  },

  voteOnPoll: async (req: Request, res: Response) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      if (!req.body) {
        return res.status(400).json({ message: "No poll data provided" });
      }
      const { postId, optionId } = req.body;

      const user = res.locals.user;
      if (!postId || !optionId) {
        res.status(400).json({ message: "Post ID and option are required" });
        return;
      }
      const post = await Post.findById(postId);
      if (!post) {
        res.status(404).json({ message: "Post not found" });
        return;
      }
      if (!post.poll) {
        res.status(400).json({ message: "Post is not a poll" });
        return;
      }

      const poll = post.poll;
      const optionIndex = poll.options.findIndex(
        (opt: IPollOption) => opt.id.toString() === optionId
      );
      if (optionIndex === -1) {
        res.status(400).json({ message: "Invalid option" });
        return;
      }
      if (!poll.allowMultipleChoices) {
        const hasVoted = await VotePoll.findOne({ postId, userId: user._id });
        if (hasVoted) {
          res.status(400).json({ message: "You have already voted" });
          return;
        }
      }

      await VotePoll.create({ postId, userId: user._id, optionId });

      poll.options[optionIndex].voteCount++;
      poll.totalVotes++;
      poll.hasVoted = true;
      poll.selectedOptionId = optionId;
      await post.save();

      await session.commitTransaction();
      session.endSession();

      res.status(200).json({ message: "Vote cast successfully" });
    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      console.error("Error voting on poll:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  },

  deletePost: async (req: Request, res: Response) => {
    try {
      if (!req.body) {
        return res.status(400).json({ message: "No post data provided" });
      }
      const { postId } = req.body;
      const user: IUser = res.locals.user;

      if (!postId) {
        return res.status(400).json({ message: "Post ID is required" });
      }

      const post = await Post.findById(postId);
      if (!post) {
        return res.status(404).json({ message: "Post not found" });
      }

      if (post.authorId.toString() !== user._id.toString()) {
        return res.status(403).json({ message: "Unauthorized" });
      }

      await Comment.deleteMany({ postId });
      await Reaction.deleteMany({ postId });
      await VotePoll.deleteMany({ postId });
      await Post.updateMany(
        { originalPostId: postId },
        { $set: { isDeleted: true } }
      );

      post.isDeleted = true;
      await post.save();

      return res.status(200).json({ message: "Post deleted successfully" });
    } catch (error) {
      console.error("Error deleting post:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  },
  
};
