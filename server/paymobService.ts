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
   * Create Payment Intention using traditional 3-step process (works with current setup)
   */
  async createPaymentIntention(paymentData: PaymentIntentRequest): Promise<PaymentIntentResponse> {
    try {
      console.log('🔄 Creating Paymob payment using traditional 3-step process...', { 
        amount: paymentData.amount,
        merchantOrderId: paymentData.merchantOrderId 
      });

      // Step 1: Authenticate to get token
      const authResponse = await fetch('https://accept.paymob.com/api/auth/tokens', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          api_key: process.env.PAYMOB_API_KEY 
        })
      });

      if (!authResponse.ok) {
        throw new Error('Failed to authenticate with Paymob');
      }

      const authData: any = await authResponse.json();
      const token = authData.token;
      console.log('✅ Authenticated with Paymob');

      // Step 2: Create order
      const orderPayload = {
        auth_token: token,
        delivery_needed: "false",
        amount_cents: parseInt(String(paymentData.amount), 10), // FIX: Ensure amount is integer
        currency: paymentData.currency || 'EGP',
        merchant_order_id: paymentData.merchantOrderId,
        items: paymentData.items?.length ? paymentData.items.map(item => ({
          name: item.name,
          amount_cents: parseInt(String(item.amount), 10), // FIX: Ensure item amount is integer
          description: item.name,
          quantity: item.quantity || 1
        })) : [{
          name: `${paymentData.merchantOrderId}`,
          amount_cents: parseInt(String(paymentData.amount), 10), // FIX: Ensure amount is integer
          description: 'Token purchase',
          quantity: 1
        }]
      };

      const orderResponse = await fetch('https://accept.paymob.com/api/ecommerce/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderPayload)
      });

      if (!orderResponse.ok) {
        const orderError = await orderResponse.json();
        throw new Error(`Failed to create order: ${JSON.stringify(orderError)}`);
      }

      const orderData: any = await orderResponse.json();
      console.log('✅ Order created:', orderData.id);

      // Step 3: Generate payment key for integration  
      const integrationId = process.env.INTEGRATION_ID;
      const paymentKeyPayload = {
        auth_token: token,
        amount_cents: parseInt(String(paymentData.amount), 10), // FIX: Ensure amount is integer
        expiration: 3600,
        order_id: parseInt(orderData.id), // Convert to integer as required by Paymob
        billing_data: {
          email: paymentData.customerEmail || 'customer.payment@athlete360.eg',
          first_name: paymentData.customerFirstName || 'Ahmed',
          last_name: paymentData.customerLastName || 'Mohamed',
          phone_number: paymentData.customerPhone || '+201012345678',
          apartment: '6', floor: '1', building: '939',
          street: '938 Al-Jadeed Bldg', city: 'Cairo', state: 'Cairo', 
          country: 'EG', postal_code: '11511'
        },
        currency: paymentData.currency || 'EGP',
        integration_id: parseInt(integrationId!) // Convert to integer
      };

      const paymentKeyResponse = await fetch('https://accept.paymob.com/api/acceptance/payment_keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(paymentKeyPayload)
      });

      if (!paymentKeyResponse.ok) {
        const keyError = await paymentKeyResponse.json();
        throw new Error(`Failed to create payment key: ${JSON.stringify(keyError)}`);
      }

      const paymentKeyData: any = await paymentKeyResponse.json();
      console.log('✅ Payment key generated');

      // Create unified checkout URL with both publicKey and clientSecret
      const checkoutUrl = `https://accept.paymob.com/unifiedcheckout/?publicKey=${this.config.publicKey}&clientSecret=${paymentKeyData.token}`;
      
      console.log('🔗 Constructed checkout URL');

      return {
        id: orderData.id.toString(),
        client_secret: paymentKeyData.token,
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