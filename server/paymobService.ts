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
      integrationId: process.env.INTEGRATION_ID || process.env.PAYMOB_INTEGRATION_ID || '',
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

  private async createPaymentKey(authToken: string, orderId: string, paymentIntent: PaymentIntent): Promise<string> {
    const requestBody = {
      auth_token: authToken,
      amount_cents: Math.round(paymentIntent.amount * 100),
      expiration: 3600, // 1 hour
      order_id: orderId,
      billing_data: {
        apartment: 'NA',
        email: paymentIntent.billingData.email,
        floor: 'NA',
        first_name: paymentIntent.billingData.firstName,
        street: 'NA',
        building: 'NA',
        phone_number: paymentIntent.billingData.phoneNumber || '+20100000000',
        shipping_method: 'NA',
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
      // Add redirect URL for iframe completion
      lock_order_when_paid: false,
    };

    console.log('Creating payment key with body:', JSON.stringify(requestBody, null, 2));

    const response = await fetch(`${this.baseUrl}/acceptance/payment_keys`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    const data = await response.json() as any;
    console.log('Payment key response:', data);

    if (!response.ok) {
      console.error('Payment key creation failed:', data);
      throw new Error(`Paymob payment key creation failed: ${data.message || 'Unknown error'}`);
    }

    return data.token;
  }

  async createPaymentIntent(paymentIntent: PaymentIntent): Promise<PaymentResponse> {
    try {
      console.log('Creating Paymob payment intent with real credentials...');
      const authToken = await this.getAuthToken();
      const orderId = await this.createOrder(authToken, paymentIntent.amount);
      const paymentToken = await this.createPaymentKey(authToken, orderId, paymentIntent);

      // Handle iframe URL - check if it's already a full URL or just an ID
      let iframeUrl;
      if (this.config.iframeId.startsWith('https://')) {
        iframeUrl = `${this.config.iframeId}?payment_token=${paymentToken}`;
      } else {
        iframeUrl = `https://accept.paymob.com/api/acceptance/iframes/${this.config.iframeId}?payment_token=${paymentToken}`;
      }

      return {
        token: paymentToken,
        iframeUrl: iframeUrl,
        orderId,
      };
    } catch (error) {
      console.error('Paymob payment intent creation error:', error);
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