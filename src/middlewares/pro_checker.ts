import { Request, Response, NextFunction } from "express";


export const proChecker = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const user = res.locals.user;
    if (user.subscription.status === "active") {
      next();
      return;
    }

    if (user.premiumExpiresAt) {
      const now = new Date();
      const expiresAt = new Date(user.premiumExpiresAt);
      
      if (expiresAt > now) {
        next();
        return;
      }
    }

    if (user.premiumCredits > 0) {
      user.premiumCredits -= 1;
      await user.save();
      res.locals.creditsUsed = true;
      res.locals.creditsRemaining = user.premiumCredits;

      next();
      return;
    }

    res.status(403).json({ 
      message: "Premium access required",
      details: {
        hasSubscription: false,
        creditsAvailable: 0,
        suggestion: "Subscribe or invite friends to get free credits"
      }
    });
    return;
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: "Internal server error" });
  }
};