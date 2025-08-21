import fetch from 'node-fetch';

async function testIntegration(integrationId) {
  console.log(`\n🔍 Testing Integration ID: ${integrationId}`);
  
  try {
    // Step 1: Authenticate
    const authResponse = await fetch('https://accept.paymob.com/api/auth/tokens', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: process.env.PAYMOB_API_KEY
      })
    });
    
    const authData = await authResponse.json();
    
    if (!authResponse.ok) {
      console.error('❌ Authentication failed:', authData);
      return;
    }
    
    console.log('✅ Authentication successful');
    const authToken = authData.token;
    
    // Step 2: Create order
    const orderResponse = await fetch('https://accept.paymob.com/api/ecommerce/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        auth_token: authToken,
        delivery_needed: false,
        amount_cents: 1000,
        currency: 'EGP',
        items: [],
        merchant_order_id: `test_${Date.now()}`
      })
    });
    
    const orderData = await orderResponse.json();
    
    if (!orderResponse.ok) {
      console.error('❌ Order creation failed:', orderData);
      return;
    }
    
    console.log('✅ Order created:', orderData.id);
    
    // Step 3: Generate payment key with the specific integration ID
    const paymentKeyResponse = await fetch('https://accept.paymob.com/api/acceptance/payment_keys', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        auth_token: authToken,
        amount_cents: 1000,
        expiration: 3600,
        order_id: orderData.id,
        billing_data: {
          apartment: "123",
          email: "test@example.com",
          floor: "1",
          first_name: "Test",
          street: "Main Street",
          building: "Building 1",
          phone_number: "+201234567890",
          shipping_method: "PKG",
          postal_code: "12345",
          city: "Cairo",
          country: "EG",
          last_name: "User",
          state: "Cairo"
        },
        currency: "EGP",
        integration_id: parseInt(integrationId)
      })
    });
    
    const paymentKeyData = await paymentKeyResponse.json();
    
    if (!paymentKeyResponse.ok) {
      console.error(`❌ Payment key generation failed for Integration ${integrationId}:`, {
        status: paymentKeyResponse.status,
        error: paymentKeyData
      });
      return;
    }
    
    console.log(`✅ Payment key generated successfully for Integration ${integrationId}`);
    console.log('   Token length:', paymentKeyData.token.length);
    
  } catch (error) {
    console.error(`❌ Error testing Integration ${integrationId}:`, error.message);
  }
}

async function main() {
  console.log('🚀 Starting Paymob Integration Test');
  console.log('===================================');
  
  // Test the working integration
  await testIntegration('4723445');
  
  // Test the problematic integration
  await testIntegration('4279357');
  
  console.log('\n===================================');
  console.log('📊 Test Complete');
}

main();