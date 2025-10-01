import { IPoll, IPollOption } from "../types/post_type";
import { v4 as uuidv4 } from "uuid";
import createMediaItemFromCloudinaryFile from "../utils/create_media_Item_from_cloudinary_file";
import { Post } from "../models/post_model";
import { IUser } from "../types/user_type";

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

  static async processMedia(files: Express.Multer.File[]) {
    const mediaItems = files?.map(createMediaItemFromCloudinaryFile) || [];

    return {
      mediaItems,
    };
  }

  static async getFeed(
    user: IUser,
    page: number = 1,
    limit: number = 20,
    type: string,
    filters?: {
      personName?: string;
      ageRange?: [number, number];
      personLocation?: string;
      sort?: "newest" | "oldest";
      leadingFlag?: "green" | "red";
    }
  ) {
    const skip = (page - 1) * limit;

    // Build $match query - we'll handle viewed posts in the pipeline
    const matchStage: any = {
      isDeleted: false,
      isDraft: false,
      postType: type,
    };

    // Determine sort order
    const sortStage = { createdAt: filters?.sort === "oldest" ? 1 : -1 } as const;

    // Aggregation pipeline
    const pipeline: any[] = [
      { $match: matchStage },

      //lookup-to-check-if-post-author-is-blocked-by-user
      {
        $lookup: {
          from: "blocks",
          let: { postAuthor: "$authorId" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$blocker", user._id] }, // current user is the blocker
                    { $eq: ["$blocked", "$$postAuthor"] }, // post author is blocked
                  ],
                },
              },
            },
          ],
          as: "blockedDocs",
        },
      },
      {
        $match: {
          blockedDocs: { $size: 0 }, // exclude if a block relation exists
        },
      },

      // Lookup to check if post has been viewed by this user
      {
        $lookup: {
          from: "postviewers",
          let: { postId: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$postId", "$$postId"] },
                    { $eq: ["$userId", user._id] },
                  ],
                },
              },
            },
          ],
          as: "viewerDocs",
        },
      },

      // Filter out posts that have been viewed
      {
        $match: {
          viewerDocs: { $size: 0 },
        },
      },

      // Join author details
      {
        $lookup: {
          from: "users",
          localField: "authorId",
          foreignField: "_id",
          as: "author",
        },
      },
      { $unwind: "$author" },

      // Optional filters
      // personName (case-insensitive contains)
      ...(type === "woman" && filters?.personName
        ? [
            {
              $match: {
                personName: {
                  $regex: new RegExp(filters.personName, "i"),
                },
              },
            },
          ]
        : []),

      // personLocation (case-insensitive contains)
      ...(type === "woman" && filters?.personLocation
        ? [
            {
              $match: {
                personLocation: {
                  $regex: new RegExp(filters.personLocation, "i"),
                },
              },
            },
          ]
        : []),

      // Age range filter - safely convert string age to int
      ...(type === "woman" && filters?.ageRange
        ? [
            {
              $addFields: {
                _ageNum: {
                  $convert: { input: "$personAge", to: "int", onError: null, onNull: null },
                },
              },
            },
            {
              $match: {
                _ageNum: { $ne: null, $gte: filters.ageRange[0], $lte: filters.ageRange[1] },
              },
            },
          ]
        : []),

      // Leading flag filter
      ...(type === "woman" && filters?.leadingFlag
        ? [
            {
              $match: { "engagement.leadingFlag": filters.leadingFlag },
            },
          ]
        : []),

      // Clean projection - we need to use inclusion only (can't mix with exclusion)
      {
        $project: {
          content: 1,
          postType: 1,
          media: 1,
          personName: 1,
          personAge: 1,
          personLocation: 1,
          poll: 1,
          createdAt: 1,
          updatedAt: 1,
          isDeleted: 1,
          engagement: 1, // 👈 keep engagement object
          authorId: "$author", // 👈 alias back to authorId
        },
      },

      // Sorting, skipping, limiting + count
      {
        $facet: {
          posts: [{ $sort: sortStage }, { $skip: skip }, { $limit: limit }],
          totalCount: [{ $count: "count" }],
        },
      },
    ];

    const results = await Post.aggregate(pipeline);

    const posts = results[0].posts;
    const total = results[0].totalCount[0]?.count || 0;

    return {
      posts,
      pagination: {
        total,
        page,
        totalPages: Math.ceil(total / limit),
        hasMore: page * limit < total,
      },
    };
  }
}
