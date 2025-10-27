import express from "express";
import { appServiceController } from "../controllers/app_service_controller";
import { searchMedia } from "../middlewares/upload";
import { proChecker } from "../middlewares/pro_checker";

import tokenValidationMiddleware  from "../middlewares/token_validator";
import { statusChecker } from "../middlewares/status_middleware";


const router = express.Router();

//TODO: All twilio will be shut down
//TODO: All Zenserp will be shut down
//TODO: All WhitePage will be shut down

router.use(tokenValidationMiddleware, statusChecker, proChecker);

//enformion
router.post("/enformion-background-search", appServiceController.enformionBackgroundSearch);
router.post("/enformion-criminal-search", appServiceController.enformionCrimeRecord);
router.post("/enformion-number-search", appServiceController.enformionCallerId);

//whitepage
router.post("/name-lookup", appServiceController.nameLookup);

//crimeometer
// router.get("/get-sex-offenders", appServiceController.getSexOffendersByLocation);
// router.get("/get-sex-offender-by-name", appServiceController.getSexOffenderByName);

//offenders.io
router.post("/search-offender", appServiceController.searchOffender);

//google image
router.post("/google-image-search", searchMedia.single("file"), appServiceController.googleImageSearch);
router.post("/tineye-image-search", searchMedia.single("file"), 
appServiceController.tinEyeImageSearch);

export default router;
