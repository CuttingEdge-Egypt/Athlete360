import fetch from 'node-fetch';

async function listIntegrations() {
  console.log('🔍 Attempting to list available integrations');
  console.log('=========================================');
  
  try {
    // First authenticate
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
    console.log('Profile ID:', authData.profile?.id);
    console.log('Merchant ID:', authData.profile?.merchant_id);
    
    // Try to get merchant info
    const merchantResponse = await fetch(`https://accept.paymob.com/api/acceptance/merchant_data`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authData.token}`
      }
    });
    
    if (merchantResponse.ok) {
      const merchantData = await merchantResponse.json();
      console.log('\n📊 Merchant Data:', JSON.stringify(merchantData, null, 2));
    }
    
    // Test a range of integration IDs to see which ones work
    console.log('\n🧪 Testing Integration IDs from your dashboard:');
    const testIds = [
      '4723443', // MIGS - Online Card
      '4723444', // MIGS-tap_on_phone - Online Card
      '4723445', // UIG-in_store - Mobile Wallet
      '4723446', // UIG-online - Mobile Wallet
      '4279357', // The problematic one
    ];
    
    for (const id of testIds) {
      await testSingleIntegration(authData.token, id);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

async function testSingleIntegration(authToken, integrationId) {
  try {
    // Create a test order
    const orderResponse = await fetch('https://accept.paymob.com/api/ecommerce/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        auth_token: authToken,
        delivery_needed: false,
        amount_cents: 100,
        currency: 'EGP',
        items: [],
        merchant_order_id: `test_${integrationId}_${Date.now()}`
      })
    });
    
    const orderData = await orderResponse.json();
    
    // Try to generate payment key
    const paymentKeyResponse = await fetch('https://accept.paymob.com/api/acceptance/payment_keys', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        auth_token: authToken,
        amount_cents: 100,
        expiration: 3600,
        order_id: orderData.id,
        billing_data: {
          apartment: "123",
          email: "test@example.com",
          floor: "1",
          first_name: "Test",
          street: "Street",
          building: "1",
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
    
    if (paymentKeyResponse.ok) {
      console.log(`  ✅ Integration ${integrationId}: VALID`);
    } else {
      const error = await paymentKeyResponse.json();
      console.log(`  ❌ Integration ${integrationId}: INVALID - ${error[0] || 'Unknown error'}`);
    }
    
  } catch (error) {
    console.log(`  ⚠️ Integration ${integrationId}: Error - ${error.message}`);
  }
}

listIntegrations();