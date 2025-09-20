
import Stripe from "stripe";
import User from "../models/user_model";
import Subscription from "../models/subscription_model";
import { PLANS } from "../config/subscription_plans";
import { Request, Response } from "express";

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

export const createCheckoutSession = async (
  userId: string,
  priceId: string
) => {
  const user = await User.findById(userId);
  if (!user) throw new Error("User not found");

  // Find the plan details
  const plan = Object.values(PLANS).find(p => p.id === priceId);
  if (!plan) throw new Error("Invalid price ID");

  let customerId = user.stripeCustomerId;
  if (!customerId) {
    const customer = await createStripeCustomer(user);
    customerId = customer.id;
  }

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    payment_method_types: ["card"],
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    mode: "subscription",
    success_url: `${process.env.CLIENT_URL}/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.CLIENT_URL}/subscription/canceled`,
    metadata: {
      userId: user._id.toString(),
      planId: plan.id,
      planName: plan.name,
    },
  });

  return session;
};

export const getSubscription = async (userId: string) => {
  const subscription = await Subscription.findOne({ 
    userId, 
    status: { $in: ["active", "past_due"] } 
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
    cancelAtPeriodEnd: true 
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

// Webhook handler for Stripe events
export const handleWebhook = async (req: Request, res: Response) => {
  const sig = req.headers['stripe-signature'] as string;
  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
  } catch (err: any) {
    console.log(`Webhook signature verification failed.`, err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
        break;
      
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
        break;
      
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;
      
      case 'invoice.payment_failed':
        await handlePaymentFailed(event.data.object as Stripe.Invoice);
        break;
      
      case 'invoice.payment_succeeded':
        await handlePaymentSucceeded(event.data.object as Stripe.Invoice);
        break;
      
      default:
        console.log(`Unhandled event type ${event.type}`);
    }

    res.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({ error: 'Webhook handler failed' });
  }
};

const handleCheckoutCompleted = async (session: Stripe.Checkout.Session) => {
  const userId = session.metadata?.userId;
  if (!userId) return;

  // Get the subscription
  const subscription = await stripe.subscriptions.retrieve(
    session.subscription as string
  );

  await handleSubscriptionUpdated(subscription);
};

const handleSubscriptionUpdated = async (subscription: Stripe.Subscription) => {
  const customerId = subscription.customer as string;
  const user = await User.findOne({ stripeCustomerId: customerId });
  if (!user) return;

  const plan = Object.values(PLANS).find(p => p.id === subscription.items.data[0].price.id);
  if (!plan) return;

  // Update or create subscription record
  await Subscription.findOneAndUpdate(
    { stripeSubscriptionId: subscription.id },
    {
      userId: user._id,
      stripeSubscriptionId: subscription.id,
      stripeCustomerId: customerId,
      status: subscription.status,
      planId: plan.id,
      planName: plan.name,
      priceId: subscription.items.data[0].price.id,
      currentPeriodStart: new Date((subscription as any).current_period_start * 1000),
      currentPeriodEnd: new Date((subscription as any).current_period_end * 1000),
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      canceledAt: subscription.canceled_at ? new Date(subscription.canceled_at * 1000) : undefined,
      trialStart: subscription.trial_start ? new Date(subscription.trial_start * 1000) : undefined,
      trialEnd: subscription.trial_end ? new Date(subscription.trial_end * 1000) : undefined,
    },
    { upsert: true }
  );

  // Update user subscription info
  await User.findByIdAndUpdate(user._id, {
    subscription: {
      planId: plan.id,
      status: subscription.status,
      currentPeriodEnd: new Date((subscription as any).current_period_end * 1000),
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
    },
  });
};

const handleSubscriptionDeleted = async (subscription: Stripe.Subscription) => {
  await Subscription.findOneAndUpdate(
    { stripeSubscriptionId: subscription.id },
    { status: 'canceled', canceledAt: new Date() }
  );

  const customerId = subscription.customer as string;
  const user = await User.findOne({ stripeCustomerId: customerId });
  if (user) {
    await User.findByIdAndUpdate(user._id, {
      subscription: {
        planId: null,
        status: 'canceled',
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
      { status: 'past_due' }
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