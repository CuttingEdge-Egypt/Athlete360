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
   * Create Payment Intention using the new Paymob Flash API
   */
  async createPaymentIntention(paymentData: PaymentIntentRequest): Promise<PaymentIntentResponse> {
    try {
      console.log('🔄 Creating Paymob payment intention with Flash API...', { 
        amount: paymentData.amount,
        merchantOrderId: paymentData.merchantOrderId 
      });

      const paymentMethods = (process.env.PAYMOB_PAYMENT_METHOD_IDS || '')
        .split(',')
        .map(s => parseInt(s.trim(), 10))
        .filter(n => Number.isFinite(n));

      const requestPayload: any = {
        amount: paymentData.amount,            // cents
        currency: paymentData.currency || 'EGP',
        payment_methods: paymentMethods.length ? paymentMethods : undefined,
        items: paymentData.items?.length ? paymentData.items : [{
          name: `${paymentData.merchantOrderId}`,
          amount: paymentData.amount,
          quantity: 1
        }],
        billing_data: {
          email: paymentData.customerEmail || '',
          first_name: paymentData.customerFirstName || '',
          last_name: paymentData.customerLastName || '',
          phone_number: paymentData.customerPhone || '',
          apartment: 'NA', floor: 'NA', building: 'NA',
          street: 'NA', city: 'Cairo', state: 'Cairo', country: 'EG', postal_code: '11511'
        },
        extras: {
          merchant_order_id: paymentData.merchantOrderId,
        }
      };

      console.log('📤 Payment intention request:', JSON.stringify(requestPayload, null, 2));

      const response = await fetch('https://accept.paymob.com/v2/intention/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Token ${this.config.secretKey}`, // Use secret key for authentication
        },
        body: JSON.stringify(requestPayload),
      });

      const data: any = await response.json();

      if (!response.ok) {
        console.error('❌ Payment intention creation failed:', {
          status: response.status,
          statusText: response.statusText,
          data: data,
          requestPayload: JSON.stringify(requestPayload, null, 2)
        });
        
        throw new Error(
          `Payment intention failed: ${data.message || data.detail || data.non_field_errors?.[0] || 'Unknown error'}`
        );
      }

      console.log('✅ Payment intention created successfully:', data);

      // Construct the unified checkout URL as per Paymob documentation
      const checkoutUrl = `https://accept.paymob.com/unifiedcheckout/?publicKey=${this.config.publicKey}&clientSecret=${data.client_secret}`;
      
      console.log('🔗 Constructed checkout URL:', checkoutUrl);

      return {
        id: data.id,
        client_secret: data.client_secret,
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
  hmacSecret: process.env.PAYMOB_HMAC_SECRET!,
};

export const paymobService = new PaymobService(paymobConfig);