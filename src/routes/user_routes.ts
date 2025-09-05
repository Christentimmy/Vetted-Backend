

import express from "express";
import { userController } from "../controllers/user_controller";
import { uploadProfile } from "../middlewares/upload";
import tokenValidationMiddleware  from "../middlewares/token_validator";

const router = express.Router();

router.use(tokenValidationMiddleware);

router.post("/update-name", userController.updateName);
router.post("/update-dob", userController.updateDob);
router.post("/update-location", userController.updateLocation);
router.post("/upload-profile-picture", uploadProfile.single("avatar"), userController.uploadProfilePicture);
router.patch("/update-relation-status", userController.updateRelationStatus);
router.patch("/selfie-verified", userController.profileVerified);
router.patch("/toggle-follow", userController.toggleFollow);


export default router;
