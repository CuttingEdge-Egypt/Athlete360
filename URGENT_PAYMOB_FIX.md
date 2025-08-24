# 🚨 URGENT: Paymob Integration Issue

## Root Cause Found ✅

The "Invalid credentials" error is happening because the **callback URLs in your Paymob dashboard** are wrong.

From the error data:
```
"redirection_url":"http://0.0.0.0:8000/parent/paymob-callback/"
```

This means your Paymob dashboard still has **old callback URLs** that point to a local development server (`0.0.0.0:8000`) instead of your current Replit application.

## Immediate Fix Required

### 1. Login to Paymob Dashboard
https://accept.paymobsolutions.com/portal2/en/PaymentIntegrations

### 2. Find Integration ID: 3036500

### 3. Update BOTH Callback URLs to:

**Current Wrong URLs (causing the error):**
```
Transaction processed callback: http://0.0.0.0:8000/parent/paymob-callback/
Transaction response callback: http://0.0.0.0:8000/parent/paymob-callback/
```

**Correct URLs (MUST update to):**
```
Transaction processed callback: https://7a39e49f-f0e4-4a38-b983-657e85e5de90-00-24ejenwpt1nmi.riker.replit.dev/api/payments/paymob-processed
Transaction response callback: https://7a39e49f-f0e4-4a38-b983-657e85e5de90-00-24ejenwpt1nmi.riker.replit.dev/api/payments/paymob-response
```

## Why This Happens

When you click "Pay" in the Paymob iframe:
1. ✅ Paymob validates your card details
2. ❌ Paymob tries to validate the transaction with `http://0.0.0.0:8000` (unreachable)
3. ❌ Validation fails → "Invalid credentials" error
4. ❌ Payment rejected before OTP

## After Fixing

Once you update these URLs in the Paymob dashboard:
1. ✅ Card validation will work
2. ✅ OTP verification will proceed
3. ✅ Payment completion will redirect properly
4. ✅ Tokens will be added automatically

## Verification Steps

After updating the URLs:
1. Test a small payment (50 EGP / 500 tokens)
2. Complete OTP verification
3. Verify redirection to success page
4. Check tokens are added to account

**This is the only issue preventing payments from working!**