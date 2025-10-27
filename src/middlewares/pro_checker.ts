import { Request, Response, NextFunction } from "express";
import {
  ROUTE_TO_FEATURE_MAP,
  FeatureName,
  FEATURE_LIMITS,
} from "../config/feature_limits";
import User from "../models/user_model";

export const proChecker = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const user = res.locals.user;
    const featureName = ROUTE_TO_FEATURE_MAP[req.path];

    // If no feature mapping found, deny access (shouldn't happen)
    if (!featureName) {
      return res.status(405).json({
        message: "Invalid premium feature access",
      });
    }

    // Check if user has active subscription
    const hasActiveSubscription = user.subscription?.status === "active";

    // Check if user has premium credits
    if (user.premiumCredits) {
      if (user.premiumCredits > 0) {
        user.premiumCredits -= 1;
        await user.save();
        res.locals.creditsUsed = true;
        res.locals.creditsRemaining = user.premiumCredits;
        next();
        return;
      }
    }
    if (user.premiumExpiresAt) {
      const now = new Date();
      const expiresAt = new Date(user.premiumExpiresAt);

      if (expiresAt < now) {
        user.premiumExpiresAt = null;
        await user.save();
        res.status(403).json({
          message: "Premium access expired",
          details: {
            hasSubscription: false,
            creditsAvailable: 0,
            suggestion:
              "Subscribe to get 5 requests per feature or invite friends to get free credits",
          },
        });
        return;
      }
    }

    // If has active subscription, check feature usage
    if (hasActiveSubscription) {

      // Check if user has remaining requests for this feature
      const remainingRequests =
        user.featureUsage[featureName as keyof typeof user.featureUsage];

      if (typeof remainingRequests === "number" && remainingRequests > 0) {
        // Decrement the feature usage count
        (user.featureUsage[
          featureName as keyof typeof user.featureUsage
        ] as number) -= 1;
        await user.save();

        res.locals.featureUsed = featureName;
        res.locals.remainingRequests = user.featureUsage[
          featureName as keyof typeof user.featureUsage
        ] as number;

        next();
        return;
      } else {
        // No requests left for this feature
        return res.status(402).json({
          message: `No requests remaining for this feature`,
          feature: featureName,
          details: {
            remainingRequests: 0,
            suggestion: `Purchase a top-up for $${FEATURE_LIMITS.TOP_UP_PRICE} to get 1 more request per feature`,
            topUpPrice: FEATURE_LIMITS.TOP_UP_PRICE,
          },
        });
      }
    }

    // No subscription and no premium access
    res.status(403).json({
      message: "Premium access required",
      details: {
        hasSubscription: false,
        creditsAvailable: 0,
        suggestion:
          "Subscribe to get 5 requests per feature or invite friends to get free credits",
      },
    });
    return;
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: "Internal server error" });
  }
};
