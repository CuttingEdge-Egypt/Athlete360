import fetch from 'node-fetch';
import crypto from 'crypto';

export interface PaymobConfig {
  secretKey: string;
  publicKey: string;
  integrationId: string;
  hmacSecret: string;
}

export interface PaymentData {
  amount: number;
  currency: string;
  customerEmail: string;
  customerFirstName: string;
  customerLastName: string;
  customerPhone?: string;
}

export interface PaymobIntentionResponse {
  id: string;
  client_secret: string;
  amount: number;
  currency: string;
  status: string;
  created: string;
  payment_methods: number[];
}

export interface PaymobCallbackData {
  id: string;
  success: boolean | string;
  pending: boolean | string;
  amount_cents: number;
  currency: string;
  source_data: {
    type: string;
    pan: string;
    sub_type: string;
  };
  special_reference: string;
  extras: any;
  confirmed: boolean;
  status: string;
  created: string;
  card_detail: string;
  object: string;
}

export class PaymobService {
  private config: PaymobConfig;

  constructor(config: PaymobConfig) {
    this.config = config;
  }

  /**
   * Create payment intention using the new unified Intention API
   * This replaces the old multi-step process (auth -> order -> payment key)
   */
  async createPaymentIntention(paymentData: PaymentData): Promise<PaymobIntentionResponse> {
    try {
      console.log('🔄 Creating Paymob payment intention using new API...', { amount: paymentData.amount });
      console.log('🔍 PaymobService config check:', {
        hasSecretKey: !!this.config.secretKey,
        hasPublicKey: !!this.config.publicKey,
        hasIntegrationId: !!this.config.integrationId,
        integrationId: this.config.integrationId
      });

      // Get base URL for callbacks - use deployment domain or environment variable
      const baseUrl = process.env.DEPLOYED_DOMAIN 
        ? process.env.DEPLOYED_DOMAIN
        : process.env.REPLIT_DOMAINS 
        ? `https://${process.env.REPLIT_DOMAINS}`
        : `https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co`;
      
      console.log(`🌐 Using callback base URL: ${baseUrl}`);

      // Convert EGP to cents (multiply by 100) - Paymob expects amounts in cents
      const amountInCents = Math.round(paymentData.amount * 100);
      console.log(`💰 Converting ${paymentData.amount} EGP to ${amountInCents} cents`);
      
      const requestPayload = {
        amount: amountInCents,
        currency: paymentData.currency,
        payment_methods: [
          parseInt(this.config.integrationId)
        ],
        items: [
          {
            name: "Token Package",
            amount: amountInCents,
            description: "Token purchase for Athlete360",
            quantity: 1
          }
        ],
        billing_data: {
          apartment: "NA",
          first_name: paymentData.customerFirstName,
          last_name: paymentData.customerLastName,
          street: "Main Street",
          building: "NA",
          phone_number: paymentData.customerPhone || "+201234567890",
          country: "EGY",
          email: paymentData.customerEmail,
          floor: "NA",
          state: "Cairo"
        },
        customer: {
          first_name: paymentData.customerFirstName,
          last_name: paymentData.customerLastName,
          email: paymentData.customerEmail
        },
        notification_url: `${baseUrl}/api/payments/paymob-processed`,
        redirection_url: `${baseUrl}/api/payments/paymob-response`
      };

      console.log('📤 Intention API request:', JSON.stringify(requestPayload, null, 2));

      const response = await fetch('https://accept.paymob.com/v1/intention/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Token ${this.config.secretKey}`
        },
        body: JSON.stringify(requestPayload)
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('❌ Intention API error:', errorData);
        throw new Error(`Failed to create intention: ${JSON.stringify(errorData)}`);
      }

      const intentionData: any = await response.json();
      console.log('✅ Payment intention created successfully:', intentionData.id);
      console.log('✅ Payment intention created:', intentionData.id);

      // Create unified checkout URL with publicKey and clientSecret
      const checkoutUrl = `https://accept.paymob.com/unifiedcheckout/?publicKey=${this.config.publicKey}&clientSecret=${intentionData.client_secret}`;
      console.log('🔗 Constructed unified checkout URL:', checkoutUrl);
      console.log('✅ Using Integration ID:', this.config.integrationId);

      return {
        id: intentionData.id,
        client_secret: intentionData.client_secret,
        amount: intentionData.amount,
        currency: intentionData.currency,
        status: intentionData.status,
        created: intentionData.created,
        payment_methods: intentionData.payment_methods
      };
    } catch (error) {
      console.error('💥 Paymob intention creation error:', error);
      throw new Error(`Failed to create payment intention: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Verify webhook HMAC signature
   */
  verifyWebhookSignature(rawBody: string, headerValue: string): boolean {
    if (!headerValue) return false;
    const computed = crypto
      .createHmac('sha512', this.config.hmacSecret)
      .update(rawBody, 'utf8')
      .digest('hex');
    // constant-time compare
    const a = Buffer.from(computed, 'hex');
    const b = Buffer.from(headerValue, 'hex');
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  }

  /**
   * Process payment callback from Paymob
   */
  async processPaymentCallback(callbackData: any, hmacSignature?: string): Promise<PaymobCallbackData> {
    console.log('🔐 Processing Paymob callback:', callbackData);

    // Return the callback data as-is for now
    return callbackData;
  }

  /**
   * Verify payment status by transaction ID (optional verification)
   */
  async verifyPaymentStatus(transactionId: number): Promise<any> {
    try {
      console.log('🔍 Verifying payment status for transaction:', transactionId);

      const response = await fetch(`https://accept.paymob.com/api/acceptance/transactions/${transactionId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Token ${this.config.secretKey}`,
        },
      });

      const data: any = await response.json();

      if (!response.ok) {
        throw new Error(`Payment verification failed: ${data.message || 'Unknown error'}`);
      }

      console.log('✅ Payment verification result:', data);
      return data;
    } catch (error) {
      console.error('Payment verification error:', error);
      throw new Error('Failed to verify payment status');
    }
  }
}

// Export singleton instance
const paymobConfig: PaymobConfig = {
  secretKey: process.env.PAYMOB_SECRET_KEY!,
  publicKey: process.env.PAYMOB_PUBLIC_KEY!,
  integrationId: process.env.INTEGRATION_ID!,
  hmacSecret: process.env.PAYMOB_HMAC_SECRET!
};

export const paymobService = new PaymobService(paymobConfig);