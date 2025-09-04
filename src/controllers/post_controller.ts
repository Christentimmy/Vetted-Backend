import { Request, Response } from "express";
import { PostDataService } from "../services/post_data_service";
import { PostBuilderService } from "../services/post_builder_service";
import { Post } from "../models/post_model";

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
      
      const { text, poll } = req.body;
      const files = req.files as Express.Multer.File[];

      const user = res.locals.user;

      if (!text && !req.files?.length && !poll) {
        res
          .status(400)
          .json({ message: "Post must contain text, media, poll" });
        return;
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
};
