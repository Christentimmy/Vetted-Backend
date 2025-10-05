import express from "express";
import { appServiceController } from "../controllers/app_service_controller";
import { searchMedia } from "../middlewares/upload";

import tokenValidationMiddleware  from "../middlewares/token_validator";
import { statusChecker } from "../middlewares/status_middleware";

const router = express.Router();

//TODO: All twilio will be shut down
//TODO: All Zenserp will be shut down
//TODO: All WhitePage will be shut down


router.use(tokenValidationMiddleware);
router.use(statusChecker);

// router.get("/get-number-info", appServiceController.getNumberInfo);
router.post("/google-image-search", searchMedia.single("file"), appServiceController.googleImageSearch);
// router.post("/zen-image-search", searchMedia.single("file"), appServiceController.zenserpReverseImage);
router.get("/get-sex-offenders", appServiceController.getSexOffendersByLocation);
router.get("/get-sex-offender-by-name", appServiceController.getSexOffenderByName);

// router.get("/phone-lookup", appServiceController.phoneLookup);
// router.post("/name-lookup", appServiceController.nameLookup);

// router.post("/enformion-reverse-number-search", appServiceController.enformionReverseNumberSearch);
router.post("/enformion-number-search", appServiceController.enformionCallerId);
router.post("/enformion-background-search", appServiceController.enformionBackgroundSearch);
router.post("/enformion-criminal-search", appServiceController.enformionCrimeRecord);

export default router;
