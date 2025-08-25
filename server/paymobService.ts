import fetch from 'node-fetch';
import crypto from 'crypto';

export interface PaymobConfig {
  secretKey: string;    // server-side
  publicKey: string;    // used only to build the checkout URL
  hmacSecret: string;   // webhook verification
}

export interface PaymentIntentRequest {
  amount: number; // Amount in cents
  currency: string;
  merchantOrderId: string;
  customerEmail: string;
  customerFirstName: string;
  customerLastName: string;
  customerPhone?: string;
  items: Array<{
    name: string;
    amount: number;
    quantity: number;
  }>;
}

export interface PaymentIntentResponse {
  id: string;
  client_secret: string;
  redirect_url: string;
}

// Flash webhook interface - simplified
export interface FlashWebhookData {
  obj?: {
    success?: boolean;
    pending?: boolean;
    merchant_order_id?: string;
    id?: string | number;
    amount_cents?: number;
  };
  success?: boolean;
  pending?: boolean;
  merchant_order_id?: string;
  id?: string | number;
  amount_cents?: number;
}

export class PaymobService {
  private config: PaymobConfig;

  constructor(config: PaymobConfig) {
    this.config = config;
  }

  /**
   * Create Payment Intention using v1/intention API (Direct Flash Integration)
   */
  async createPaymentIntention(paymentData: PaymentIntentRequest): Promise<PaymentIntentResponse> {
    try {
      console.log('🔄 Creating Paymob payment intention with v1/intention API...', { 
        amount: paymentData.amount,
        merchantOrderId: paymentData.merchantOrderId 
      });

      // Use v1/intention API directly as per Paymob documentation
      const intentionPayload = {
        amount: Math.round(paymentData.amount / 100), // Convert from cents to EGP
        currency: paymentData.currency || 'EGP',
        payment_methods: [
          process.env.PAYMOB_INTEGRATION_ID ? parseInt(process.env.PAYMOB_INTEGRATION_ID) : 4233746,
          "card"
        ],
        items: paymentData.items?.length ? paymentData.items.map(item => ({
          name: item.name,
          amount: Math.round(item.amount / 100),
          description: item.name,
          quantity: item.quantity || 1
        })) : [{
          name: 'Athlete360 Tokens',
          amount: Math.round(paymentData.amount / 100),
          description: 'Token purchase',
          quantity: 1
        }],
        billing_data: {
          apartment: '6',
          first_name: paymentData.customerFirstName || 'Customer',
          last_name: paymentData.customerLastName || 'User',
          street: '938, Al-Jadeed Bldg',
          building: '939',
          phone_number: paymentData.customerPhone || '+201234567890',
          country: 'EGY',
          email: paymentData.customerEmail || 'customer@example.com',
          floor: '1',
          state: 'Cairo'
        },
        customer: {
          first_name: paymentData.customerFirstName || 'Customer',
          last_name: paymentData.customerLastName || 'User',
          email: paymentData.customerEmail || 'customer@example.com',
          extras: {
            merchant_order_id: paymentData.merchantOrderId
          }
        },
        extras: {
          merchant_order_id: paymentData.merchantOrderId
        }
      };

      console.log('📤 Sending v1/intention request:', JSON.stringify(intentionPayload, null, 2));

      const intentionResponse = await fetch('https://accept.paymob.com/v1/intention/', {
        method: 'POST',
        headers: {
          'Authorization': `Token ${this.config.secretKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(intentionPayload)
      });

      if (!intentionResponse.ok) {
        const errorData = await intentionResponse.json();
        console.error('❌ v1/intention API error:', errorData);
        throw new Error(`Failed to create payment intention: ${JSON.stringify(errorData)}`);
      }

      const intentionData: any = await intentionResponse.json();
      console.log('✅ Payment intention created:', {
        client_secret: intentionData.client_secret?.substring(0, 20) + '...',
        payment_methods: intentionData.payment_methods?.length
      });

      // Create unified checkout URL with publicKey and client_secret
      const checkoutUrl = `https://accept.paymob.com/unifiedcheckout/?publicKey=${this.config.publicKey}&clientSecret=${intentionData.client_secret}`;
      
      console.log('🔗 Constructed unified checkout URL');

      return {
        id: intentionData.id?.toString() || paymentData.merchantOrderId,
        client_secret: intentionData.client_secret,
        redirect_url: checkoutUrl
      };
    } catch (error) {
      console.error('Paymob payment intention creation error:', error);
      throw new Error('Failed to create payment intention');
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
   * Process Flash webhook data (simplified)
   */
  processFlashWebhookData(webhookData: FlashWebhookData): {
    isSuccess: boolean;
    isPending: boolean;
    merchantOrderId: string;
    transactionId: string;
    amountCents: number;
  } {
    console.log('📊 Processing Flash webhook data:', JSON.stringify(webhookData, null, 2));

    const isSuccess = webhookData?.obj?.success ?? webhookData?.success ?? false;
    const isPending = webhookData?.obj?.pending ?? webhookData?.pending ?? false;
    const merchantOrderId = webhookData?.obj?.merchant_order_id ?? webhookData?.merchant_order_id ?? '';
    const transactionId = String(webhookData?.obj?.id ?? webhookData?.id ?? '');
    const amountCents = Number(webhookData?.obj?.amount_cents ?? webhookData?.amount_cents ?? 0);

    return {
      isSuccess,
      isPending,
      merchantOrderId,
      transactionId,
      amountCents
    };
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
  hmacSecret: process.env.HMAC!,
};

export const paymobService = new PaymobService(paymobConfig);