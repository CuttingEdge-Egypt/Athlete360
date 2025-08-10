import fetch from 'node-fetch';

export interface PaymobPaymentRequest {
  amount: number;
  currency: string;
  orderId: string;
  userId: string;
  tokens: number;
}

export interface PaymobAuthResponse {
  token: string;
}

export interface PaymobOrderResponse {
  id: number;
  created_at: string;
  delivery_needed: boolean;
  merchant: {
    id: number;
    created_at: string;
    phones: string[];
    company_emails: string[];
    company_name: string;
    state: string;
    country: string;
    city: string;
    postal_code: string;
    street: string;
  };
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

class PaymobService {
  private apiKey: string;
  private integrationId: string;
  private iframeUrl: string;
  private baseUrl = 'https://accept.paymob.com/api';

  constructor() {
    this.apiKey = process.env.PAYMOB_API_KEY || '';
    this.integrationId = process.env.PAYMOB_INTEGRATION_ID || '';
    this.iframeUrl = process.env.IFRAME_URL || '';

    if (!this.apiKey || !this.integrationId || !this.iframeUrl) {
      console.warn('Paymob configuration incomplete. Required: PAYMOB_API_KEY, PAYMOB_INTEGRATION_ID, IFRAME_URL');
    }
  }

  async authenticate(): Promise<string> {
    try {
      const response = await fetch(`${this.baseUrl}/auth/tokens`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          api_key: this.apiKey,
        }),
      });

      if (!response.ok) {
        throw new Error(`Authentication failed: ${response.statusText}`);
      }

      const data = await response.json() as PaymobAuthResponse;
      return data.token;
    } catch (error) {
      console.error('Paymob authentication error:', error);
      throw new Error('Failed to authenticate with Paymob');
    }
  }

  async createOrder(authToken: string, paymentRequest: PaymobPaymentRequest): Promise<PaymobOrderResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/ecommerce/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          auth_token: authToken,
          delivery_needed: false,
          amount_cents: paymentRequest.amount * 100, // Convert to cents
          currency: paymentRequest.currency.toUpperCase(),
          merchant_order_id: paymentRequest.orderId,
          items: [
            {
              name: `${paymentRequest.tokens} Tokens`,
              amount_cents: paymentRequest.amount * 100,
              description: `Athlete360 Token Purchase - ${paymentRequest.tokens} tokens`,
              quantity: 1,
            },
          ],
        }),
      });

      if (!response.ok) {
        throw new Error(`Order creation failed: ${response.statusText}`);
      }

      const data = await response.json() as PaymobOrderResponse;
      return data;
    } catch (error) {
      console.error('Paymob order creation error:', error);
      throw new Error('Failed to create order with Paymob');
    }
  }

  async createPaymentKey(authToken: string, order: PaymobOrderResponse, paymentRequest: PaymobPaymentRequest): Promise<string> {
    try {
      const response = await fetch(`${this.baseUrl}/acceptance/payment_keys`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          auth_token: authToken,
          amount_cents: paymentRequest.amount * 100,
          expiration: 3600, // 1 hour
          order_id: order.id,
          billing_data: {
            apartment: 'NA',
            email: 'user@athlete360.com',
            floor: 'NA',
            first_name: 'User',
            street: 'NA',
            building: 'NA',
            phone_number: '+201234567890',
            shipping_method: 'NA',
            postal_code: 'NA',
            city: 'NA',
            country: 'NA',
            last_name: 'Name',
            state: 'NA',
          },
          currency: paymentRequest.currency.toUpperCase(),
          integration_id: parseInt(this.integrationId),
          lock_order_when_paid: true,
        }),
      });

      if (!response.ok) {
        throw new Error(`Payment key creation failed: ${response.statusText}`);
      }

      const data = await response.json() as PaymobPaymentKeyResponse;
      return data.token;
    } catch (error) {
      console.error('Paymob payment key creation error:', error);
      throw new Error('Failed to create payment key with Paymob');
    }
  }

  async initiatePayment(paymentRequest: PaymobPaymentRequest): Promise<{ paymentUrl: string; orderId: string }> {
    try {
      // Step 1: Authenticate
      const authToken = await this.authenticate();

      // Step 2: Create order
      const order = await this.createOrder(authToken, paymentRequest);

      // Step 3: Create payment key
      const paymentKey = await this.createPaymentKey(authToken, order, paymentRequest);

      // Step 4: Generate payment URL
      const paymentUrl = `${this.iframeUrl}?payment_token=${paymentKey}`;

      return {
        paymentUrl,
        orderId: order.id.toString(),
      };
    } catch (error) {
      console.error('Paymob payment initiation error:', error);
      throw new Error('Failed to initiate payment with Paymob');
    }
  }

  async verifyPayment(transactionId: string): Promise<boolean> {
    try {
      const authToken = await this.authenticate();
      
      const response = await fetch(`${this.baseUrl}/acceptance/transactions/${transactionId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Transaction verification failed: ${response.statusText}`);
      }

      const transaction = await response.json() as any;
      return transaction.success === true;
    } catch (error) {
      console.error('Paymob payment verification error:', error);
      return false;
    }
  }

  isConfigured(): boolean {
    return !!(this.apiKey && this.integrationId && this.iframeUrl);
  }
}

export const paymobService = new PaymobService();