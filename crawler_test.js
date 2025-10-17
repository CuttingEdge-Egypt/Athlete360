/**
 * Web Crawler Test for Athlete360 Platform
 * 
 * This script automates the complete user flow:
 * 1. Signs up with card information
 * 2. Buys tokens using the registered card
 * 
 * Usage: node crawler_test.js
 * 
 * Requirements:
 * - Install: npm install puppeteer
 * - Ensure the application is running on port 5000
 */

import puppeteer from 'puppeteer';

class Athlete360Crawler {
  constructor() {
    this.browser = null;
    this.page = null;
    this.baseUrl = 'http://localhost:5000';
    this.testUser = {
      firstName: 'Test',
      lastName: 'User',
      email: `test.user.${Date.now()}@example.com`,
      cardNumber: '4111111111111111', // Test Visa card
      expiry: '12/26',
      cvv: '123',
      cardholderName: 'Test User'
    };
  }

  async init() {
    console.log('🚀 Starting Athlete360 Crawler Test...');
    
    this.browser = await puppeteer.launch({
      headless: 'new', // Use new headless mode for Replit compatibility
      slowMo: 50, // Slow down by 50ms for better reliability
      args: [
        '--no-sandbox', 
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu',
        '--window-size=1920,1080',
        '--remote-debugging-port=9222',
        '--disable-features=VizDisplayCompositor'
      ]
    });
    
    this.page = await this.browser.newPage();
    await this.page.setViewport({ width: 1920, height: 1080 });
    
    // Enable request/response logging
    this.page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log('❌ Browser Error:', msg.text());
      }
    });
    
    this.page.on('response', response => {
      if (response.url().includes('/api/')) {
        console.log(`📡 API Response: ${response.status()} ${response.url()}`);
      }
    });
  }

  async navigateToHomePage() {
    console.log('📍 Navigating to home page...');
    await this.page.goto(this.baseUrl, { waitUntil: 'networkidle2' });
    
    // Wait for page to load
    await this.page.waitForSelector('[data-testid="landing-page"]', { timeout: 10000 });
    console.log('✅ Landing page loaded successfully');
  }

  async startSignupFlow() {
    console.log('🔐 Starting signup flow...');
    
    // Look for and click the signup button
    await this.page.waitForSelector('[data-testid="button-signup"]', { timeout: 5000 });
    await this.page.click('[data-testid="button-signup"]');
    
    // Wait for signup modal to appear
    await this.page.waitForSelector('[data-testid="signup-flow-dialog"]', { timeout: 5000 });
    console.log('✅ Signup modal opened');
  }

  async fillPersonalInformation() {
    console.log('👤 Filling personal information...');
    
    // Fill first name
    await this.page.waitForSelector('[data-testid="input-first-name"]', { timeout: 5000 });
    await this.page.type('[data-testid="input-first-name"]', this.testUser.firstName);
    
    // Fill last name
    await this.page.type('[data-testid="input-last-name"]', this.testUser.lastName);
    
    // Fill email
    await this.page.type('[data-testid="input-email"]', this.testUser.email);
    
    console.log(`✅ Personal info filled: ${this.testUser.firstName} ${this.testUser.lastName} (${this.testUser.email})`);
    
    // Continue to payment method
    await this.page.click('[data-testid="button-continue-personal"]');
    
    // Wait for payment tab to become active
    await this.page.waitForSelector('[data-testid="input-card-name"]', { timeout: 5000 });
    console.log('✅ Moved to payment method step');
  }

  async fillPaymentInformation() {
    console.log('💳 Filling payment information...');
    
    // Fill cardholder name
    await this.page.type('[data-testid="input-card-name"]', this.testUser.cardholderName);
    
    // Fill card number
    await this.page.type('[data-testid="input-card-number"]', this.testUser.cardNumber);
    
    // Fill expiry date
    await this.page.type('[data-testid="input-card-expiry"]', this.testUser.expiry);
    
    // Fill CVV
    await this.page.type('[data-testid="input-card-cvv"]', this.testUser.cvv);
    
    console.log('✅ Payment information filled');
  }

  async completeSignup() {
    console.log('📝 Completing signup...');
    
    // Submit the signup form
    await this.page.click('[data-testid="button-complete-signup"]');
    
    // Wait for redirect to Replit auth or success
    await this.page.waitForTimeout(3000);
    
    // Check if we're redirected to login
    const currentUrl = this.page.url();
    if (currentUrl.includes('/api/login')) {
      console.log('🔄 Redirected to authentication flow');
      
      // Handle Replit auth flow (this might need adjustment based on actual flow)
      await this.page.waitForTimeout(5000);
      
      // Wait for redirect back to home page
      await this.page.waitForSelector('[data-testid="home-page"]', { timeout: 15000 });
      console.log('✅ Authentication completed, back to home page');
    } else {
      // Direct completion
      await this.page.waitForSelector('[data-testid="home-page"]', { timeout: 10000 });
      console.log('✅ Signup completed successfully');
    }
  }

  async navigateToPaymentCenter() {
    console.log('💰 Navigating to payment center...');
    
    // Click on Buy Tokens button or navigate to payment center
    await this.page.waitForSelector('[data-testid="button-payment-center"]', { timeout: 5000 });
    await this.page.click('[data-testid="button-payment-center"]');
    
    // Wait for payment center page to load
    await this.page.waitForSelector('[data-testid="payment-center-page"]', { timeout: 5000 });
    console.log('✅ Payment center loaded');
  }

  async purchaseTokens(tokenAmount = 1000) {
    console.log(`🪙 Purchasing ${tokenAmount} tokens...`);
    
    // Look for token purchase options
    const tokenButtons = await this.page.$$('[data-testid*="button-buy-tokens"]');
    
    if (tokenButtons.length === 0) {
      console.log('❌ No token purchase buttons found');
      return false;
    }
    
    // Click on the first available token purchase option
    await tokenButtons[0].click();
    
    // Wait for payment processing
    await this.page.waitForSelector('[data-testid="payment-processing"]', { timeout: 5000 });
    console.log('🔄 Processing payment...');
    
    // Wait for success confirmation
    try {
      await this.page.waitForSelector('[data-testid="payment-success"]', { timeout: 15000 });
      console.log('✅ Token purchase successful!');
      return true;
    } catch (error) {
      console.log('❌ Token purchase failed or timed out');
      return false;
    }
  }

  async verifyTokenBalance() {
    console.log('🔍 Verifying token balance...');
    
    // Look for token balance display
    const tokenBalance = await this.page.$eval('[data-testid="token-balance"]', el => el.textContent);
    console.log(`✅ Current token balance: ${tokenBalance}`);
    
    return tokenBalance;
  }

  async runFullTest() {
    try {
      await this.init();
      
      // Step 1: Navigate and start signup
      await this.navigateToHomePage();
      await this.startSignupFlow();
      
      // Step 2: Complete signup with card
      await this.fillPersonalInformation();
      await this.fillPaymentInformation();
      await this.completeSignup();
      
      // Step 3: Purchase tokens
      await this.navigateToPaymentCenter();
      const purchaseSuccess = await this.purchaseTokens(1000);
      
      // Step 4: Verify results
      if (purchaseSuccess) {
        await this.verifyTokenBalance();
        console.log('🎉 Crawler test completed successfully!');
      } else {
        console.log('⚠️  Crawler test completed with payment issues');
      }
      
    } catch (error) {
      console.error('❌ Crawler test failed:', error);
    } finally {
      await this.cleanup();
    }
  }

  async cleanup() {
    console.log('🧹 Cleaning up...');
    if (this.browser) {
      await this.browser.close();
    }
  }
}

// Additional utility functions for testing different scenarios
class TestScenarios {
  static async testInvalidCard() {
    console.log('🧪 Testing invalid card scenario...');
    // Implementation for testing invalid card handling
  }
  
  static async testInsufficientBalance() {
    console.log('🧪 Testing insufficient balance scenario...');
    // Implementation for testing insufficient balance handling
  }
  
  static async testReferralFlow() {
    console.log('🧪 Testing referral flow...');
    // Implementation for testing referral link functionality
  }
}

// Export for use in other test files
export { Athlete360Crawler, TestScenarios };

// Run the test if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const crawler = new Athlete360Crawler();
  
  // Handle process termination gracefully
  process.on('SIGINT', async () => {
    console.log('\n⏹️  Terminating crawler test...');
    await crawler.cleanup();
    process.exit(0);
  });
  
  // Run the full test suite
  crawler.runFullTest().then(() => {
    console.log('📊 Test execution completed');
    process.exit(0);
  }).catch(error => {
    console.error('💥 Test execution failed:', error);
    process.exit(1);
  });
}