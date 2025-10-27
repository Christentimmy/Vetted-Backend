import { Request, Response } from "express";
import {
  createCheckoutSession,
  getSubscription,
  cancelSubscription,
  reactivateSubscription,
  getCustomerPortalSession,
  createTopUpCheckoutSession
} from "../services/stripe_service";
import { PLANS } from "../config/subscription_plans";
import Subscription from "../models/subscription_model";
import User from "../models/user_model";

export const subscriptionController = {
  getPlans: async (req: Request, res: Response) => {
    try {
      res.json({ success: true, plans: PLANS });
    } catch (error) {
      res.status(500).json({ success: false, error: "Failed to get plans" });
    }
  },

  createSubscription: async (req: Request, res: Response) => {
    try {
      const userId = res.locals.userId;

      if (!userId) {
        return res.status(401).json({ success: false, error: "Unauthorized" });
      }

      // Check for existing active subscription
      const existingSubscription = await Subscription.findOne({
        userId,
        status: "active",
        currentPeriodEnd: { $gt: new Date() },
      });

      if (existingSubscription) {
        return res.status(400).json({
          message: "You already have an active subscription",
          subscription: existingSubscription,
        });
      }

      const session = await createCheckoutSession(userId);

      res.json({
        success: true,
        checkoutUrl: session.url,
        sessionId: session.id,
      });
    } catch (error: any) {
      console.error("Create subscription error:", error);
      res.status(500).json({
        success: false,
        error: error.message || "Failed to create subscription",
      });
    }
  },

  getCurrentSubscription: async (req: Request, res: Response) => {
    try {
      const userId = res.locals.userId;

      if (!userId) {
        return res.status(401).json({ success: false, error: "Unauthorized" });
      }

      const subscription = await getSubscription(userId);

      res.json({
        success: true,
        subscription: subscription || null,
      });
    } catch (error: any) {
      console.error("Get subscription error:", error);
      res.status(500).json({
        success: false,
        error: error.message || "Failed to get subscription",
      });
    }
  },

  cancelUserSubscription: async (req: Request, res: Response) => {
    try {
      const userId = res.locals.userId;

      if (!userId) {
        res.status(401).json({ success: false, error: "Unauthorized" });
        return;
      }

      await cancelSubscription(userId);

      res.status(200).json({
        message:
          "Subscription will be canceled at the end of the current period",
      });
    } catch (error: any) {
      console.error("Cancel subscription error:", error);
      res.status(500).json({
        success: false,
        error: error.message || "Failed to cancel subscription",
      });
    }
  },

  reactivateUserSubscription: async (req: Request, res: Response) => {
    try {
      const userId = res.locals.userId;

      if (!userId) {
        return res.status(401).json({ success: false, error: "Unauthorized" });
      }

      await reactivateSubscription(userId);

      res.json({
        success: true,
        message: "Subscription reactivated successfully",
      });
    } catch (error: any) {
      console.error("Reactivate subscription error:", error);
      res.status(500).json({
        success: false,
        error: error.message || "Failed to reactivate subscription",
      });
    }
  },

  getPortalSession: async (req: Request, res: Response) => {
    try {
      const userId = res.locals.userId;

      if (!userId) {
        return res.status(401).json({ success: false, error: "Unauthorized" });
      }

      const session = await getCustomerPortalSession(userId);

      res.json({
        success: true,
        portalUrl: session.url,
      });
    } catch (error: any) {
      console.error("Portal session error:", error);
      res.status(500).json({
        success: false,
        error: error.message || "Failed to create portal session",
      });
    }
  },

  success: async (req: Request, res: Response) => {
    console.log("Payment successful");
    const redirecUrl = "vetted://payment-success";
    res.redirect(redirecUrl);
    return;
  },

  cancelled: async (req: Request, res: Response) => {
    const redirecUrl = "vetted://payment-cancelled";
    res.redirect(redirecUrl);
    return;
  },

  createTopUp: async (req: Request, res: Response) => {
    try {
      const userId = res.locals.userId;

      if (!userId) {
        return res.status(401).json({ success: false, error: "Unauthorized" });
      }

      const session = await createTopUpCheckoutSession(userId);

      res.json({
        success: true,
        checkoutUrl: session.url,
        sessionId: session.id,
      });
    } catch (error: any) {
      console.error("Create top-up error:", error);
      res.status(500).json({
        success: false,
        error: error.message || "Failed to create top-up session",
      });
    }
  },

  getFeatureUsage: async (req: Request, res: Response) => {
    try {
      const userId = res.locals.userId;

      if (!userId) {
        return res.status(401).json({ success: false, error: "Unauthorized" });
      }

      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ success: false, error: "User not found" });
      }

      res.json({
        success: true,
        featureUsage: user.featureUsage || {
          enformionCriminalSearch: 0,
          enformionNumberSearch: 0,
          nameLookup: 0,
          searchOffender: 0,
          tinEyeImageSearch: 0,
          lastResetDate: null,
        },
        hasActiveSubscription: user.subscription?.status === "active",
      });
    } catch (error: any) {
      console.error("Get feature usage error:", error);
      res.status(500).json({
        success: false,
        error: error.message || "Failed to get feature usage",
      });
    }
  },
};

