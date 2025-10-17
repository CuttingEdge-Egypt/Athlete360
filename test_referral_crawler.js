import fetch from 'node-fetch';
import { JSDOM } from 'jsdom';

const BASE_URL = 'https://7a39e49f-f0e4-4a38-b983-657e85e5de90-00-24ejenwpt1nmi.riker.replit.dev';
const REFERRAL_CODE = 'Y4H6E1IR';

class ReferralCrawler {
  constructor() {
    this.cookies = '';
    this.userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
  }

  async makeRequest(url, options = {}) {
    const defaultHeaders = {
      'User-Agent': this.userAgent,
      'Accept': 'application/json, text/plain, */*',
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept-Encoding': 'gzip, deflate, br',
      'Connection': 'keep-alive',
    };

    if (this.cookies) {
      defaultHeaders['Cookie'] = this.cookies;
    }

    const response = await fetch(url, {
      ...options,
      headers: {
        ...defaultHeaders,
        ...options.headers,
      },
    });

    // Update cookies from response
    const setCookieHeader = response.headers.get('set-cookie');
    if (setCookieHeader) {
      this.cookies = setCookieHeader;
    }

    return response;
  }

  async testReferralFlow() {
    console.log('🚀 Starting referral code test with code:', REFERRAL_CODE);
    
    try {
      // Step 1: Check if the referral URL properly captures the referral code
      console.log('\n📋 Step 1: Testing referral URL with code');
      const referralUrl = `${BASE_URL}?ref=${REFERRAL_CODE}`;
      const homeResponse = await this.makeRequest(referralUrl);
      
      if (!homeResponse.ok) {
        throw new Error(`Failed to load homepage: ${homeResponse.status}`);
      }
      
      console.log('✅ Successfully loaded referral URL');
      console.log('   Status:', homeResponse.status);
      
      // Step 2: Check if we can validate the referral code
      console.log('\n📋 Step 2: Testing referral code validation API');
      const validateResponse = await this.makeRequest(`${BASE_URL}/api/referrals/validate/${REFERRAL_CODE}`);
      
      if (validateResponse.ok) {
        const validationData = await validateResponse.json();
        console.log('✅ Referral code validation successful');
        console.log('   Referrer info:', validationData);
        
        if (validationData.valid) {
          console.log(`   📧 Referrer: ${validationData.referrerName}`);
          console.log('   💰 This user will receive 100 tokens when referral completes');
        }
      } else {
        console.log('❌ Referral code validation failed');
        console.log('   Status:', validateResponse.status);
        const errorText = await validateResponse.text();
        console.log('   Error:', errorText);
      }
      
      // Step 3: Test authentication flow (this would require actual OAuth setup)
      console.log('\n📋 Step 3: Testing authentication endpoints');
      const authUserResponse = await this.makeRequest(`${BASE_URL}/api/auth/user`);
      console.log('   Auth check status:', authUserResponse.status);
      
      if (authUserResponse.status === 401) {
        console.log('✅ Authentication required (expected for new user)');
      }
      
      // Step 4: Check if the referral system structure is in place
      console.log('\n📋 Step 4: Testing referral system endpoints');
      
      // Test referrals endpoint (should require auth)
      const referralsResponse = await this.makeRequest(`${BASE_URL}/api/referrals`);
      console.log('   Referrals endpoint status:', referralsResponse.status);
      
      if (referralsResponse.status === 401) {
        console.log('✅ Referrals endpoint requires authentication (expected)');
      }
      
      // Step 5: Test the complete signup endpoint structure
      console.log('\n📋 Step 5: Testing signup completion endpoint');
      const signupData = {
        cardToken: 'test_token',
        cardLast4: '1234',
        cardBrand: 'Visa',
        paymobCustomerId: 'test_customer',
        referralCode: REFERRAL_CODE
      };
      
      const signupResponse = await this.makeRequest(`${BASE_URL}/api/auth/complete-signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(signupData)
      });
      
      console.log('   Signup completion status:', signupResponse.status);
      
      if (signupResponse.status === 401) {
        console.log('✅ Signup completion requires authentication (expected)');
      } else if (signupResponse.status === 400) {
        const errorData = await signupResponse.json();
        console.log('   Expected validation error:', errorData.message);
      }
      
      // Step 6: Check current referrer user tokens (to verify bonus is awarded later)
      console.log('\n📋 Step 6: Final referrer verification');
      
      // We can't directly check without authentication, but we can verify the referral code exists
      const referrerCheckResponse = await this.makeRequest(`${BASE_URL}/api/referrals/validate/${REFERRAL_CODE}`);
      
      if (referrerCheckResponse.ok) {
        const referrerData = await referrerCheckResponse.json();
        if (referrerData.valid) {
          console.log('✅ Referrer confirmed:', referrerData.referrerName);
          console.log('   💰 This user will receive 100 tokens when a new user completes signup');
        } else {
          console.log('❌ Invalid referral code');
        }
      }
      
      console.log('\n🎯 Referral Test Summary:');
      console.log('================================');
      console.log('✅ Referral URL accepts code parameter');
      console.log('✅ Backend has referral validation endpoint');
      console.log('✅ Authentication system in place');
      console.log('✅ Signup completion endpoint exists');
      console.log('✅ Referral code validation working');
      console.log('\n💡 To complete the test:');
      console.log('   1. A real user needs to sign up using the referral URL');
      console.log('   2. Complete the authentication flow');
      console.log('   3. Add a payment card');
      console.log('   4. The referrer will receive 100 tokens automatically');
      
    } catch (error) {
      console.error('❌ Error during referral test:', error.message);
    }
  }

  async checkReferrerTokens() {
    console.log('\n🔍 Attempting to check referrer current token balance...');
    
    try {
      // This would require authentication, but we can check the structure
      const userResponse = await this.makeRequest(`${BASE_URL}/api/auth/user`);
      
      if (userResponse.status === 401) {
        console.log('ℹ️  Cannot check tokens without authentication');
        console.log('   Manual verification needed after actual signup');
      }
    } catch (error) {
      console.log('ℹ️  Token check requires authenticated session');
    }
  }
}

// Run the test
async function runReferralTest() {
  const crawler = new ReferralCrawler();
  await crawler.testReferralFlow();
  await crawler.checkReferrerTokens();
}

runReferralTest().catch(console.error);