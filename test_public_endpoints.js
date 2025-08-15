/**
 * Public Endpoints Test for Athlete360 Platform
 * 
 * This script tests publicly accessible endpoints and simulates the flow:
 * 1. Tests public sports and countries endpoints
 * 2. Tests athlete search functionality  
 * 3. Simulates signup flow validation
 * 
 * Usage: node test_public_endpoints.js
 */

import fetch from 'node-fetch';

class Athlete360PublicTester {
  constructor() {
    this.baseUrl = 'http://localhost:5000';
  }

  async testSportsEndpoint() {
    console.log('🏃 Testing sports endpoint...');
    
    try {
      const response = await fetch(`${this.baseUrl}/api/sports`);
      const sports = await response.json();
      
      console.log(`📡 Sports API Response (${response.status}):`, sports);
      
      if (response.ok && Array.isArray(sports) && sports.length > 0) {
        console.log(`✅ Sports endpoint test passed - found ${sports.length} sports`);
        return { success: true, data: sports };
      } else {
        console.log('❌ Sports endpoint test failed');
        return { success: false };
      }
    } catch (error) {
      console.error('❌ Sports API error:', error);
      return { success: false };
    }
  }

  async testCountriesEndpoint() {
    console.log('🌍 Testing countries endpoint...');
    
    try {
      const response = await fetch(`${this.baseUrl}/api/countries`);
      const countries = await response.json();
      
      console.log(`📡 Countries API Response (${response.status}):`, countries);
      
      if (response.ok && Array.isArray(countries) && countries.length > 0) {
        console.log(`✅ Countries endpoint test passed - found ${countries.length} countries`);
        return { success: true, data: countries };
      } else {
        console.log('❌ Countries endpoint test failed');
        return { success: false };
      }
    } catch (error) {
      console.error('❌ Countries API error:', error);
      return { success: false };
    }
  }

  async testAthleteSearch(sportId) {
    console.log('🔍 Testing athlete search endpoint...');
    
    try {
      const response = await fetch(`${this.baseUrl}/api/athletes/search?name=test&sportId=${sportId}`);
      const athletes = await response.json();
      
      console.log(`📡 Athlete Search API Response (${response.status}):`, athletes);
      
      if (response.ok && Array.isArray(athletes)) {
        console.log(`✅ Athlete search test passed - found ${athletes.length} athletes`);
        return { success: true, data: athletes };
      } else {
        console.log('❌ Athlete search test failed');
        return { success: false };
      }
    } catch (error) {
      console.error('❌ Athlete search API error:', error);
      return { success: false };
    }
  }

  async testAthleteSearchByName() {
    console.log('🔍 Testing athlete search by name endpoint...');
    
    try {
      const response = await fetch(`${this.baseUrl}/api/athletes/search-by-name?name=Mohammad Ali`);
      const athletes = await response.json();
      
      console.log(`📡 Athlete Search by Name API Response (${response.status}):`, athletes);
      
      if (response.ok && Array.isArray(athletes)) {
        console.log(`✅ Athlete search by name test passed - found ${athletes.length} athletes`);
        return { success: true, data: athletes };
      } else {
        console.log('❌ Athlete search by name test failed');
        return { success: false };
      }
    } catch (error) {
      console.error('❌ Athlete search by name API error:', error);
      return { success: false };
    }
  }

  async testSignupValidation() {
    console.log('📝 Testing signup completion endpoint (should require auth)...');
    
    try {
      const response = await fetch(`${this.baseUrl}/api/auth/complete-signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          cardToken: 'test_token',
          cardLast4: '1111',
          cardBrand: 'Visa',
          paymobCustomerId: 'test_customer'
        })
      });

      const result = await response.json();
      console.log(`📡 Signup Validation Response (${response.status}):`, result);
      
      if (response.status === 401 && result.message === 'Unauthorized') {
        console.log('✅ Signup endpoint properly protected (401 Unauthorized)');
        return { success: true };
      } else {
        console.log('❌ Signup endpoint validation failed');
        return { success: false };
      }
    } catch (error) {
      console.error('❌ Signup validation error:', error);
      return { success: false };
    }
  }

  async testServerHealth() {
    console.log('🏥 Testing server health...');
    
    try {
      const response = await fetch(`${this.baseUrl}/`);
      
      console.log(`📡 Server Health Response (${response.status})`);
      
      if (response.ok) {
        console.log('✅ Server health test passed');
        return { success: true };
      } else {
        console.log('❌ Server health test failed');
        return { success: false };
      }
    } catch (error) {
      console.error('❌ Server health error:', error);
      return { success: false };
    }
  }

  async runPublicTests() {
    console.log('🚀 Starting Athlete360 Public Endpoint Tests...');
    
    const results = {};

    // Test 1: Server Health
    results.health = await this.testServerHealth();
    
    // Test 2: Sports endpoint
    results.sports = await this.testSportsEndpoint();
    
    // Test 3: Countries endpoint
    results.countries = await this.testCountriesEndpoint();
    
    // Test 4: Athlete search (using first sport if available)
    const sportId = results.sports.success && results.sports.data.length > 0 
      ? results.sports.data[0].id 
      : 'test-sport-id';
    results.athleteSearch = await this.testAthleteSearch(sportId);
    
    // Test 5: Athlete search by name
    results.athleteSearchByName = await this.testAthleteSearchByName();
    
    // Test 6: Signup validation (should be protected)
    results.signupValidation = await this.testSignupValidation();
    
    // Summary
    console.log('\n📊 Test Results Summary:');
    console.log(`Server Health: ${results.health.success ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`Sports Endpoint: ${results.sports.success ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`Countries Endpoint: ${results.countries.success ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`Athlete Search: ${results.athleteSearch.success ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`Athlete Search by Name: ${results.athleteSearchByName.success ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`Signup Validation: ${results.signupValidation.success ? '✅ PASS' : '❌ FAIL'}`);
    
    const passCount = Object.values(results).filter(r => r.success).length;
    console.log(`\n🎯 Overall: ${passCount}/6 tests passed`);
    
    // Additional insights
    if (results.sports.success) {
      console.log(`\n📈 Data Insights:`);
      console.log(`- Sports available: ${results.sports.data.length}`);
      console.log(`- Sample sport: ${results.sports.data[0].name}`);
    }
    
    if (results.countries.success) {
      console.log(`- Countries available: ${results.countries.data.length}`);
      console.log(`- Sample countries: ${results.countries.data.slice(0, 3).join(', ')}`);
    }
    
    return results;
  }
}

// Run the public endpoint tests
const publicTester = new Athlete360PublicTester();
publicTester.runPublicTests().then((results) => {
  const allPassed = Object.values(results).every(r => r.success);
  console.log(allPassed ? '\n🎉 All public endpoint tests passed!' : '\n⚠️  Some public endpoint tests failed');
  process.exit(allPassed ? 0 : 1);
}).catch(error => {
  console.error('💥 Public endpoint test execution failed:', error);
  process.exit(1);
});