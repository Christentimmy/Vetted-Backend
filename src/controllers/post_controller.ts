import { Request, Response } from "express";
import { PostDataService } from "../services/post_data_service";
import { PostBuilderService } from "../services/post_builder_service";
import { Post } from "../models/post_model";
import mongoose from "mongoose";
import { Vote } from "../models/vote_model";
import { Follow } from "../models/follow";
import User from "../models/user_model";
import { NotificationType, sendPushNotification } from "../config/onesignal";

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

  toggleFollow: async (req: Request, res: Response) => {
    try {
      if (!req.body) {
        return res.status(400).json({ message: "No follow data provided" });
      }

      const userId = res.locals.userId; // ← The actor (follower)
      const { followId } = req.body; // ← The receiver (followed)

      if (!followId) {
        return res.status(400).json({ message: "Follow ID is required" });
      }

      if (followId === userId) {
        return res.status(400).json({ message: "Cannot follow yourself" });
      }

      const follow = await Follow.findOne({
        follower: userId,
        following: followId,
      });

      if (follow) {
        await follow.deleteOne();
        return res.status(200).json({ message: "Unfollowed" });
      } else {
        await Follow.create({ follower: userId, following: followId });

        const receiver = await User.findById(followId);

        if (!receiver) {
          res.status(404).json({ message: "User not found" });
          return;
        }

        if (receiver.oneSignalPlayerId) {
          await sendPushNotification(
            receiver._id.toString(),
            receiver.oneSignalPlayerId,
            NotificationType.FOLLOW,
            `${res.locals.user.displayName} started following you.`,
            `/profile/${userId}`
          );
        }

        return res.status(200).json({ message: "Followed" });
      }
    } catch (error) {
      console.error("Error toggling follow:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  },
};
