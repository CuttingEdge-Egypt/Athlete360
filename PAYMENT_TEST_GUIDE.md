# Payment Testing Guide

## Configuration Status ✅
- Integration ID: 4233746 (Online Card) ✅
- Iframe ID: 789693 ✅
- Callback URLs: Updated to your app URLs ✅
- Billing Data: Set to 'NA' format ✅

## Test Payment Flow

### 1. Start a Test Payment
1. Go to Payment Center
2. Select "Starter Pack" (15 EGP for 500 tokens)
3. Click "Purchase Now"

### 2. Enter Card Details
Use one of these test cards:

**For Successful Payment (No 3DS):**
- Card Number: 4987654321098769
- Expiry: 12/25
- CVV: 123

**For 3DS Testing (Will require OTP):**
- Card Number: 5123456789012346
- Expiry: 12/25
- CVV: 123

### 3. Complete Payment
- If using 3DS card, you'll be redirected to OTP page
- Enter any OTP (for test environment)
- You'll be redirected back to your app

### 4. Verify Success
After successful payment:
- You should see a success message
- Your token balance should increase by 500
- Check console logs for confirmation

## Expected Console Output
```
✅ Using Integration ID: 4233746 (Online Card)
✅ Using Iframe ID: 789693
✅ Payment successful
✅ Added 500 tokens to user account
```

## Troubleshooting

**If payment fails at OTP:**
- Check that callback URLs are correctly set in Paymob dashboard
- Verify URLs are your app URLs, not Paymob's

**If tokens not added:**
- Check server logs for callback processing
- Verify `/api/payments/paymob-processed` endpoint is receiving callbacks

**If redirect fails:**
- Check `/api/payments/paymob-response` endpoint
- Verify frontend is handling payment status parameters

## Server Logs to Monitor
Watch for these in the server console:
- `📥 Paymob processed callback` - Server received payment notification
- `✅ Payment successful` - Payment was verified
- `✅ Added X tokens to user` - Tokens were credited