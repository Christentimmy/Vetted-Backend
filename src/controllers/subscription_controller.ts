import { Request, Response } from "express";
import {
  createCheckoutSession,
  getSubscription,
  cancelSubscription,
  reactivateSubscription,
  getCustomerPortalSession,
  handleWebhook,
} from "../services/stripe_service";
import { PLANS } from "../config/subscription_plans";

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
        message: "Subscription will be canceled at the end of the current period",
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
    res.send("Payment Successful");
    return;
  },

  cancelled: async (req: Request, res: Response) => {
    res.send("Payment Cancelled");
    return;
  },
};
