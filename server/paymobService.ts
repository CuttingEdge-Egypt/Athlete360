import fetch from 'node-fetch';

export interface PaymobConfig {
  apiKey: string;
  integrationId: string;
  iframeUrl: string;
  secretKey: string;
}

export interface PaymentData {
  amount: number; // Amount in cents
  currency: string;
  customerEmail: string;
  customerFirstName: string;
  customerLastName: string;
  customerPhone?: string;
}

export interface PaymentIntent {
  amount: number;
  currency: string;
  orderId?: string;
  customerEmail: string;
  customerFirstName: string;
  customerLastName: string;
  customerPhone?: string;
}

export interface PaymobOrderResponse {
  id: string;
  created_at: string;
  delivery_needed: boolean;
  merchant: any;
  collector: any;
  amount_cents: number;
  shipping_data: any;
  currency: string;
  is_payment_locked: boolean;
  is_return: boolean;
  is_cancel: boolean;
  is_returned: boolean;
  is_canceled: boolean;
  merchant_order_id: string;
  wallet_notification: any;
  paid_amount_cents: number;
  notify_user_with_email: boolean;
  items: any[];
  order_url: string;
  commission_fees: number;
  delivery_fees_cents: number;
  delivery_vat_cents: number;
  payment_method: string;
  merchant_staff_tag: any;
  api_source: string;
  data: any;
}

export interface PaymobPaymentKeyResponse {
  token: string;
}

export class PaymobService {
  private config: PaymobConfig;
  private authToken: string | null = null;

  constructor(config: PaymobConfig) {
    this.config = config;
  }

  /**
   * Authenticate with Paymob API
   */
  async authenticate(): Promise<string> {
    try {
      const response = await fetch('https://accept.paymob.com/api/auth/tokens', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          api_key: this.config.apiKey,
        }),
      });

      const data: any = await response.json();
      
      if (!response.ok) {
        throw new Error(`Authentication failed: ${data.message || 'Unknown error'}`);
      }

      this.authToken = data.token;
      return data.token;
    } catch (error) {
      console.error('Paymob authentication error:', error);
      throw new Error('Failed to authenticate with Paymob');
    }
  }

  /**
   * Create order with Paymob
   */
  async createOrder(paymentData: PaymentData): Promise<PaymobOrderResponse> {
    if (!this.authToken) {
      await this.authenticate();
    }

    try {
      const response = await fetch('https://accept.paymob.com/api/ecommerce/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          auth_token: this.authToken,
          delivery_needed: false,
          amount_cents: paymentData.amount,
          currency: paymentData.currency,
          items: [],
          merchant_order_id: `order_${Date.now()}`,
        }),
      });

      const data: any = await response.json();
      
      if (!response.ok) {
        throw new Error(`Order creation failed: ${data.message || 'Unknown error'}`);
      }

      return data as PaymobOrderResponse;
    } catch (error) {
      console.error('Paymob order creation error:', error);
      throw new Error('Failed to create order with Paymob');
    }
  }

  /**
   * Generate payment key for iframe
   */
  async generatePaymentKey(
    orderId: string,
    amount: number,
    customerData: {
      email: string;
      firstName: string;
      lastName: string;
      phone?: string;
    }
  ): Promise<PaymobPaymentKeyResponse> {
    if (!this.authToken) {
      await this.authenticate();
    }

    const requestPayload = {
      auth_token: this.authToken,
      amount_cents: amount,
      expiration: 3600, // 1 hour expiration
      order_id: orderId,
      billing_data: {
        apartment: 'NA',
        email: customerData.email,
        floor: 'NA',
        first_name: customerData.firstName,
        street: 'NA',
        building: 'NA',
        phone_number: customerData.phone || '+201000000000',
        shipping_method: 'NA',
        postal_code: 'NA',
        city: 'NA',
        country: 'EG',
        last_name: customerData.lastName,
        state: 'NA',
      },
      currency: 'EGP',
      integration_id: parseInt(this.config.integrationId),
    };

    console.log('📤 Payment key request:', JSON.stringify(requestPayload, null, 2));

    try {
      const response = await fetch('https://accept.paymob.com/api/acceptance/payment_keys', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestPayload),
      });

      const data: any = await response.json();
      
      if (!response.ok) {
        console.error('Payment key generation failed. Response:', {
          status: response.status,
          statusText: response.statusText,
          data: data
        });
        throw new Error(`Payment key generation failed: ${data.message || data.detail || 'Unknown error'}`);
      }

      return data as PaymobPaymentKeyResponse;
    } catch (error) {
      console.error('Paymob payment key generation error:', error);
      throw new Error('Failed to generate payment key');
    }
  }

  /**
   * Create complete payment intent
   */
  async createPaymentIntent(paymentData: PaymentIntent) {
    try {
      console.log('🔄 Creating Paymob payment intent...', { amount: paymentData.amount });

      // Step 1: Authenticate
      await this.authenticate();
      
      // Step 2: Create order
      const order = await this.createOrder({
        amount: paymentData.amount,
        currency: paymentData.currency,
        customerEmail: paymentData.customerEmail,
        customerFirstName: paymentData.customerFirstName,
        customerLastName: paymentData.customerLastName,
        customerPhone: paymentData.customerPhone,
      });
      console.log('✅ Order created:', order.id);

      // Step 3: Generate payment key
      const paymentKey = await this.generatePaymentKey(
        order.id.toString(),
        paymentData.amount,
        {
          email: paymentData.customerEmail,
          firstName: paymentData.customerFirstName,
          lastName: paymentData.customerLastName,
          phone: paymentData.customerPhone,
        }
      );
      console.log('✅ Payment key generated');

      // Step 4: Construct iframe URL
      const iframeUrl = `${this.config.iframeUrl}?payment_token=${paymentKey.token}`;

      return {
        orderId: order.id.toString(),
        paymentToken: paymentKey.token,
        iframeUrl,
        success: true,
      };
    } catch (error) {
      console.error('Failed to create payment intent:', error);
      throw error;
    }
  }

  /**
   * Verify callback signature
   */
  verifyCallback(data: any, receivedHmac: string): boolean {
    try {
      const crypto = require('crypto');
      
      // Sort the data keys and create query string
      const sortedKeys = Object.keys(data).sort();
      const queryString = sortedKeys
        .map(key => `${key}=${data[key]}`)
        .join('&');

      // Calculate HMAC
      const calculatedHmac = crypto
        .createHmac('sha512', this.config.secretKey)
        .update(queryString)
        .digest('hex');

      return calculatedHmac === receivedHmac;
    } catch (error) {
      console.error('HMAC verification failed:', error);
      return false;
    }
  }

  /**
   * Get iframe URL with payment token
   */
  getIframeUrl(paymentToken: string): string {
    return `${this.config.iframeUrl}?payment_token=${paymentToken}`;
  }
}

// Export singleton instance
const paymobConfig: PaymobConfig = {
  apiKey: process.env.PAYMOB_API_KEY!,
  integrationId: process.env.INTEGRATION_ID!,
  iframeUrl: process.env.IFRAME_URL!,
  secretKey: process.env.PAYMOB_SECRET_KEY!,
};

export const paymobService = new PaymobService(paymobConfig);