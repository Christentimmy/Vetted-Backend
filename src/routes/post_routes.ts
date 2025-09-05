

import express from "express";
import { postController } from "../controllers/post_controller";
const router = express.Router();
import tokenValidationMiddleware from "../middlewares/token_validator";
import { statusChecker } from "../middlewares/status_middleware";
import { uploadPostMedia } from "../middlewares/upload";

router.use(tokenValidationMiddleware);
router.use(statusChecker);

router.post("/create", uploadPostMedia.array("mediaFiles", 10), postController.createPost);
router.get("/feed", postController.getFeed);
router.post("/vote-on-woman", postController.voteOnWoman);
router.post("/comment-on-post", postController.commentOnPost);

router.patch("/react-to-post", postController.reactToPost);
router.patch("/delete-post-reaction", postController.deletePostReaction);

router.patch("/react-to-comment", postController.reactToComment);
router.get("/get-all-comments", postController.getAllComments);

router.post("/reply-to-comment", postController.replyToComment);
router.get("/get-all-comment-replies", postController.getAllCommentReplies);

router.delete("/delete-comment", postController.deleteComment);

router.post("/vote-on-poll", postController.voteOnPoll);
router.delete("/delete-post", postController.deletePost);

export default router;



