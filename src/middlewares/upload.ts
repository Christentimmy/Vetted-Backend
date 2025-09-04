import cloudinary from "../config/cloudinary";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import multer from "multer";

const profileStorage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => ({
    folder: "profile_pictures",
    format: "png",
    public_id: file.originalname.split(".")[0],
  }),
});

const uploadProfile = multer({
  limits: {
    fileSize: 3 * 1024 * 1024,
  },
  storage: profileStorage,
});


const postMediaStorage = new CloudinaryStorage({
  cloudinary,
  params: async (req: Request, file: Express.Multer.File) => {
    return {
      folder: "post_media",
      public_id: `${Date.now()}-${file.originalname.split(".")[0]}`,
      resource_type: "auto",
    };
  },
});

const uploadPostMedia = multer({
  limits: {
    fileSize: 40 * 1024 * 1024,
  },
  storage: postMediaStorage,
});

export { uploadProfile, uploadPostMedia };
