
import express from "express";
import { userController } from "../controllers/user_controller";
import { uploadProfile } from "../middlewares/upload";
import tokenValidationMiddleware  from "../middlewares/token_validator";
import { statusChecker } from "../middlewares/status_middleware";
import { reportController } from "../controllers/report_controller";


const router = express.Router();

router.use(tokenValidationMiddleware);

router.post("/update-name", userController.updateName);
router.post("/update-dob", userController.updateDob);
router.post("/update-location", userController.updateLocation);
router.post("/upload-profile-picture", uploadProfile.single("avatar"), userController.uploadProfilePicture);
router.patch("/update-relation-status", userController.updateRelationStatus);
router.patch("/selfie-verified", userController.profileVerified);

router.get("/get-user-status", userController.getUserStatus);
router.get("/get-user-details", userController.getUserDetails);

router.use(statusChecker);

router.patch("/toggle-follow", userController.toggleFollow);
router.get("/get-notifications", userController.getNotification);
router.patch("/mark-notification-as-read", userController.markNotificationAsRead);

router.patch("/toggle-block", userController.toggleBlock);
router.get("/get-blocked-users", userController.getBlockedUsers);
router.get("/get-my-posts", userController.getMyPost);

router.post('/create-alert', userController.createAlert);
router.get('/get-alerts', userController.getUserAlerts);
router.delete('/delete-alert/:alertId', userController.deleteAlert);

router.post('/create-report', reportController.createReport);


export default router;
