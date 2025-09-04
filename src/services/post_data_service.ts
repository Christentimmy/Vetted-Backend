import { IPoll, IPollOption } from "../types/post_type";
import { v4 as uuidv4 } from "uuid";
import createMediaItemFromCloudinaryFile from "../utils/create_media_Item_from_cloudinary_file";


export class PostDataService {
  static async processPoll(poll: any): Promise<IPoll | undefined> {
    if (!poll) return undefined;

    if (typeof poll === "string") {
      poll = JSON.parse(poll);
    }

    const { question, options, allowMultipleChoices, expiresAt } = poll;

    if (!question || !Array.isArray(options) || options.length < 2) {
      throw new Error("Poll must have a question and at least 2 options");
    }

    const mappedOptions: IPollOption[] = options.map((opt: string) => ({
      id: uuidv4(),
      text: opt,
      voteCount: 0,
      voters: [],
    }));

    const result: IPoll = {
      question: question.trim(),
      options: mappedOptions,
      allowMultipleChoices: !!allowMultipleChoices,
      totalVotes: 0,
      isActive: true,
    };

    // Only add expiresAt if it exists
    if (expiresAt) {
      result.expiresAt = new Date(expiresAt);
    }

    return result;
  }

  static async processContent(text: string, files: Express.Multer.File[]) {
    const mediaItems = files?.map(createMediaItemFromCloudinaryFile) || [];

    return {
      mediaItems,
    };
  }
}
