# Athlete360 Deployment Guide

## Current Status
- Application: Ready for deployment ✓
- Payment Integration: Configured for athlete360.ai ✓
- Domain: athlete360.ai (needs DNS setup)

## Deployment Steps

### 1. Deploy Application
- Click the Deploy button in Replit
- Choose Autoscale deployment type (recommended for production)
- Wait for deployment to complete

### 2. Custom Domain Setup
1. In Replit Deployments:
   - Add `athlete360.ai` as custom domain
   - Copy the A record IP address
   - Copy the TXT record value

2. In Domain Registrar (GoDaddy/Namecheap/etc):
   ```
   A Record:
   Host: @
   Value: [IP from Replit]
   TTL: 3600

   TXT Record:
   Host: @
   Value: [TXT from Replit]
   TTL: 3600
   ```

3. Wait for DNS propagation (5 minutes - 48 hours)

### 3. Verify Setup
- Check domain: https://athlete360.ai
- Test payment flow with callbacks
- Verify SSL certificate auto-generation

## Payment Callback URLs (Already Configured)
- Processed: https://athlete360.ai/api/payments/paymob-processed
- Response: https://athlete360.ai/api/payments/paymob-response

## Environment Variables Required
- PAYMOB_SECRET_KEY: [Your secret key]
- PAYMOB_PUBLIC_KEY: [Your public key]
- PAYMOB_INTEGRATION_ID: 4233746
- GOOGLE_API_KEY: [For AI features]
- DATABASE_URL: [Auto-configured]

## Post-Deployment Testing
1. Visit https://athlete360.ai
2. Login with test account
3. Test payment flow with test cards:
   - Visa: 4987654321098769
   - CVV: 123, Expiry: 05/25
4. Verify successful redirect to payment-success page