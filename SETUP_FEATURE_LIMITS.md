# Quick Setup Guide - Feature Limits System

## What Was Changed

### 1. **New Files Created**
- `src/config/feature_limits.ts` - Configuration for feature limits and mappings
- `FEATURE_LIMITS_SYSTEM.md` - Complete documentation
- `SETUP_FEATURE_LIMITS.md` - This file

### 2. **Models Updated**
- `src/types/user_type.ts` - Added `IFeatureUsage` interface
- `src/models/user_model.ts` - Added `featureUsage` field to track requests

### 3. **Middleware Updated**
- `src/middlewares/pro_checker.ts` - Now enforces per-feature limits instead of unlimited access

### 4. **Services Updated**
- `src/services/stripe_service.ts`:
  - Added `createTopUpCheckoutSession()` function
  - Added `handleTopUpPayment()` webhook handler
  - Updated `handleCheckoutCompleted()` to support both subscription and top-up payments
  - Updated `handleSubscriptionUpdated()` to reset feature limits on renewal

### 5. **Controllers Updated**
- `src/controllers/subscription_controller.ts`:
  - Added `createTopUp()` method
  - Added `getFeatureUsage()` method

### 6. **Routes Updated**
- `src/routes/subscription_routes.ts`:
  - Added `POST /top-up` endpoint
  - Added `GET /feature-usage` endpoint

---

## Required Actions Before Going Live

### ⚠️ CRITICAL: Update Stripe Configuration

1. **Create Top-Up Product in Stripe Dashboard**
   ```
   - Login to Stripe Dashboard
   - Navigate to Products → Create Product
   - Name: "Feature Top-Up"
   - Description: "Add 1 request to each premium feature"
   - Price: $2.99 USD
   - Payment type: One-time
   - Copy the Price ID (starts with price_...)
   ```

2. **Update Feature Limits Config**
   
   Edit `src/config/feature_limits.ts`:
   ```typescript
   export const FEATURE_LIMITS = {
     SUBSCRIPTION_INITIAL_LIMIT: 5,
     TOP_UP_LIMIT: 1,
     TOP_UP_PRICE: 2.99,
     TOP_UP_PRICE_ID: 'price_YOUR_ACTUAL_STRIPE_PRICE_ID', // ⚠️ UPDATE THIS
   };
   ```

### 🔄 Optional: Adjust Limits

If you want different limits, edit `src/config/feature_limits.ts`:

```typescript
export const FEATURE_LIMITS = {
  SUBSCRIPTION_INITIAL_LIMIT: 10, // Change from 5 to 10
  TOP_UP_LIMIT: 2,                // Give 2 requests instead of 1
  TOP_UP_PRICE: 4.99,             // Change price
  TOP_UP_PRICE_ID: 'price_...',
};
```

---

## Testing in Development

### 1. Test Subscription Flow
```bash
# User subscribes
POST /api/subscription/create

# Check feature usage (should show 5 for each feature)
GET /api/subscription/feature-usage

# Use a premium feature (e.g., criminal search)
POST /api/app-service/enformion-criminal-search

# Check again (should show 4 for that feature)
GET /api/subscription/feature-usage
```

### 2. Test Top-Up Flow
```bash
# Request top-up checkout
POST /api/subscription/top-up

# Complete payment in Stripe
# (Use test card: 4242 4242 4242 4242)

# Check feature usage (all features should increment by 1)
GET /api/subscription/feature-usage
```

### 3. Test Feature Limit Enforcement
```bash
# Use a feature 5 times until it reaches 0
# The 6th request should return 403 with message to top up
```

---

## Deployment Checklist

- [ ] Update `TOP_UP_PRICE_ID` in `feature_limits.ts`
- [ ] Test subscription creation in Stripe test mode
- [ ] Test top-up payment in Stripe test mode
- [ ] Verify webhook events are received correctly
- [ ] Test feature usage tracking
- [ ] Test limit enforcement (reaching 0 requests)
- [ ] Test subscription renewal resets limits
- [ ] Update client app to show feature usage
- [ ] Update client app to show top-up option
- [ ] Deploy to production
- [ ] Switch Stripe to live mode
- [ ] Monitor webhook events in production
- [ ] Test with real payment

---

## Client Integration Points

### 1. Display Feature Usage
```typescript
// Call this endpoint to show user their remaining requests
GET /api/subscription/feature-usage

// Response example:
{
  "featureUsage": {
    "enformionCriminalSearch": 3,
    "enformionNumberSearch": 5,
    "nameLookup": 2,
    // ...
  }
}
```

### 2. Handle "Out of Requests" Error
```typescript
// When API returns 403 for a premium feature:
{
  "message": "No requests remaining for this feature",
  "feature": "enformionCriminalSearch",
  "details": {
    "topUpPrice": 2.99,
    "suggestion": "Purchase a top-up for $2.99..."
  }
}

// Show top-up purchase button
```

### 3. Top-Up Purchase
```typescript
// Create checkout session
POST /api/subscription/top-up

// Response:
{
  "checkoutUrl": "https://checkout.stripe.com/...",
  "sessionId": "cs_..."
}

// Redirect user to checkoutUrl
```

### 4. Success Redirect
Update success URL in client:
```
/subscription/top-up-success?session_id={CHECKOUT_SESSION_ID}
```

---

## Monitoring & Analytics

### Key Metrics to Track

1. **Feature Usage per User**
   - Which features are used most?
   - Average requests per billing cycle

2. **Top-Up Conversion Rate**
   - How many users buy top-ups?
   - When do they typically run out?

3. **Revenue Analysis**
   - Subscription revenue vs top-up revenue
   - Average revenue per user (ARPU)

### Database Queries

```javascript
// Find users running low on requests
db.users.find({
  "subscription.status": "active",
  $or: [
    { "featureUsage.enformionCriminalSearch": { $lte: 1 } },
    { "featureUsage.nameLookup": { $lte: 1 } },
    // ... other features
  ]
})

// Count top-up purchases this month
// (Check Stripe dashboard or query payment metadata)
```

---

## Rollback Plan

If you need to revert to unlimited access:

1. **Comment out feature limit checks in `pro_checker.ts`**:
   ```typescript
   // Quick rollback: just check subscription status
   if (hasActiveSubscription) {
     next();
     return;
   }
   ```

2. **Keep the new endpoints** (they won't break anything)

3. **Remove from client** any UI showing feature usage

---

## Support & Troubleshooting

### Issue: Feature limits not resetting on renewal
- Check webhook is receiving `invoice.payment_succeeded`
- Verify `handleSubscriptionUpdated()` is called
- Check database: user.featureUsage should update

### Issue: Top-up payment not adding requests
- Check webhook received `checkout.session.completed`
- Verify metadata.type === 'top_up'
- Check `handleTopUpPayment()` executed successfully

### Issue: User sees "Invalid premium feature access"
- Check `ROUTE_TO_FEATURE_MAP` includes the route
- Verify route path matches exactly (including `/api/app-service/`)

---

## Next Steps

1. ✅ Complete Stripe product setup
2. ✅ Update configuration with real Price ID
3. ✅ Test in development
4. ✅ Update client app UI
5. ✅ Deploy and test in production
6. 📊 Monitor usage and adjust limits as needed
7. 💰 Analyze revenue impact

**Ready to go!** The system is fully implemented and production-ready once you complete the Stripe configuration.
