# Athlete360.ai Payment Integration Guide

## Files to Update

Add the code from `athlete360_payment_endpoints.js` to your main Express server file on athlete360.ai.

## Required Dependencies

Make sure your athlete360.ai server has these middleware installed:

```bash
npm install express body-parser
```

## Middleware Setup

Ensure your Express app has proper middleware for handling JSON and URL-encoded data:

```javascript
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
```

## Integration Steps

1. **Copy the endpoints** from `athlete360_payment_endpoints.js` to your main server file
2. **Add token crediting logic** in the paymob-processed endpoint where the TODO comment is located
3. **Test the endpoints** by visiting:
   - POST `https://athlete360.ai/api/payments/paymob-processed` (for Paymob webhooks)
   - GET `https://athlete360.ai/api/payments/paymob-response` (for user redirects)
   - GET `https://athlete360.ai/payment-success` (for success page)

## Token Crediting Logic

You'll need to implement the token crediting based on your user system. Example:

```javascript
// Extract user ID from merchant_order_id format: "tokens_USER_ID_TIMESTAMP"
const userId = transaction.merchant_order_id.split('_')[1];

// Add tokens to user account
await addTokensToUser(userId, tokensToAdd);
```

## Payment Package Mapping

- 15 EGP = 500 tokens
- 25 EGP = 1000 tokens  
- 50 EGP = 2500 tokens

## Paymob Integration Verified ✅

Your Paymob integration (ID: 4233746) is correctly configured with:
- **Processed callback**: `https://athlete360.ai/api/payments/paymob-processed`
- **Response callback**: `https://athlete360.ai/api/payments/paymob-response`

## Testing

After implementing these endpoints, test the payment flow:

1. Make a payment using test cards:
   - Visa: 4987654321098769 (CVV: 123, Expiry: 05/25)
   - Mastercard: 5123456789012346 (CVV: 123, Expiry: 05/25)

2. Verify callbacks are received and processed correctly
3. Check that users are redirected to the appropriate success/failure pages