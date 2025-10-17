# How to Find Your Correct Integration ID

## Current Issue
- Integration ID 4279357 returns "Invalid Payment method integration"
- System is correctly using environment variable
- Need to find the valid Integration ID from your Paymob dashboard

## Step-by-Step Guide

### Method 1: Paymob Dashboard
1. **Login** to https://accept.paymob.com
2. **Navigate** to Dashboard → Developers → Payment Integrations
3. **Look for** "Card Payment", "Online Payment", or "Credit Card" integration
4. **Copy** the Integration ID number shown

### Method 2: API Settings
1. Go to **Settings → API**
2. Find integration configurations
3. Look for Integration ID associated with card payments

### Method 3: Check Integration Status
1. In Payment Integrations, verify the integration is **Active** (not Pending)
2. Ensure it supports Visa/Mastercard
3. Confirm it's set for your correct business mode (Test vs Live)

## Alternative: Use Working Integration ID
Based on our previous testing, Integration ID **4723444** was confirmed working. You could try:
1. Update INTEGRATION_ID secret to: **4723444**
2. Test the payment flow

## Quick Test
After updating the Integration ID:
1. The system will automatically use the new value
2. Try creating a payment
3. Should not get "Invalid Payment method integration" error

## Contact Support
If you can't find the correct Integration ID:
- Contact Paymob support: support@paymob.com
- Call Egypt hotline: 19079
- Ask them to verify your card payment Integration ID

The system is working correctly - it just needs the right Integration ID from your dashboard.