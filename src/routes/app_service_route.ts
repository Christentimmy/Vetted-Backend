import express from "express";
import { appServiceController } from "../controllers/app_service_controller";
import { searchMedia } from "../middlewares/upload";

import tokenValidationMiddleware  from "../middlewares/token_validator";
import { statusChecker } from "../middlewares/status_middleware";

const router = express.Router();

router.use(tokenValidationMiddleware);
router.use(statusChecker);

router.get("/get-number-info", appServiceController.getNumberInfo);
router.post("/reverse-image", searchMedia.single("file"), appServiceController.reverseImage);

export default router;
