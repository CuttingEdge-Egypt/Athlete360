import fetch from 'node-fetch';

interface PaymobConfig {
  apiKey: string;
  publicKey: string;
  secretKey: string;
  integrationId: string;
  iframeId: string;
}

interface PaymentIntent {
  amount: number;
  currency: string;
  userId: string;
  tokensAmount: number;
  billingData: {
    email: string;
    firstName: string;
    lastName: string;
    phoneNumber?: string;
  };
}

interface PaymentResponse {
  token: string;
  iframeUrl: string;
  orderId: string;
}

export class PaymobService {
  private config: PaymobConfig;
  private baseUrl = 'https://accept.paymobsolutions.com/api';

  constructor() {
    this.config = {
      apiKey: process.env.PAYMOB_API_KEY || '',
      publicKey: process.env.PAYMOB_PUBLIC_KEY || '',
      secretKey: process.env.PAYMOB_SECRET_KEY || '',
      integrationId: process.env.INTEGRATION_ID || process.env.PAYMOB_INTEGRATION_ID || '4279357', // Use the correct integration ID
      iframeId: process.env.PAYMOB_IFRAME_ID || ''
    };

    console.log('Paymob config initialized:', {
      apiKey: this.config.apiKey ? `Set (${this.config.apiKey.length} chars)` : 'Not set',
      publicKey: this.config.publicKey ? `Set (${this.config.publicKey.length} chars)` : 'Not set',
      secretKey: this.config.secretKey ? `Set (${this.config.secretKey.length} chars)` : 'Not set',
      integrationId: this.config.integrationId,
      iframeId: this.config.iframeId ? 'Set' : 'Not set'
    });

    if (!this.config.apiKey || !this.config.integrationId || !this.config.iframeId) {
      console.warn('Paymob configuration incomplete. Please check environment variables.');
    }
  }

  private async getAuthToken(): Promise<string> {
    console.log('Attempting Paymob authentication...');
    
    const requestBody = {
      api_key: this.config.apiKey,
    };
    
    console.log('Auth request body:', JSON.stringify(requestBody, null, 2));
    
    const response = await fetch(`${this.baseUrl}/auth/tokens`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    const data = await response.json() as any;
    console.log('Auth response status:', response.status);
    console.log('Auth response data:', data);
    
    if (!response.ok) {
      console.error('Paymob auth failed:', data);
      throw new Error(`Paymob auth failed: ${data.message || JSON.stringify(data)}`);
    }

    return data.token;
  }

  private async createOrder(authToken: string, amount: number): Promise<string> {
    const requestBody = {
      auth_token: authToken,
      delivery_needed: 'false',
      amount_cents: Math.round(amount * 100), // Convert to cents
      currency: 'EGP',
      items: [{
        name: 'Athlete360 Tokens',
        amount_cents: Math.round(amount * 100),
        description: 'AI Analysis Tokens',
        quantity: 1,
      }],
    };

    console.log('Creating order with body:', JSON.stringify(requestBody, null, 2));

    const response = await fetch(`${this.baseUrl}/ecommerce/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    const data = await response.json() as any;
    console.log('Order response status:', response.status);
    console.log('Order response data:', data);
    
    if (!response.ok) {
      console.error('Paymob order creation failed:', data);
      throw new Error(`Paymob order creation failed: ${data.message || JSON.stringify(data)}`);
    }

    return data.id;
  }

  private actualIntegrationIds: string[] = [];

  private async createPaymentKey(authToken: string, orderId: string, paymentIntent: PaymentIntent): Promise<string> {
    const requestBody = {
      auth_token: authToken,
      amount_cents: Math.round(paymentIntent.amount * 100),
      expiration: 3600,
      order_id: parseInt(orderId),
      billing_data: {
        apartment: 'NA',
        email: paymentIntent.billingData.email,
        floor: 'NA',
        first_name: paymentIntent.billingData.firstName,
        street: 'NA',
        building: 'NA',
        phone_number: paymentIntent.billingData.phoneNumber || '+20100000000',
        shipping_method: 'PKG',
        postal_code: 'NA',
        city: 'Cairo',
        country: 'EG',
        last_name: paymentIntent.billingData.lastName,
        state: 'Cairo',
        extra_data: {
          user_id: paymentIntent.userId,
          tokens_amount: paymentIntent.tokensAmount
        }
      },
      currency: paymentIntent.currency,
      integration_id: parseInt(this.config.integrationId),
      lock_order_when_paid: false,
    };

    console.log(`🔑 Creating payment key with integration ID: ${this.config.integrationId}`);
    console.log('🔑 Request body:', JSON.stringify(requestBody, null, 2));

    const response = await fetch(`${this.baseUrl}/acceptance/payment_keys`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    const data = await response.json() as any;
    console.log('🔑 Payment key response:', data);

    if (!response.ok || data.message || !data.token) {
      console.error(`❌ Payment key creation failed:`, data);
      throw new Error(`Payment key creation failed: ${data.message || JSON.stringify(data)}`);
    }

    return data.token;
  }

  // Method to get available integrations for debugging
  async getAvailableIntegrations(): Promise<any> {
    console.log('🚨 ENTERING getAvailableIntegrations method...');
    
    try {
      console.log('🔄 Step 1: Getting auth token for integrations fetch...');
      const authToken = await this.getAuthToken();
      console.log('✅ Step 1 DONE: Auth token obtained, length:', authToken?.length);
      
      console.log('🔄 Step 2: Making fetch request to Paymob integrations API...');
      console.log('🔄 API URL:', `${this.baseUrl}/ecommerce/integrations`);
      
      const response = await fetch(`${this.baseUrl}/ecommerce/integrations`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      console.log(`📡 Step 3: Integration API response received`);
      console.log(`📡 Status: ${response.status}`);
      console.log(`📡 Status Text: ${response.statusText}`);
      console.log(`📡 Headers:`, Object.fromEntries(response.headers));
      
      if (!response.ok) {
        console.error('❌ FETCH FAILED - Status:', response.status);
        const errorText = await response.text();
        console.error('❌ FETCH FAILED - Error response body:', errorText);
        return [];
      }

      console.log('🔄 Step 4: Parsing JSON response...');
      const data = await response.json() as any;
      console.log('✅ Step 4 DONE: JSON parsed successfully');
      console.log('🔍 RAW Available integrations from your Paymob account:');
      console.log('🔍 Type of data:', typeof data);
      console.log('🔍 Is array:', Array.isArray(data));
      console.log('🔍 Data length:', data?.length);
      console.log('🔍 Full data:', JSON.stringify(data, null, 2));
      
      // Store all valid integration IDs for this account
      if (data && Array.isArray(data) && data.length > 0) {
        this.actualIntegrationIds = data.map((integration: any) => integration.id.toString());
        console.log('📋 ALL Available integration IDs for this account:', this.actualIntegrationIds);
        
        // Prioritize card integrations
        const cardIntegrations = data.filter((integration: any) => 
          integration.type === 'card' || integration.type === 'CARD'
        );
        
        console.log(`🔍 Found ${cardIntegrations.length} card integrations out of ${data.length} total`);
        
        if (cardIntegrations.length > 0) {
          console.log('💳 Found card integrations:', cardIntegrations.map((i: any) => ({ 
            id: i.id, 
            name: i.name, 
            type: i.type, 
            is_live: i.is_live 
          })));
          
          // Use the first card integration
          const firstCardIntegration = cardIntegrations[0];
          this.config.integrationId = firstCardIntegration.id.toString();
          console.log(`✅ UPDATED integration ID from ${process.env.INTEGRATION_ID} to: ${this.config.integrationId}`);
        } else {
          // If no card integrations, use the first available one
          if (data.length > 0) {
            const firstIntegration = data[0];
            this.config.integrationId = firstIntegration.id.toString();
            console.log(`⚠️  No card integrations found, using first available (${firstIntegration.type}): ${this.config.integrationId}`);
          }
        }
      } else {
        console.error('❌ No integrations found or invalid response format');
        console.error('❌ Response data type:', typeof data);
        console.error('❌ Is array:', Array.isArray(data));
        console.error('❌ Length:', data?.length);
        console.error('❌ Raw data:', data);
      }
      
      console.log('🚨 EXITING getAvailableIntegrations method with integration ID:', this.config.integrationId);
      return data;
    } catch (error: any) {
      console.error('❌ CRITICAL ERROR in getAvailableIntegrations:', error);
      console.error('❌ Error name:', error?.name);
      console.error('❌ Error message:', error?.message);
      console.error('❌ Error stack:', error?.stack);
      return [];
    }
  }

  async createPaymentIntent(paymentIntent: PaymentIntent): Promise<PaymentResponse> {
    console.log('🚀 PAYMOB SERVICE: Starting complete 3-step Paymob flow...');
    
    try {
      // STEP 1: Get authentication token
      console.log('📝 STEP 1: Getting authentication token...');
      const authToken = await this.getAuthToken();
      console.log('✅ STEP 1: Authentication successful');

      // STEP 2: Get available integrations and set correct integration ID
      console.log('🔍 STEP 2: Fetching available integrations...');
      await this.getAvailableIntegrations(); // This updates this.config.integrationId
      console.log('✅ STEP 2: Integration ID set to:', this.config.integrationId);

      // STEP 3: Create order with proper amount formatting
      console.log('📦 STEP 3: Creating order...');
      const orderId = await this.createOrder(authToken, paymentIntent.amount);
      console.log('✅ STEP 3: Order created with ID:', orderId);

      // STEP 4: Create payment key with complete billing data
      console.log('🔑 STEP 4: Creating payment key...');
      const paymentToken = await this.createPaymentKey(authToken, orderId, paymentIntent);
      console.log('✅ STEP 4: Payment key created successfully');

      // STEP 5: Construct proper iframe URL
      console.log('🖼️ STEP 5: Constructing iframe URL...');
      let iframeUrl: string;
      
      if (this.config.iframeId.startsWith('http')) {
        iframeUrl = `${this.config.iframeId}?payment_token=${paymentToken}`;
      } else {
        iframeUrl = `https://accept.paymob.com/api/acceptance/iframes/${this.config.iframeId}?payment_token=${paymentToken}`;
      }
      console.log('✅ STEP 5: Iframe URL constructed:', iframeUrl);

      console.log('🎉 Payment intent created successfully');
      return {
        token: paymentToken,
        iframeUrl: iframeUrl,
        orderId: orderId.toString(),
      };
    } catch (error) {
      console.error('❌ Payment intent creation failed:', error);
      throw error;
    }
  }

  async verifyPayment(transactionId: string): Promise<any> {
    try {
      const authToken = await this.getAuthToken();
      const response = await fetch(`${this.baseUrl}/acceptance/transactions/${transactionId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
      });

      const data = await response.json() as any;
      if (!response.ok) {
        throw new Error(`Payment verification failed: ${data.message || 'Unknown error'}`);
      }

      return data;
    } catch (error) {
      console.error('Payment verification error:', error);
      throw error;
    }
  }

  generateReceiptNumber(): string {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 10000);
    return `ATH${timestamp}${random}`;
  }

  calculateTokensFromAmount(amount: number): number {
    // 1 EGP = 10 tokens (adjust rate as needed)
    return Math.floor(amount * 10);
  }

  async validateAndTokenizeCard(cardData: {
    cardNumber: string;
    expiryMonth: string;
    expiryYear: string;
    cvv: string;
    cardholderName: string;
  }): Promise<{
    success: boolean;
    cardToken?: string;
    customerId?: string;
    message?: string;
  }> {
    try {
      console.log('[PAYMOB] Starting card validation and tokenization');
      
      // Get authentication token
      const authToken = await this.getAuthToken();
      
      // Create a customer first
      const customerResponse = await fetch(`${this.baseUrl}/ecommerce/customers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          first_name: cardData.cardholderName.split(' ')[0] || 'Customer',
          last_name: cardData.cardholderName.split(' ').slice(1).join(' ') || 'User',
          email: 'customer@example.com', // This would be replaced with actual user email
          phone_number: '+201000000000' // Default phone number
        }),
      });

      const customerData = await customerResponse.json() as any;
      console.log('[PAYMOB] Customer creation response:', customerData);

      if (!customerResponse.ok) {
        throw new Error(`Customer creation failed: ${customerData.message || 'Unknown error'}`);
      }

      // Tokenize the card using Paymob's tokenization endpoint
      const tokenizeResponse = await fetch(`${this.baseUrl}/acceptance/payment_keys_tokens`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          card_number: cardData.cardNumber,
          expiry_month: cardData.expiryMonth,
          expiry_year: cardData.expiryYear,
          cvn: cardData.cvv,
          holder_name: cardData.cardholderName,
          integration_id: this.config.integrationId
        }),
      });

      const tokenData = await tokenizeResponse.json() as any;
      console.log('[PAYMOB] Card tokenization response:', tokenData);

      if (!tokenizeResponse.ok) {
        return {
          success: false,
          message: tokenData.message || 'Card validation failed'
        };
      }

      return {
        success: true,
        cardToken: tokenData.token,
        customerId: customerData.id?.toString(),
        message: 'Card validated and tokenized successfully'
      };

    } catch (error) {
      console.error('[PAYMOB] Card validation error:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Card validation service error'
      };
    }
  }
}

export const paymobService = new PaymobService();