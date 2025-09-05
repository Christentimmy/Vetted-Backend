

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

export default router;



