# Feature-Based Request Limits System

## Overview

This system implements per-feature request limits for subscribed users instead of unlimited access. Each premium feature has a quota that can be topped up with one-time payments.

## How It Works

### 1. Subscription Benefits
- When a user subscribes to the Pro plan, they get **5 requests per feature**
- Features tracked:
  - `enformionCriminalSearch`
  - `enformionNumberSearch`
  - `nameLookup`
  - `searchOffender`
  - `tinEyeImageSearch`

### 2. Request Tracking
- Each time a premium feature is used, the counter for that specific feature decrements by 1
- When a feature reaches 0 requests, the user cannot use that feature until:
  - They purchase a top-up
  - Their subscription renews (resets all features to 5)

### 3. Top-Up System
- **Price**: $2.99 per top-up
- **Benefit**: Adds 1 request to **ALL** premium features
- **Requirement**: User must have an active subscription to purchase top-ups

### 4. Feature Limit Resets
- Feature limits reset to 5 when:
  - Subscription is renewed (monthly billing cycle)
  - User creates a new subscription
  - Subscription status changes to "active"

## API Endpoints

### Get Feature Usage
```
GET /api/subscription/feature-usage
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "featureUsage": {
    "enformionCriminalSearch": 3,
    "enformionNumberSearch": 5,
    "nameLookup": 2,
    "searchOffender": 4,
    "tinEyeImageSearch": 1,
    "lastResetDate": "2024-01-15T10:30:00.000Z"
  },
  "hasActiveSubscription": true
}
```

### Purchase Top-Up
```
POST /api/subscription/top-up
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "checkoutUrl": "https://checkout.stripe.com/...",
  "sessionId": "cs_test_..."
}
```

## Configuration

### Update Stripe Price ID

In `src/config/feature_limits.ts`, update the `TOP_UP_PRICE_ID`:

```typescript
export const FEATURE_LIMITS = {
  SUBSCRIPTION_INITIAL_LIMIT: 5,
  TOP_UP_LIMIT: 1,
  TOP_UP_PRICE: 2.99,
  TOP_UP_PRICE_ID: 'price_YOUR_STRIPE_PRICE_ID_HERE', // ⚠️ UPDATE THIS
};
```

### Create Stripe Product for Top-Up

1. Go to Stripe Dashboard → Products
2. Create a new product:
   - **Name**: Feature Top-Up
   - **Description**: Add 1 request to each premium feature
   - **Price**: $2.99 USD
   - **Type**: One-time payment
3. Copy the Price ID (starts with `price_`) and update `feature_limits.ts`

## User Flow

### First-Time Subscriber
1. User subscribes to Pro plan
2. System initializes feature usage with 5 requests per feature
3. User can use any premium feature up to 5 times
4. When a feature hits 0, user sees message to top up

### Top-Up Purchase
1. User requests top-up via `/api/subscription/top-up`
2. System creates Stripe checkout session
3. User completes payment
4. Webhook handler adds 1 request to all features
5. User can continue using features

### Subscription Renewal
1. Stripe processes monthly subscription payment
2. Webhook receives `invoice.payment_succeeded` event
3. System resets all feature limits to 5
4. User gets fresh quota for the new billing period

## Error Handling

### No Requests Remaining
**HTTP 403**
```json
{
  "message": "No requests remaining for this feature",
  "feature": "enformionCriminalSearch",
  "details": {
    "remainingRequests": 0,
    "suggestion": "Purchase a top-up for $2.99 to get 1 more request per feature",
    "topUpPrice": 2.99
  }
}
```

### No Active Subscription
**HTTP 403**
```json
{
  "message": "Premium access required",
  "details": {
    "hasSubscription": false,
    "creditsAvailable": 0,
    "suggestion": "Subscribe to get 5 requests per feature or invite friends to get free credits"
  }
}
```

### Top-Up Without Subscription
**HTTP 500**
```json
{
  "success": false,
  "error": "Active subscription required to purchase top-ups"
}
```

## Database Schema Changes

### User Model
Added `featureUsage` field:
```typescript
featureUsage: {
  enformionCriminalSearch: { type: Number, default: 0 },
  enformionNumberSearch: { type: Number, default: 0 },
  nameLookup: { type: Number, default: 0 },
  searchOffender: { type: Number, default: 0 },
  tinEyeImageSearch: { type: Number, default: 0 },
  lastResetDate: { type: Date, default: Date.now },
}
```

## Middleware Updates

### proChecker Middleware
- Now checks `featureUsage` for subscribed users
- Enforces per-feature limits
- Returns detailed error messages with remaining requests
- Automatically initializes feature usage if not present

## Webhook Events

### checkout.session.completed
- Handles both subscription and top-up payments
- Checks `metadata.type` to determine payment type
- For top-ups: calls `handleTopUpPayment()`
- For subscriptions: calls `handleSubscriptionUpdated()`

### customer.subscription.updated
- Resets feature limits when subscription becomes active
- Sets all features to 5 requests
- Updates `lastResetDate`

### invoice.payment_succeeded
- Triggered on subscription renewal
- Resets feature limits for new billing period

## Testing Checklist

- [ ] User subscribes → Gets 5 requests per feature
- [ ] Use feature → Counter decrements
- [ ] Feature at 0 → Error message displayed
- [ ] Purchase top-up → All features increment by 1
- [ ] Subscription renews → All features reset to 5
- [ ] Cancel subscription → Cannot purchase top-ups
- [ ] User without subscription → Cannot use premium features

## Migration Notes

**Existing Subscribers:**
- On next API call, `featureUsage` will be auto-initialized with 5 requests per feature
- No manual migration required
- Users will see their limits immediately

**Stripe Configuration:**
- Create the top-up product in Stripe Dashboard
- Update `TOP_UP_PRICE_ID` in feature_limits.ts
- Test with Stripe test mode before going live

## Future Enhancements

1. **Analytics Dashboard**
   - Track which features are used most
   - Monitor top-up purchase rates
   - Identify optimal pricing

2. **Bulk Top-Ups**
   - Offer packages (e.g., 5 top-ups for $12.99)
   - Discount for larger purchases

3. **Feature-Specific Top-Ups**
   - Allow users to top up individual features
   - Different pricing per feature based on third-party costs

4. **Usage Notifications**
   - Alert users when approaching limits
   - Prompt for top-up at 1-2 requests remaining

## Support & Maintenance

For issues or questions, check:
1. Stripe webhook logs for payment processing errors
2. Server logs for feature usage tracking
3. Database queries for feature usage stats
4. Monitor top-up conversion rates
