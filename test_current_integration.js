import fetch from 'node-fetch';

async function testCurrentIntegration() {
  console.log('🔍 Testing Current Integration Configuration');
  console.log('==========================================');
  
  const PAYMOB_API_KEY = process.env.PAYMOB_API_KEY;
  const INTEGRATION_ID = process.env.INTEGRATION_ID;
  
  console.log('Current INTEGRATION_ID from env:', INTEGRATION_ID);
  
  if (!PAYMOB_API_KEY) {
    console.error('❌ PAYMOB_API_KEY not found in environment');
    return;
  }

  if (!INTEGRATION_ID) {
    console.error('❌ INTEGRATION_ID not found in environment');
    return;
  }

  try {
    // Get auth token
    console.log('1️⃣ Getting auth token...');
    const authResponse = await fetch('https://accept.paymob.com/api/auth/tokens', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ api_key: PAYMOB_API_KEY })
    });

    const authData = await authResponse.json();
    
    if (!authResponse.ok || !authData.token) {
      console.error('❌ Failed to get auth token:', authData);
      return;
    }
    
    console.log('✅ Auth token obtained');

    // Create order
    console.log('2️⃣ Creating order...');
    const orderResponse = await fetch('https://accept.paymob.com/api/ecommerce/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        auth_token: authData.token,
        delivery_needed: false,
        amount_cents: 1500,
        currency: 'EGP',
        merchant_order_id: `test_order_${Date.now()}`,
        items: []
      })
    });

    const orderData = await orderResponse.json();
    
    if (!orderResponse.ok || !orderData.id) {
      console.error('❌ Failed to create order:', orderData);
      return;
    }
    
    console.log('✅ Order created:', orderData.id);

    // Test current integration ID
    console.log(`3️⃣ Testing current Integration ID: ${INTEGRATION_ID}`);
    
    const paymentKeyResponse = await fetch('https://accept.paymob.com/api/acceptance/payment_keys', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        auth_token: authData.token,
        amount_cents: 1500,
        expiration: 3600,
        order_id: orderData.id,
        billing_data: {
          apartment: "123",
          email: "test@example.com",
          floor: "1",
          first_name: "Test",
          street: "Main Street",
          building: "Building 1",
          phone_number: "NA",
          shipping_method: "PKG",
          postal_code: "12345",
          city: "Cairo",
          country: "EG",
          last_name: "User",
          state: "Cairo"
        },
        currency: "EGP",
        integration_id: parseInt(INTEGRATION_ID)
      })
    });

    const paymentKeyData = await paymentKeyResponse.json();
    
    console.log('Response status:', paymentKeyResponse.status);
    console.log('Response data:', paymentKeyData);
    
    if (paymentKeyResponse.ok && paymentKeyData.token) {
      console.log(`✅ Integration ID ${INTEGRATION_ID} is WORKING!`);
      console.log('🔗 Payment token generated successfully');
      console.log('📱 Iframe URL: https://accept.paymob.com/api/acceptance/iframes/789693?payment_token=' + paymentKeyData.token.substring(0, 50) + '...');
    } else {
      console.log(`❌ Integration ID ${INTEGRATION_ID} failed:`, paymentKeyData);
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testCurrentIntegration();