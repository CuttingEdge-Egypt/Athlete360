# Paymob URL Domain Fix - August 31, 2025

## Issue
Received email from Paymob support indicating that the payment integration was using an incorrect redirection_url:
- **Incorrect**: `https://athlete360-cuttingmo.replit.app/api/payments/paymob-response`
- **Correct**: `https://athlete-360-cuttingmo.replit.app/api/payments/paymob-response`

## Root Cause
The `server/paymobService.ts` file was hardcoded with the wrong domain format missing the hyphen between "athlete" and "360".

## Fix Applied
- Updated `baseUrl` in `server/paymobService.ts` from `athlete360-cuttingmo` to `athlete-360-cuttingmo`
- This affects both `notification_url` and `redirection_url` parameters sent to Paymob's Intention API

## Files Modified
- `server/paymobService.ts` - Line 77: Fixed baseUrl constant

## Impact
- Payment callbacks should now redirect to the correct domain
- Token crediting should work properly after successful payments
- No more URL mismatch issues with Paymob dashboard configuration

## Status
✅ **FIXED** - Domain URL corrected in payment integration