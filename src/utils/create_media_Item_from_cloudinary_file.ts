import { IMediaItem } from "../types/post_type";
import { ICloudinaryFile } from "./cloudinary_types";
import cloudinary from "../config/cloudinary";

const createMediaItemFromCloudinaryFile = (
  file: ICloudinaryFile
): IMediaItem => {
  const resourceType = file.mimetype.startsWith("video/")
    ? "video"
    : file.mimetype.startsWith("audio/")
      ? "audio"
      : "image";

  const url = file.path;
  const size = file.size;

  // Populate the dimensions and duration fields
  const dimensions =
    file.width && file.height
      ? { width: file.width, height: file.height }
      : undefined;
  const duration = file.duration;

  // Populate metadata
  const metadata = {
    format: file.format,
    quality: undefined,
    isProcessed: true,
  };

  // Create a thumbnailUrl for videos if needed
  // const thumbnailUrl =
  //   resourceType === "video"
  //     ? `${file.path.split(".").slice(0, -1).join(".")}.jpg`
  //     : undefined;

  const thumbnailUrl =
    resourceType === "video"
      ? cloudinary.url(file.filename, {
          resource_type: "video",
          format: "jpg",
          transformation: [{ width: 300, height: 300, crop: "fill" }],
        })
      : undefined;

  return {
    type: resourceType,
    url: url,
    thumbnailUrl: thumbnailUrl,
    duration: duration,
    size: size,
    dimensions: dimensions,
    metadata: metadata,
  };
};

export default createMediaItemFromCloudinaryFile;
