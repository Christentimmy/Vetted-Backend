// utils/content_moderation.js
import User from "../models/user_model";
import { IUser } from "../types/user_type";
import { IMediaItem } from "../types/post_type";
import { Post } from "../models/post_model";

// Profanity and inappropriate content detection
const PROFANITY_WORDS = ["fuck", "shit", "damn", "bitch", "asshole", "bastard"];

const HATE_SPEECH_PATTERNS = [
  /\b(kill|murder|die)\s+(all|every)\s+\w+/gi,
  /\b(hate|despise)\s+(all|every)\s+\w+/gi,
];

const VIOLENCE_KEYWORDS = [
  "kill",
  "murder",
  "death",
  "suicide",
  "harm",
  "hurt",
  "violence",
  "weapon",
  "gun",
  "knife",
  "bomb",
  "terrorist",
  "attack",
];

const NSFW_KEYWORDS = [
  "sex",
  "porn",
  "nude",
  "naked",
  "explicit",
  "adult",
  "xxx",
  "orgasm",
  "masturbate",
  "dildo",
  "vibrator",
];

const DRUG_KEYWORDS = [
  "cocaine",
  "heroin",
  "meth",
  "weed",
  "marijuana",
  "drugs",
  "pills",
  "overdose",
  "high",
  "stoned",
  "dealer",
];

/**
 * Validates post content for inappropriate material
 * @param {string} text - The text content to validate
 * @param {Array} mediaFiles - Array of media files to check
 * @returns {Object} Validation result with flags and recommendations
 */
export const validatePostContent = (
  text = "",
  mediaFiles: IMediaItem[] = []
) => {
  const result: any = {
    isExplicit: false,
    ageRestricted: false,
    autoHidden: false,
    flags: {
      nsfw: false,
      violence: false,
      hate: false,
      drugs: false,
      profanity: false,
    },
    score: 0, // 0-100, higher means more problematic
    reasons: [],
  };

  if (!text && (!mediaFiles || mediaFiles.length === 0)) {
    return result;
  }

  const lowerText = text.toLowerCase().split(/\s+/);

  // Check for profanity
  const profanityCount = lowerText.filter(word =>
    PROFANITY_WORDS.includes(word)
  ).length;

  if (profanityCount > 0) {
    result.flags.profanity = true;
    result.score += profanityCount * 10;
    result.reasons.push(`Contains ${profanityCount} profane word(s)`);
  }

  // Check for hate speech patterns
  const hateMatches = HATE_SPEECH_PATTERNS.some((pattern) =>
    pattern.test(text)
  );
  if (hateMatches) {
    result.flags.hate = true;
    result.score += 40;
    result.reasons.push("Contains potential hate speech");
  }

  // Check for violence keywords
  const violenceCount = lowerText.filter(word =>
    VIOLENCE_KEYWORDS.includes(word)
  ).length;

  if (violenceCount > 0) {
    result.flags.violence = true;
    result.score += violenceCount * 15;
    result.reasons.push(`Contains ${violenceCount} violence-related word(s)`);
  }

  // Check for NSFW content
  const nsfwCount = lowerText.filter(word =>
    NSFW_KEYWORDS.includes(word)
  ).length;

  if (nsfwCount > 0) {
    result.flags.nsfw = true;
    result.score += nsfwCount * 20;
    result.reasons.push(`Contains ${nsfwCount} NSFW word(s)`);
  }

  // Check for drug-related content
  const drugCount = lowerText.filter(word =>
    DRUG_KEYWORDS.includes(word)
  ).length;

  if (drugCount > 0) {
    result.flags.drugs = true;
    result.score += drugCount * 12;
    result.reasons.push(`Contains ${drugCount} drug-related word(s)`);
  }

  // Check for excessive caps (might indicate shouting/aggression)
  const capsPercentage = (text.match(/[A-Z]/g) || []).length / text.length;
  if (capsPercentage > 0.7 && text.length > 20) {
    result.score += 15;
    result.reasons.push("Excessive use of capital letters");
  }

  // Check media files for explicit content (basic filename check)
  if (mediaFiles && mediaFiles.length > 0) {
    const explicitMediaPatterns = /\b(porn|sex|nude|naked|xxx|adult)\b/i;
    const hasExplicitMedia = mediaFiles.some((file: IMediaItem) =>
      explicitMediaPatterns.test(file.url || "")
    );

    if (hasExplicitMedia) {
      result.flags.nsfw = true;
      result.score += 30;
      result.reasons.push("Media filename suggests explicit content");
    }
  }

  // Determine final flags based on score and specific violations
  result.isExplicit =
    result.score >= 30 || result.flags.nsfw || result.flags.hate;
  result.ageRestricted =
    result.score >= 25 ||
    result.flags.nsfw ||
    result.flags.violence ||
    result.flags.drugs;
  result.autoHidden = result.score >= 50 || result.flags.hate;

  return result;
};

/**
 * Advanced content analysis using text patterns and machine learning concepts
 * @param {string} text - Text to analyze
 * @returns {Object} Advanced analysis results
 */
export const advancedContentAnalysis = (text: string) => {
  let topics: any = [];
  const analysis = {
    sentiment: "neutral", // positive, negative, neutral
    toxicity: 0, // 0-1 scale
    topics: topics,
    language: "en",
    readabilityScore: 0,
  };

  if (!text || text.trim().length === 0) {
    return analysis;
  }

  const lowerText = text.toLowerCase();

  // Simple sentiment analysis
  const positiveWords = [
    "good",
    "great",
    "awesome",
    "amazing",
    "love",
    "happy",
    "joy",
    "wonderful",
    "fantastic",
    "excellent",
  ];
  const negativeWords = [
    "bad",
    "terrible",
    "awful",
    "hate",
    "sad",
    "angry",
    "disgusting",
    "horrible",
    "worst",
    "sucks",
  ];

  const positiveCount = positiveWords.filter((word) =>
    lowerText.includes(word)
  ).length;
  const negativeCount = negativeWords.filter((word) =>
    lowerText.includes(word)
  ).length;

  if (positiveCount > negativeCount) {
    analysis.sentiment = "positive";
  } else if (negativeCount > positiveCount) {
    analysis.sentiment = "negative";
  }

  // Simple toxicity calculation
  const toxicWords = [...PROFANITY_WORDS, ...VIOLENCE_KEYWORDS.slice(0, 5)];
  const toxicCount = toxicWords.filter((word) =>
    lowerText.includes(word)
  ).length;
  analysis.toxicity = Math.min(toxicCount * 0.2, 1);

  // Topic detection (basic keyword matching)
  const topicKeywords = {
    relationships: [
      "love",
      "boyfriend",
      "girlfriend",
      "dating",
      "crush",
      "relationship",
      "breakup",
      "marriage",
    ],
    mental_health: [
      "anxiety",
      "depression",
      "therapy",
      "stress",
      "mental",
      "counseling",
      "sad",
      "lonely",
    ],
    work: [
      "job",
      "work",
      "boss",
      "career",
      "office",
      "salary",
      "interview",
      "unemployed",
    ],
    school: [
      "school",
      "college",
      "university",
      "teacher",
      "student",
      "exam",
      "homework",
      "grade",
    ],
    family: [
      "family",
      "mother",
      "father",
      "parent",
      "sibling",
      "mom",
      "dad",
      "brother",
      "sister",
    ],
    health: [
      "doctor",
      "hospital",
      "sick",
      "medicine",
      "health",
      "pain",
      "treatment",
      "surgery",
    ],
  };

  for (const [topic, keywords] of Object.entries(topicKeywords)) {
    const matches = keywords.filter((keyword) =>
      lowerText.includes(keyword)
    ).length;
    if (matches > 0) {
      analysis.topics.push({ topic, relevance: matches / keywords.length });
    }
  }

  // Simple readability score (based on sentence and word length)
  const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 0);
  const words = text.split(/\s+/).filter((w) => w.trim().length > 0);
  const avgWordsPerSentence = words.length / Math.max(sentences.length, 1);
  const avgCharsPerWord =
    text.replace(/\s+/g, "").length / Math.max(words.length, 1);

  // Simple readability formula (lower is easier to read)
  analysis.readabilityScore = Math.max(
    0,
    Math.min(100, avgWordsPerSentence * 1.5 + avgCharsPerWord * 4 - 15)
  );

  return analysis;
};

// utils/text_processing.js

/**
 * Extracts hashtags from text content
 * @param {string} text - The text to extract hashtags from
 * @returns {Array<string>} Array of hashtags without the # symbol
 */
export const extractHashtags = (text: string) => {
  if (!text || typeof text !== "string") {
    return [];
  }

  // Regex to match hashtags: # followed by alphanumeric characters and underscores
  // Supports multiple languages including emojis
  const hashtagRegex =
    /#([a-zA-Z0-9_\u00c0-\u024f\u1e00-\u1eff\u0100-\u017f\u0180-\u024f\u4e00-\u9fff\u3400-\u4dbf\u0590-\u05ff\u0600-\u06ff\u0750-\u077f\u08a0-\u08ff\ufb50-\ufdff\ufe70-\ufeff]+)/g;

  const hashtags = [];
  let match;

  while ((match = hashtagRegex.exec(text)) !== null) {
    const hashtag = match[1].toLowerCase();

    // Validate hashtag
    if (isValidHashtag(hashtag)) {
      hashtags.push(hashtag);
    }
  }

  // Remove duplicates and return
  return [...new Set(hashtags)];
};

/**
 * Validates if a hashtag is acceptable
 * @param {string} hashtag - The hashtag to validate
 * @returns {boolean} Whether the hashtag is valid
 */
const isValidHashtag = (hashtag: string) => {
  // Check length (minimum 2 characters, maximum 50)
  if (hashtag.length < 2 || hashtag.length > 50) {
    return false;
  }

  // Check for inappropriate content
  const inappropriateHashtags = [
    "porn",
    "sex",
    "nude",
    "naked",
    "xxx",
    "adult",
    "nsfw",
    "kill",
    "murder",
    "suicide",
    "death",
    "hate",
    "nazi",
    "terrorist",
    "bomb",
    "weapon",
    "drug",
    "cocaine",
    "heroin",
  ];

  if (inappropriateHashtags.some((word) => hashtag.includes(word))) {
    return false;
  }

  // Check if it's not just numbers
  if (/^\d+$/.test(hashtag)) {
    return false;
  }

  // Check if it contains at least one letter
  if (
    !/[a-zA-Z\u00c0-\u024f\u1e00-\u1eff\u0100-\u017f\u0180-\u024f\u4e00-\u9fff\u3400-\u4dbf]/.test(
      hashtag
    )
  ) {
    return false;
  }

  return true;
};

/**
 * Suggests related hashtags based on content
 * @param {string} text - The text to analyze
 * @returns {Array<string>} Array of suggested hashtags
 */
export const suggestHashtags = (text: string) => {
  if (!text) return [];

  const lowerText = text.toLowerCase();
  const suggestions = [];

  // Category-based suggestions
  const categoryMappings = {
    // Emotions
    confession: ["confession", "anonymous", "secret", "truth"],
    love: ["love", "romance", "relationship", "crush"],
    sad: ["sadness", "depression", "mentalhealth", "support"],
    happy: ["happiness", "joy", "positivity", "goodvibes"],
    angry: ["anger", "frustrated", "vent", "emotions"],
    anxious: ["anxiety", "mentalhealth", "stress", "worry"],

    // Life areas
    work: ["work", "job", "career", "office", "professional"],
    school: ["school", "college", "university", "student", "education"],
    family: ["family", "parents", "siblings", "home", "relatives"],
    friends: ["friends", "friendship", "social", "squad", "besties"],

    // Common topics
    money: ["money", "finance", "broke", "salary", "budget"],
    health: ["health", "fitness", "medical", "doctor", "wellness"],
    travel: ["travel", "vacation", "trip", "adventure", "explore"],
  };

  // Check for category keywords and suggest related hashtags
  for (const [keyword, relatedTags] of Object.entries(categoryMappings)) {
    if (lowerText.includes(keyword)) {
      suggestions.push(...relatedTags);
    }
  }

  // Age/generation specific suggestions
  if (lowerText.match(/\b(gen\s*z|zoomer|tiktok|snapchat|instagram)\b/i)) {
    suggestions.push("genz", "youth", "social", "digital");
  }

  if (lowerText.match(/\b(millennial|adult|grown\s*up|responsibility)\b/i)) {
    suggestions.push("millennial", "adulting", "life", "reality");
  }

  // Remove duplicates and limit to 10 suggestions
  return [...new Set(suggestions)].slice(0, 10);
};

/**
 * Extracts user mentions from text content
 * @param {string} text - The text to extract mentions from
 * @returns {Array<string>} Array of ObjectIds of mentioned users
 */
export const extractMentions = async (text: string) => {
  if (!text || typeof text !== "string") {
    return [];
  }

  // Regex to match @mentions: @ followed by alphanumeric characters and underscores
  const mentionRegex = /@([a-zA-Z0-9_]{1,30})/g;
  const usernames = [];
  let match;

  while ((match = mentionRegex.exec(text)) !== null) {
    const username = match[1].toLowerCase();
    usernames.push(username);
  }

  if (usernames.length === 0) {
    return [];
  }

  try {
    // Find users by username
    const users = await User.find({
      username: { $in: usernames },
      isDeleted: { $ne: true },
      isActive: { $ne: false },
    })
      .select("_id username")
      .lean();

    return users.map((user) => user._id);
  } catch (error) {
    console.error("Error finding mentioned users:", error);
    return [];
  }
};

/**
 * Validates mention format and availability
 * @param {string} username - Username to validate
 * @returns {Object} Validation result
 */
export const validateMention = async (username: string) => {
  const result = {
    isValid: false,
    exists: false,
    userId: "",
    reason: "",
  };

  // Basic format validation
  if (!username || typeof username !== "string") {
    result.reason = "Invalid username format";
    return result;
  }

  const cleanUsername = username.replace("@", "").toLowerCase();

  // Check username format
  if (!/^[a-zA-Z0-9_]{1,30}$/.test(cleanUsername)) {
    result.reason = "Username contains invalid characters or is too long";
    return result;
  }

  result.isValid = true;

  try {
    // Check if user exists
    const user = (await User.findOne({
      username: cleanUsername,
      isDeleted: { $ne: true },
      isActive: { $ne: false },
    }).select("_id username privacySettings")) as IUser;

    if (!user) {
      result.reason = "User not found";
      return result;
    }

    result.exists = true;
    result.userId = user._id.toString();

    // Check if user allows mentions
    // if (user.privacySettings?.allowMentions === false) {
    //   result.reason = "User has disabled mentions";
    //   result.exists = false;
    //   result.userId = null;
    // }
  } catch (error) {
    console.error("Error validating mention:", error);
    result.reason = "Error validating mention";
  }

  return result;
};

/**
 * Processes text and replaces mentions with clickable links
 * @param {string} text - Original text
 * @param {Array} mentionedUsers - Array of user objects with _id and username
 * @returns {string} Processed text with mention links
 */
export const processMentionsInText = (text: string, mentionedUsers: IUser[]) => {
  if (!text || !mentionedUsers.length) {
    return text;
  }

  let processedText = text;

  mentionedUsers.forEach((user) => {
    const mentionRegex = new RegExp(`@${user.displayName}\\b`, "gi");
    const replacement = `<span class="mention" data-user-id="${user._id}">@${user.displayName}</span>`;
    processedText = processedText.replace(mentionRegex, replacement);
  });

  return processedText;
};

/**
 * Gets trending hashtags from recent posts
 * @param {number} limit - Number of trending hashtags to return
 * @param {number} hours - Time window in hours (default 24)
 * @returns {Array} Array of trending hashtags with counts
 */
export const getTrendingHashtags = async (limit = 20, hours = 24) => {
  try {
    const timeThreshold = new Date(Date.now() - hours * 60 * 60 * 1000);

    const trendingHashtags = await Post.aggregate([
      {
        $match: {
          createdAt: { $gte: timeThreshold },
          isDeleted: { $ne: true },
          "visibility.type": { $in: ["public", "confession"] },
        },
      },
      {
        $unwind: "$hashtags",
      },
      {
        $group: {
          _id: "$hashtags",
          count: { $sum: 1 },
          lastUsed: { $max: "$createdAt" },
          uniqueUsers: { $addToSet: "$authorId" },
        },
      },
      {
        $addFields: {
          uniqueUserCount: { $size: "$uniqueUsers" },
        },
      },
      {
        $sort: {
          count: -1,
          uniqueUserCount: -1,
          lastUsed: -1,
        },
      },
      {
        $limit: limit,
      },
      {
        $project: {
          hashtag: "$_id",
          count: 1,
          lastUsed: 1,
          uniqueUserCount: 1,
          _id: 0,
        },
      },
    ]);

    return trendingHashtags;
  } catch (error) {
    console.error("Error getting trending hashtags:", error);
    return [];
  }
};
