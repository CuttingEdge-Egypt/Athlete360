import fetch from 'node-fetch';

async function findValidIntegration() {
  console.log('🔍 Finding Valid Integration IDs');
  console.log('================================');
  
  const PAYMOB_API_KEY = process.env.PAYMOB_API_KEY;
  
  if (!PAYMOB_API_KEY) {
    console.error('❌ PAYMOB_API_KEY not found in environment');
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

    // Test multiple integration IDs
    const integrationIds = [4723443, 4233746, 4279357, 4538246, 4123456, 4654321];
    
    console.log('3️⃣ Testing multiple integration IDs...');
    
    for (const integrationId of integrationIds) {
      console.log(`\n🧪 Testing Integration ID: ${integrationId}`);
      
      try {
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
            integration_id: integrationId
          })
        });

        const paymentKeyData = await paymentKeyResponse.json();
        
        if (paymentKeyResponse.ok && paymentKeyData.token) {
          console.log(`✅ Integration ID ${integrationId} is VALID!`);
          console.log(`   Payment token: ${paymentKeyData.token.substring(0, 50)}...`);
        } else {
          console.log(`❌ Integration ID ${integrationId} failed:`, paymentKeyData);
        }
        
        // Add delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        console.log(`❌ Integration ID ${integrationId} error:`, error.message);
      }
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

findValidIntegration();