import fetch from 'node-fetch';

async function deepTestIntegration(integrationId, description) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Testing Integration ${integrationId} - ${description}`);
  console.log('='.repeat(60));
  
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
    
    // Step 2: Create order with detailed info
    const orderResponse = await fetch('https://accept.paymob.com/api/ecommerce/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        auth_token: authToken,
        delivery_needed: false,
        amount_cents: 1500, // 15 EGP
        currency: 'EGP',
        items: [],
        merchant_order_id: `test_${integrationId}_${Date.now()}`
      })
    });
    
    const orderData = await orderResponse.json();
    if (!orderResponse.ok) {
      console.error('❌ Order creation failed:', orderData);
      return;
    }
    
    console.log('✅ Order created:', orderData.id);
    
    // Step 3: Generate payment key with enhanced billing data
    const billingData = {
      apartment: "803",
      email: "test@example.com",
      floor: "8",
      first_name: "Test",
      street: "Ethan Land",
      building: "8028",
      phone_number: "+201234567890",
      shipping_method: "PKG",
      postal_code: "01898",
      city: "Cairo",
      country: "EG",
      last_name: "User",
      state: "Cairo"
    };
    
    const paymentKeyResponse = await fetch('https://accept.paymob.com/api/acceptance/payment_keys', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        auth_token: authToken,
        amount_cents: 1500,
        expiration: 3600,
        order_id: orderData.id,
        billing_data: billingData,
        currency: "EGP",
        integration_id: parseInt(integrationId)
      })
    });
    
    const paymentKeyData = await paymentKeyResponse.json();
    
    if (!paymentKeyResponse.ok) {
      console.error(`❌ Payment key generation failed:`, {
        status: paymentKeyResponse.status,
        error: paymentKeyData
      });
      return;
    }
    
    console.log(`✅ Payment key generated successfully`);
    console.log('   Token length:', paymentKeyData.token.length);
    console.log('   Token preview:', paymentKeyData.token.substring(0, 50) + '...');
    
    // Decode the token to see what's inside (base64 decode the payload)
    try {
      const tokenParts = paymentKeyData.token.split('.');
      if (tokenParts.length === 3) {
        const payload = JSON.parse(Buffer.from(tokenParts[1], 'base64').toString());
        console.log('   Token payload details:');
        console.log('     - Integration ID:', payload.integration_id);
        console.log('     - Amount:', payload.amount_cents);
        console.log('     - Currency:', payload.currency);
        console.log('     - Order ID:', payload.order_id);
        console.log('     - Expiry:', new Date(payload.exp * 1000).toISOString());
      }
    } catch (e) {
      console.log('   Could not decode token payload');
    }
    
    // Test iframe URL construction
    const iframeUrl = `https://accept.paymob.com/api/acceptance/iframes/789693?payment_token=${paymentKeyData.token}`;
    console.log('\n🔗 Iframe URL would be:', iframeUrl.substring(0, 100) + '...');
    
    // Make a HEAD request to the iframe URL to check if it's valid
    const iframeCheck = await fetch(iframeUrl, {
      method: 'HEAD',
      redirect: 'manual'
    });
    
    console.log('   Iframe URL check status:', iframeCheck.status);
    if (iframeCheck.status === 302 || iframeCheck.status === 200) {
      console.log('   ✅ Iframe URL appears valid');
    } else {
      console.log('   ⚠️ Iframe URL may have issues');
    }
    
  } catch (error) {
    console.error(`❌ Error testing Integration ${integrationId}:`, error.message);
  }
}

async function main() {
  console.log('🚀 Comprehensive Paymob Integration Test');
  console.log('Testing all integrations with identical parameters');
  
  // Test all integrations from the dashboard
  await deepTestIntegration('4279357', 'Online Card (Oct 2023)');
  await deepTestIntegration('4723444', 'MIGS-tap_on_phone - Online Card (Aug 2024)');
  await deepTestIntegration('4723445', 'UIG-in_store - Mobile Wallet (Aug 2024)');
  
  console.log('\n' + '='.repeat(60));
  console.log('📊 Test Complete');
  console.log('='.repeat(60));
}

main();