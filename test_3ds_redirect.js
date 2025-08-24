import fetch from 'node-fetch';

async function test3DSRedirect() {
  console.log('🔍 Testing 3DS Redirection URL');
  console.log('===============================');
  
  // The redirection URL from your response
  const redirectUrl = "https://accept.paymobsolutions.com/api/acceptance/mpgs_secure_callback/get_acs_page?token=ZXlKaGJHY2lPaUpJVXpVeE1pSXNJblI1Y0NJNklrcFhWQ0o5LmV5SmpiR0Z6Y3lJNklrbHVkR1ZuY21GMGFXOXVWVzVwY1hWbFVtVm1JaXdpY21WbVgzQnJJam94TnprMk9ETXdOekFzSW1WNGNDSTZNVGMxTlRrMk1URXlOSDAuTW9iU1IzVHVGZmQzOHhhMzkxSGp1d1pZZnkxVkF4VDRJZkJFbUg0U2pCdHNrQ1lBM2lyZE5ZMjRiZk4yYkpzRXB2aU5TN2lQRHR6YW5SUks2bldkenc=&init=false";
  
  try {
    console.log('🔗 Checking redirect URL:', redirectUrl.substring(0, 100) + '...');
    
    const response = await fetch(redirectUrl, {
      method: 'GET',
      redirect: 'manual'
    });
    
    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));
    
    if (response.status === 302 || response.status === 301) {
      console.log('✅ Redirection available to:', response.headers.get('location'));
    } else if (response.status === 200) {
      const body = await response.text();
      console.log('✅ Page loaded successfully');
      console.log('Content preview:', body.substring(0, 500) + '...');
    } else {
      console.log('❌ Unexpected status:', response.status);
    }
    
  } catch (error) {
    console.error('❌ Error testing redirect URL:', error.message);
  }
  
  console.log('\n📝 Analysis:');
  console.log('The redirection URL should contain the bank\'s 3DS authentication page.');
  console.log('If the iframe is not redirecting, it may be due to:');
  console.log('1. Iframe sandbox restrictions');
  console.log('2. Missing allow-top-navigation permission');
  console.log('3. The payment form not automatically following redirects');
}

test3DSRedirect();