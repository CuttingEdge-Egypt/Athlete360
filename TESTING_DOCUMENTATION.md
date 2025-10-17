# Athlete360 Testing Documentation

## Testing Architecture Overview

The Athlete360 platform includes a comprehensive testing suite designed to validate both frontend user experience and backend API functionality across different environments.

## Test Suite Components

### 1. Browser Automation Testing
**File:** `crawler_test.js`
**Purpose:** End-to-end user flow automation
**Technology:** Puppeteer

#### Features:
- Complete signup process automation
- Payment card registration simulation
- Token purchase workflow testing
- Visual debugging capabilities
- Headless mode for CI/CD environments

#### Test Flow:
1. Navigate to landing page
2. Open signup modal
3. Fill personal information (name, email)
4. Add payment card details
5. Complete signup with authentication
6. Navigate to payment center
7. Purchase tokens using registered card
8. Verify token balance update

#### Usage:
```bash
# Visual mode (for debugging)
node crawler_test.js

# Headless mode (for automation)
HEADLESS=true node crawler_test.js
```

### 2. Public API Validation
**File:** `test_public_endpoints.js`
**Purpose:** Backend infrastructure validation
**Technology:** Node.js fetch API

#### Validates:
- Server health and responsiveness
- Sports catalog endpoint
- Countries data endpoint
- Athlete search functionality
- Authentication protection
- Error handling

#### Results Format:
```
Server Health: ✅ PASS
Sports Endpoint: ✅ PASS
Countries Endpoint: ✅ PASS
Athlete Search: ✅ PASS
Athlete Search by Name: ✅ PASS
Signup Validation: ✅ PASS

Overall: 6/6 tests passed
```

### 3. Development Flow Simulation
**File:** `test_development_plan.js`
**Purpose:** Complete workflow validation via API
**Technology:** Node.js with session simulation

#### Test Areas:
- Authentication flow simulation
- Signup completion endpoint
- Payment method management
- Token purchase processing
- Referral system integration

#### Report Format:
```
📊 DEVELOPMENT TEST REPORT
===================================================

🔐 AUTHENTICATION SIMULATION
🔳 SIGNUP COMPLETION  
💳 PAYMENT METHOD MANAGEMENT
🪙 TOKEN PURCHASE TESTING
🔗 REFERRAL SYSTEM

🎯 SUMMARY: X/5 test areas working
```

### 4. Direct API Testing
**File:** `test_api_flow.js`
**Purpose:** Low-level endpoint validation
**Technology:** Direct HTTP requests

## Environment Compatibility

### Replit Environment
**Supported:**
- ✅ API endpoint testing
- ✅ Development flow simulation  
- ✅ Direct API validation
- ✅ Authentication testing

**Limited:**
- ❌ Browser automation (system library requirements)

### Local Development Environment
**Supported:**
- ✅ All testing methods
- ✅ Full browser automation
- ✅ Visual debugging
- ✅ Complete end-to-end flows

## Test Data Management

### User Data Generation:
```javascript
testUser: {
  firstName: 'Test',
  lastName: 'User', 
  email: `test.user.${Date.now()}@example.com`,
  cardNumber: '4111111111111111', // Test Visa card
  expiry: '12/26',
  cvv: '123'
}
```

### Test Card Details:
- **Card Number:** 4111111111111111 (Test Visa)
- **Expiry:** 12/26  
- **CVV:** 123
- **Cardholder:** Test User

## Selector Strategy

All interactive elements use `data-testid` attributes for reliable element selection:

```html
<button data-testid="button-signup">Sign Up</button>
<input data-testid="input-email" />
<div data-testid="token-balance">1000/1000</div>
```

## Error Handling

### Network Errors:
- Timeout handling (15 second default)
- Connection retry logic
- Graceful degradation

### Authentication Errors:
- 401 Unauthorized detection
- Session expiration handling
- Login flow redirection

### Payment Errors:
- Invalid card detection
- Insufficient funds handling
- Transaction failure recovery

## Performance Metrics

### Response Time Targets:
- API endpoints: < 200ms
- Page load: < 3 seconds
- Form submission: < 5 seconds

### Success Criteria:
- All public endpoints functional
- Authentication properly secured
- Payment processing operational
- Token balance tracking accurate

## Continuous Integration

### Recommended CI Pipeline:
1. **Lint and Type Check:** TypeScript validation
2. **Unit Tests:** Component-level testing
3. **API Tests:** `test_public_endpoints.js`
4. **Flow Tests:** `test_development_plan.js`
5. **E2E Tests:** `crawler_test.js` (local environments)

### Test Commands:
```bash
# Quick validation (always works)
npm run test:api

# Complete validation (local only)
npm run test:full

# Development validation
npm run test:dev
```

## Debugging Guide

### Common Issues:

1. **Browser Launch Failure:**
   - Install system dependencies
   - Use headless mode
   - Check environment compatibility

2. **API Authentication Errors:**
   - Verify session management
   - Check OIDC configuration
   - Validate environment variables

3. **Payment Processing Failures:**
   - Confirm payment service integration
   - Validate test card numbers
   - Check transaction logging

### Debug Tools:
- Console logging for all API calls
- Browser developer tools integration
- Network request monitoring
- Error stack trace capture

## Test Maintenance

### Regular Tasks:
- Update test data monthly
- Verify test card validity
- Review endpoint changes
- Update selector mappings

### When to Update Tests:
- UI component changes
- API endpoint modifications
- Authentication flow updates
- Payment method changes

## Reporting

### Test Results Storage:
- Console output for immediate feedback
- Structured JSON for automation
- Screenshots for visual validation
- Performance metrics logging

### Success Metrics Tracking:
- Endpoint availability percentages
- Response time measurements
- Error rate monitoring
- User flow completion rates