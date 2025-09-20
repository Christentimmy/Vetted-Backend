

export const PLANS = {
  FREE: {
    id: "free",
    name: "Free",
    price: 0,
    stripePriceId: "price_...",
    features: ["Basic features", "Limited searches"],
    limits: {
      searches: 10,
    },
  },
  PRO: {
    id: "pro",
    name: "Pro",
    price: 9.99,
    stripePriceId: "price_...",
    features: ["Unlimited searches", "Advanced filters", "Priority support"],
    limits: {
      searches: 1000,
    },
  },
  PREMIUM: {
    id: "premium",
    name: "Premium",
    price: 24.99,
    stripePriceId: "price_...",
    features: [
      "Unlimited searches",
      "Advanced filters",
      "Priority support",
      "API access",
    ],
    limits: {
      searches: 10000,
    },
  },
};




