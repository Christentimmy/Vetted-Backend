

export const PLANS = {
  FREE: {
    id: "free",
    name: "Free",
    price: 0,
    stripePriceId: null,
    features: ["Basic features", "Limited searches"],
    limits: {
      searches: 10,
    },
  },
  PRO: {
    id: "pro",
    name: "Pro",
    price: 15,
    stripePriceId: "price_...",
    features: ["Unlimited searches", "Advanced filters", "Priority support"],
    limits: {
      searches: 1000,
    },
  }
};




