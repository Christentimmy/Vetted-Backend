// Feature limits configuration

export const FEATURE_NAMES = {
  ENFORMION_CRIMINAL_SEARCH: 'enformionCriminalSearch',
  ENFORMION_NUMBER_SEARCH: 'enformionNumberSearch',
  NAME_LOOKUP: 'nameLookup',
  SEARCH_OFFENDER: 'searchOffender',
  TINEYE_IMAGE_SEARCH: 'tinEyeImageSearch',
} as const;

export type FeatureName = typeof FEATURE_NAMES[keyof typeof FEATURE_NAMES];

export const FEATURE_LIMITS = {
  SUBSCRIPTION_INITIAL_LIMIT: 5, // 5 requests per feature when subscribed
  TOP_UP_LIMIT: 1, // 1 request per feature when topped up
  TOP_UP_PRICE: 2.99, // Price in dollars for top-up
  TOP_UP_PRICE_ID: 'price_1SSjkbRpvja255lNLJgt9mD9', // Replace with actual Stripe price ID
};

// Mapping of route endpoints to feature names
export const ROUTE_TO_FEATURE_MAP: Record<string, FeatureName> = {
  '/enformion-criminal-search': FEATURE_NAMES.ENFORMION_CRIMINAL_SEARCH,
  '/enformion-number-search': FEATURE_NAMES.ENFORMION_NUMBER_SEARCH,
  '/name-lookup': FEATURE_NAMES.NAME_LOOKUP,
  '/search-offender': FEATURE_NAMES.SEARCH_OFFENDER,
  '/tineye-image-search': FEATURE_NAMES.TINEYE_IMAGE_SEARCH,
};
