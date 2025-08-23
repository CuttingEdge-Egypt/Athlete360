# Paymob Integration ID Setup Instructions

## Current Status
- **System Updated**: All hard-coded Integration IDs removed
- **Environment Variable**: Now uses only INTEGRATION_ID from secrets
- **Current ID**: 4279357 (testing shows "Invalid Payment method integration")

## How to Find Your Correct Integration ID

### Step 1: Access Paymob Dashboard
1. Login to your Paymob account at https://accept.paymob.com
2. Navigate to **Dashboard**

### Step 2: Find Integration ID
**Method 1 - Payment Integrations:**
1. Go to **Developers → Payment Integrations**
2. Look for "Card Payment" or "Online Payment" integration
3. Copy the Integration ID number

**Method 2 - API Settings:**
1. Go to **Settings → API** 
2. Find your integration configurations
3. Look for the Integration ID associated with card payments

**Method 3 - iFrames Section:**
1. Go to **Developers → iFrames**
2. Find iframe integrations for card payments
3. Note the associated Integration ID

## Testing Integration ID
Once you have the correct Integration ID:

1. **Update Secret**: Change INTEGRATION_ID in your Replit secrets
2. **Test**: The system will automatically use the new ID
3. **Verify**: Payment flow should work without "Invalid Payment method integration" errors

## Common Integration Types
- **Card Payments** (Visa/Mastercard) - Usually the main integration needed
- **Apple Pay** - Separate integration ID  
- **Digital Wallets** - Different integration IDs
- **BNPL** (ValU, Souhoola, etc.) - Each has separate integration ID

## Troubleshooting
If Integration ID still fails:
1. **Check Dashboard Status**: Ensure integration is "Active" not "Pending"
2. **Verify Payment Method**: Confirm it's set up for "Card Payments"
3. **Test vs Live Mode**: Make sure you're using the correct mode
4. **Contact Support**: Paymob support can verify correct Integration IDs

The system is now fully flexible - just update the INTEGRATION_ID secret with the correct value from your dashboard.