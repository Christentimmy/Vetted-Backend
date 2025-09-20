

// types/stripe.ts
import Stripe from 'stripe';

// Extend Express Request to include user and subscription
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        [key: string]: any;
      };
      subscription?: {
        _id: string;
        userId: string;
        stripeSubscriptionId: string;
        status: string;
        planId: string;
        planName: string;
        currentPeriodEnd: Date;
        [key: string]: any;
      };
    }
  }
}

// Helper type for subscription status
export type SubscriptionStatus = 'active' | 'canceled' | 'past_due' | 'unpaid' | 'incomplete';

// Helper interface for plan configuration
export interface Plan {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  interval: string;
  priceId: string;
  features: string[];
}

// Type guard functions for Stripe objects
export const isStripeSubscription = (obj: any): obj is Stripe.Subscription => {
  return obj && typeof obj === 'object' && 'id' in obj && 'object' in obj && obj.object === 'subscription';
};

export const isStripeInvoice = (obj: any): obj is Stripe.Invoice => {
  return obj && typeof obj === 'object' && 'id' in obj && 'object' in obj && obj.object === 'invoice';
};

export const isStripeCheckoutSession = (obj: any): obj is Stripe.Checkout.Session => {
  return obj && typeof obj === 'object' && 'id' in obj && 'object' in obj && obj.object === 'checkout.session';
};

// Helper functions for safe property access
export const getSubscriptionProperty = (subscription: Stripe.Subscription, property: string): any => {
  return (subscription as any)[property];
};

export const getInvoiceProperty = (invoice: Stripe.Invoice, property: string): any => {
  return (invoice as any)[property];
};