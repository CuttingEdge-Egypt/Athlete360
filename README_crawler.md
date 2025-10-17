# Athlete360 Web Crawler Test

This crawler test automates the complete user flow for the Athlete360 platform:

## Features Tested

1. **Complete Signup Flow**
   - Fill personal information (name, email)
   - Add payment card information
   - Complete authentication process

2. **Token Purchase Flow**
   - Navigate to payment center
   - Purchase tokens using registered card
   - Verify token balance update

## Setup Instructions

1. **Install Dependencies**
   ```bash
   npm install puppeteer
   ```

2. **Ensure Application is Running**
   ```bash
   npm run dev  # Start the Athlete360 application
   ```

3. **Run the Crawler Test**
   ```bash
   node crawler_test.js
   ```

## Test Configuration

The crawler uses the following test data:

- **Test User**: Randomly generated email with timestamp
- **Test Card**: Visa test card (4111111111111111)
- **Card Details**: Valid test expiry date and CVV

## Visual vs Headless Mode

- **Visual Mode** (default): Browser window opens for visual debugging
- **Headless Mode**: Set `headless: true` in the script for CI/CD environments

## Test Data Selectors

The crawler relies on `data-testid` attributes for reliable element selection:

- `button-signup`: Main signup button
- `input-first-name`, `input-last-name`, `input-email`: Personal info fields
- `input-card-name`, `input-card-number`, `input-card-expiry`, `input-card-cvv`: Payment fields
- `button-complete-signup`: Final signup submission
- `button-payment-center`: Navigate to token purchase
- `token-balance`: Token balance display

## Error Handling

The crawler includes comprehensive error handling for:

- Network timeouts
- Element not found errors
- Payment processing failures
- Authentication flow interruptions

## Logging

Detailed console logging provides:

- Step-by-step progress tracking
- API response monitoring
- Error reporting
- Success confirmations

## Extending the Test

Additional test scenarios can be added by:

1. Creating new methods in the `Athlete360Crawler` class
2. Using the `TestScenarios` utility class for specific edge cases
3. Adding custom assertions for business logic validation

## Browser Compatibility

Tested with:
- Chrome (via Puppeteer)
- Chromium-based browsers
- Configurable viewport sizes

## Security Notes

- Uses test card numbers only
- Test emails with timestamp suffixes
- No real payment processing in test environment
- All sensitive data is contained within test scope