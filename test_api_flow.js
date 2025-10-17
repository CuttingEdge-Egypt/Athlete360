/**
 * API Flow Test for Athlete360 Platform
 * 
 * This script tests the backend API endpoints directly without browser automation:
 * 1. Tests signup completion API
 * 2. Tests token purchase API
 * 
 * Usage: node test_api_flow.js
 */

import fetch from 'node-fetch';

class Athlete360APITester {
  constructor() {
    this.baseUrl = 'http://localhost:5000';
    this.testUser = {
      firstName: 'API',
      lastName: 'Tester',
      email: `api.test.${Date.now()}@example.com`,
      cardToken: `card_token_${Date.now()}`,
      cardLast4: '1111',
      cardBrand: 'Visa',
      paymobCustomerId: `customer_${Date.now()}`
    };
    this.sessionCookie = null;
  }

  async testSignupCompletion() {
    console.log('🔐 Testing signup completion API...');
    
    try {
      const response = await fetch(`${this.baseUrl}/api/auth/complete-signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          cardToken: this.testUser.cardToken,
          cardLast4: this.testUser.cardLast4,
          cardBrand: this.testUser.cardBrand,
          paymobCustomerId: this.testUser.paymobCustomerId,
          referralCode: null
        })
      });

      const result = await response.json();
      console.log(`📡 Signup API Response (${response.status}):`, result);
      
      if (response.ok && result.success) {
        console.log('✅ Signup completion API test passed');
        // Extract session cookie if available
        const setCookie = response.headers.get('set-cookie');
        if (setCookie) {
          this.sessionCookie = setCookie;
        }
        return true;
      } else {
        console.log('❌ Signup completion API test failed');
        return false;
      }
    } catch (error) {
      console.error('❌ Signup API error:', error);
      return false;
    }
  }

  async testTokenPurchase() {
    console.log('🪙 Testing token purchase API...');
    
    try {
      const response = await fetch(`${this.baseUrl}/api/user/purchase-tokens`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': this.sessionCookie || ''
        },
        body: JSON.stringify({
          transactionId: `txn_${Date.now()}`,
          amount: 25.00,
          tokensAmount: 1000,
          paymentMethod: 'card',
          cardLast4: this.testUser.cardLast4,
          cardBrand: this.testUser.cardBrand
        })
      });

      const result = await response.json();
      console.log(`📡 Token Purchase API Response (${response.status}):`, result);
      
      if (response.ok && result.success) {
        console.log('✅ Token purchase API test passed');
        return true;
      } else {
        console.log('❌ Token purchase API test failed');
        return false;
      }
    } catch (error) {
      console.error('❌ Token purchase API error:', error);
      return false;
    }
  }

  async testUserProfile() {
    console.log('👤 Testing user profile API...');
    
    try {
      const response = await fetch(`${this.baseUrl}/api/user/profile`, {
        headers: {
          'Cookie': this.sessionCookie || ''
        }
      });

      const result = await response.json();
      console.log(`📡 Profile API Response (${response.status}):`, result);
      
      if (response.ok) {
        console.log('✅ User profile API test passed');
        return true;
      } else {
        console.log('❌ User profile API test failed');
        return false;
      }
    } catch (error) {
      console.error('❌ Profile API error:', error);
      return false;
    }
  }

  async testPaymentMethods() {
    console.log('💳 Testing payment methods API...');
    
    try {
      const response = await fetch(`${this.baseUrl}/api/user/cards`, {
        headers: {
          'Cookie': this.sessionCookie || ''
        }
      });

      const result = await response.json();
      console.log(`📡 Payment Methods API Response (${response.status}):`, result);
      
      if (response.ok) {
        console.log('✅ Payment methods API test passed');
        return true;
      } else {
        console.log('❌ Payment methods API test failed');
        return false;
      }
    } catch (error) {
      console.error('❌ Payment methods API error:', error);
      return false;
    }
  }

  async runAPITests() {
    console.log('🚀 Starting Athlete360 API Tests...');
    
    const results = {
      signup: false,
      tokenPurchase: false,
      profile: false,
      paymentMethods: false
    };

    // Test 1: Signup completion
    results.signup = await this.testSignupCompletion();
    
    // Test 2: User profile (should work regardless of auth for testing)
    results.profile = await this.testUserProfile();
    
    // Test 3: Payment methods
    results.paymentMethods = await this.testPaymentMethods();
    
    // Test 4: Token purchase
    results.tokenPurchase = await this.testTokenPurchase();
    
    // Summary
    console.log('\n📊 Test Results Summary:');
    console.log(`Signup Completion: ${results.signup ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`User Profile: ${results.profile ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`Payment Methods: ${results.paymentMethods ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`Token Purchase: ${results.tokenPurchase ? '✅ PASS' : '❌ FAIL'}`);
    
    const passCount = Object.values(results).filter(Boolean).length;
    console.log(`\n🎯 Overall: ${passCount}/4 tests passed`);
    
    return results;
  }
}

// Run the API tests
const apiTester = new Athlete360APITester();
apiTester.runAPITests().then((results) => {
  const allPassed = Object.values(results).every(Boolean);
  console.log(allPassed ? '\n🎉 All API tests passed!' : '\n⚠️  Some API tests failed');
  process.exit(allPassed ? 0 : 1);
}).catch(error => {
  console.error('💥 API test execution failed:', error);
  process.exit(1);
});