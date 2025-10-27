import Stripe from "stripe";
import User from "../models/user_model";
import Subscription from "../models/subscription_model";
import { PLANS } from "../config/subscription_plans";
import { Request, Response } from "express";
import mongoose from "mongoose";
import { FEATURE_LIMITS } from "../config/feature_limits";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-08-27.basil",
});

const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export const createStripeCustomer = async (user: any) => {
  const customer = await stripe.customers.create({
    email: user.email,
    name: user.displayName,
    metadata: {
      userId: user._id.toString(),
    },
  });

  await User.findByIdAndUpdate(user._id, {
    stripeCustomerId: customer.id,
  });

  return customer;
};

export const createCheckoutSession = async (userId: string) => {
  const user = await User.findById(userId);
  if (!user) throw new Error("User not found");

  let customerId = user.stripeCustomerId;
  if (!customerId) {
    const customer = await createStripeCustomer(user);
    customerId = customer.id;
    user.stripeCustomerId = customer.id;
    await user.save();
  }

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    payment_method_types: ["card"],
    line_items: [
      {
        price: "price_1SMt8hCEHhMF7pKAR9jqPgH4",
        quantity: 1,
      },
    ],
    mode: "subscription",
    success_url: `${process.env.CLIENT_URL}/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.CLIENT_URL}/subscription/canceled`,
    metadata: {
      userId: user._id.toString(),
      planId: "pro",
      planName: "Pro",
    },
  });

  return session;
};

export const getSubscription = async (userId: string) => {
  const subscription = await Subscription.findOne({
    userId,
    status: { $in: ["active", "past_due"] },
  });
  return subscription;
};

export const cancelSubscription = async (userId: string) => {
  const subscription = await getSubscription(userId);
  if (!subscription) throw new Error("No active subscription found");

  const canceledSubscription = await stripe.subscriptions.update(
    subscription.stripeSubscriptionId,
    {
      cancel_at_period_end: true,
    }
  );

  await Subscription.findByIdAndUpdate(subscription._id, {
    cancelAtPeriodEnd: true,
  });

  await User.findByIdAndUpdate(userId, {
    "subscription.cancelAtPeriodEnd": true,
  });

  return canceledSubscription;
};

export const reactivateSubscription = async (userId: string) => {
  const subscription = await Subscription.findOne({
    userId,
    cancelAtPeriodEnd: true,
  });
  if (!subscription) throw new Error("No subscription to reactivate");

  const reactivatedSubscription = await stripe.subscriptions.update(
    subscription.stripeSubscriptionId,
    {
      cancel_at_period_end: false,
    }
  );

  await Subscription.findByIdAndUpdate(subscription._id, {
    cancelAtPeriodEnd: false,
  });

  await User.findByIdAndUpdate(userId, {
    "subscription.cancelAtPeriodEnd": false,
  });

  return reactivatedSubscription;
};

export const getCustomerPortalSession = async (userId: string) => {
  const user = await User.findById(userId);
  if (!user || !user.stripeCustomerId) {
    throw new Error("No Stripe customer found");
  }

  const session = await stripe.billingPortal.sessions.create({
    customer: user.stripeCustomerId,
    return_url: `${process.env.CLIENT_URL}/subscription`,
  });

  return session;
};

// Create a one-time payment session for feature top-up
export const createTopUpCheckoutSession = async (userId: string) => {
  const user = await User.findById(userId);
  if (!user) throw new Error("User not found");

  // Check if user has active subscription
  if (user.subscription?.status !== "active") {
    throw new Error("Active subscription required to purchase top-ups");
  }

  let customerId = user.stripeCustomerId;
  if (!customerId) {
    const customer = await createStripeCustomer(user);
    customerId = customer.id;
    user.stripeCustomerId = customer.id;
    await user.save();
  }

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    payment_method_types: ["card"],
    line_items: [
      {
        price_data: {
          currency: "usd",
          product_data: {
            name: "Feature Top-Up",
            description: "Add 1 request to each premium feature",
          },
          unit_amount: Math.round(FEATURE_LIMITS.TOP_UP_PRICE * 100), // Convert to cents
        },
        quantity: 1,
      },
    ],
    mode: "payment",
    success_url: `${process.env.CLIENT_URL}/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.CLIENT_URL}/subscription/canceled`,
    metadata: {
      userId: user._id.toString(),
      type: "top_up",
    },
  });

  return session;
};

// Webhook handler for Stripe events
export const handleWebhook = async (req: Request, res: Response) => {
  const sig = req.headers["stripe-signature"] as string;
  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
  } catch (err: any) {
    console.log(`Webhook signature verification failed.`, err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Use a transaction to ensure data consistency
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutCompleted(
          event.data.object as Stripe.Checkout.Session
        );
        break;

      case "customer.subscription.created":
      case "customer.subscription.updated":
        await handleSubscriptionUpdated(
          event.data.object as Stripe.Subscription
        );
        break;

      case "customer.subscription.deleted":
        await handleSubscriptionDeleted(
          event.data.object as Stripe.Subscription
        );
        break;

      case "invoice.payment_failed":
        await handlePaymentFailed(event.data.object as Stripe.Invoice);
        break;

      case "invoice.payment_succeeded":
        await handlePaymentSucceeded(event.data.object as Stripe.Invoice);
        break;

      default:
        console.log(`Unhandled event type ${event.type}`);
    }

    await session.commitTransaction();
    res.json({ received: true });
  } catch (error) {
    await session.abortTransaction();
    console.error("Webhook error:", error);
    res.status(500).json({ error: "Webhook handler failed" });
  } finally {
    session.endSession();
  }
};

const handleCheckoutCompleted = async (session: Stripe.Checkout.Session) => {
  const userId = session.metadata?.userId;
  const type = session.metadata?.type;
  
  if (!userId) return;


  // Handle top-up payment
  if (type === "top_up") {
    await handleTopUpPayment(userId);
    return;
  }

  // Handle subscription payment
  if (session.subscription) {
    const subscription = await stripe.subscriptions.retrieve(
      session.subscription as string
    );
    await handleSubscriptionUpdated(subscription);
  }
};

const handleTopUpPayment = async (userId: string) => {
  const user = await User.findById(userId);
  if (!user) {
    console.error("User not found for top-up payment:", userId);
    return;
  }

  // Initialize feature usage if not exists
  if (!user.featureUsage) {
    user.featureUsage = {
      enformionCriminalSearch: 0,
      enformionNumberSearch: 0,
      nameLookup: 0,
      searchOffender: 0,
      tinEyeImageSearch: 0,
      lastResetDate: new Date(),
    };
  }

  // Add 1 request to each feature
  user.featureUsage.enformionCriminalSearch += FEATURE_LIMITS.TOP_UP_LIMIT;
  user.featureUsage.enformionNumberSearch += FEATURE_LIMITS.TOP_UP_LIMIT;
  user.featureUsage.nameLookup += FEATURE_LIMITS.TOP_UP_LIMIT;
  user.featureUsage.searchOffender += FEATURE_LIMITS.TOP_UP_LIMIT;
  user.featureUsage.tinEyeImageSearch += FEATURE_LIMITS.TOP_UP_LIMIT;

  await user.save();
};

const handleSubscriptionUpdated = async (subscription: Stripe.Subscription) => {
  const customerId = subscription.customer as string;
  const data = subscription.items.data[0];

  const user = await User.findOne({ stripeCustomerId: customerId });
  if (!user) return;


  const plan = Object.values(PLANS).find(
    (p) => p.stripePriceId === data.price.id
  );
  if (!plan) return;

  // First, check if we already have this subscription
  let subscriptionRecord = await Subscription.findOne({
    $or: [
      { stripeSubscriptionId: subscription.id },
      {
        userId: user._id,
        status: { $in: ["active", "trialing", "past_due", "incomplete"] },
      },
    ],
  });



  // Prepare subscription data
  const subscriptionData = {
    userId: user._id,
    stripeSubscriptionId: subscription.id,
    stripeCustomerId: customerId,
    status: subscription.status,
    planId: plan.id,
    planName: plan.name,
    priceId: data.price.id,
    currentPeriodStart: new Date(data.current_period_start * 1000),
    currentPeriodEnd: new Date(data.current_period_end * 1000),
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
    canceledAt: subscription.canceled_at
      ? new Date(subscription.canceled_at * 1000)
      : undefined,
    trialStart: subscription.trial_start
      ? new Date(subscription.trial_start * 1000)
      : undefined,
    trialEnd: subscription.trial_end
      ? new Date(subscription.trial_end * 1000)
      : undefined,
  };

  // If we found an existing subscription, update it
  if (subscriptionRecord) {
    // If we found a different subscription for this user, cancel it
    if (subscriptionRecord.stripeSubscriptionId !== subscription.id) {
      await Subscription.updateOne(
        { _id: subscriptionRecord._id },
        {
          status: "canceled",
          canceledAt: new Date(),
          cancelAtPeriodEnd: true,
        }
      );
    }


    // Update the existing subscription
   await Subscription.updateOne(
      { _id: subscriptionRecord._id },
      { $set: subscriptionData }
    );
  } else {
    // Create new subscription if none exists
    subscriptionRecord = new Subscription(subscriptionData);
    await subscriptionRecord.save();
  }

  // Update user's subscription info and reset feature limits
  const updateData: any = {
    "subscription.planId": plan.id,
    "subscription.status": subscription.status,
    "subscription.currentPeriodEnd": new Date(
      data.current_period_end * 1000
    ),
    "subscription.cancelAtPeriodEnd": subscription.cancel_at_period_end,
  };

  // Reset feature limits when subscription is active or renewed
  if (subscription.status === "active") {
    updateData["featureUsage"] = {
      enformionCriminalSearch: FEATURE_LIMITS.SUBSCRIPTION_INITIAL_LIMIT,
      enformionNumberSearch: FEATURE_LIMITS.SUBSCRIPTION_INITIAL_LIMIT,
      nameLookup: FEATURE_LIMITS.SUBSCRIPTION_INITIAL_LIMIT,
      searchOffender: FEATURE_LIMITS.SUBSCRIPTION_INITIAL_LIMIT,
      tinEyeImageSearch: FEATURE_LIMITS.SUBSCRIPTION_INITIAL_LIMIT,
      lastResetDate: new Date(),
    };
  }

  await User.updateOne(
    { _id: user._id },
    { $set: updateData }
  );

  return subscriptionRecord;
};

const handleSubscriptionDeleted = async (subscription: Stripe.Subscription) => {
  await Subscription.findOneAndUpdate(
    { stripeSubscriptionId: subscription.id },
    { status: "canceled", canceledAt: new Date() }
  );

  const customerId = subscription.customer as string;
  const user = await User.findOne({ stripeCustomerId: customerId });
  if (user) {
    await User.findByIdAndUpdate(user._id, {
      subscription: {
        planId: null,
        status: "canceled",
        currentPeriodEnd: null,
        cancelAtPeriodEnd: false,
      },
    });
  }
};

const handlePaymentFailed = async (invoice: any) => {
  if (invoice.subscription) {
    await Subscription.findOneAndUpdate(
      { stripeSubscriptionId: invoice.subscription },
      { status: "past_due" }
    );
  }
};

const handlePaymentSucceeded = async (invoice: any) => {
  if (invoice.subscription) {
    const subscription = await stripe.subscriptions.retrieve(
      invoice.subscription as string
    );
    await handleSubscriptionUpdated(subscription);
  }
};

export const getUserStripeInvoiceHistory = async (customerId: string) => {
  try {
    const invoices = await stripe.invoices.list({
      customer: customerId,
      expand: ["data.subscription"],
    });

    return invoices.data.map((invoice) => {
      const subscription = (invoice as any).subscription as
        | Stripe.Subscription
        | string
        | null;

      return {
        id: invoice.id,
        amount: invoice.amount_paid,
        status: invoice.status,
        created: new Date(invoice.created * 1000),
        subscriptionId:
          subscription && typeof subscription !== "string"
            ? subscription.id
            : subscription,
        subscriptionStatus:
          subscription && typeof subscription !== "string"
            ? subscription.status
            : null,
      };
    });
  } catch (error) {
    console.error("Error fetching invoice history:", error);
    return [];
  }
};

