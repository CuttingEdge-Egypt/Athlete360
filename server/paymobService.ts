import fetch from 'node-fetch';
import crypto from 'crypto';

export interface PaymobConfig {
  apiKey: string;
  secretKey: string;
  publicKey: string;
  hmacSecret: string;
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
  iframe_url?: string;
  payment_methods: any[];
}

export interface WebhookData {
  amount_cents: number;
  created_at: string;
  currency: string;
  error_occurred: boolean;
  has_parent_transaction: boolean;
  id: number;
  integration_id: number;
  is_3d_secure: boolean;
  is_auth: boolean;
  is_capture: boolean;
  is_refunded: boolean;
  is_standalone_payment: boolean;
  is_voided: boolean;
  order: {
    id: number;
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
  };
  owner: number;
  pending: boolean;
  source_data: any;
  success: boolean;
  terminal_id: any;
  transaction_processed_callback_responses: any[];
  type: string;
  updated_at: string;
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

      const baseUrl = process.env.NODE_ENV === 'production' 
        ? 'https://athlete360.ai' 
        : 'https://7a39e49f-f0e4-4a38-b983-657e85e5de90-00-24ejenwpt1nmi.riker.replit.dev';

      const requestPayload = {
        amount: paymentData.amount,
        currency: paymentData.currency,
        payment_methods: [parseInt(process.env.INTEGRATION_ID || '0')], // Use integration ID from env
        merchant_order_id: paymentData.merchantOrderId,
        items: paymentData.items,
        customer: {
          first_name: paymentData.customerFirstName,
          last_name: paymentData.customerLastName,
          email: paymentData.customerEmail,
          phone: paymentData.customerPhone || '+201234567890',
        },
        billing_data: {
          apartment: 'NA',
          email: paymentData.customerEmail,
          floor: 'NA',
          first_name: paymentData.customerFirstName,
          street: 'Main Street',
          building: 'NA',
          phone_number: paymentData.customerPhone || '+201234567890',
          shipping_method: 'NA',
          postal_code: '11511',
          city: 'Cairo',
          country: 'EG',
          last_name: paymentData.customerLastName,
          state: 'Cairo',
        },
        shipping_data: {
          apartment: 'NA',
          email: paymentData.customerEmail,
          floor: 'NA',
          first_name: paymentData.customerFirstName,
          street: 'Main Street',
          building: 'NA',
          phone_number: paymentData.customerPhone || '+201234567890',
          postal_code: '11511',
          city: 'Cairo',
          country: 'EG',
          last_name: paymentData.customerLastName,
          state: 'Cairo',
        },
        extras: {
          ee: 3 // Enable 3D Secure
        },
        // Webhook and callback URLs
        redirection_url: `${baseUrl}/payment-success`,
        callback_url: `${baseUrl}/api/payments/webhook`,
      };

      console.log('📤 Payment intention request:', JSON.stringify(requestPayload, null, 2));

      const response = await fetch('https://accept.paymob.com/v2/intention/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Token ${this.config.apiKey}`, // Use API key as token
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
        
        throw new Error(`Payment intention failed: ${data.message || data.detail || 'Unknown error'}`);
      }

      console.log('✅ Payment intention created successfully:', data);

      return {
        id: data.id,
        client_secret: data.client_secret,
        redirect_url: data.redirect_url,
        iframe_url: data.iframe_url,
        payment_methods: data.payment_methods || []
      };
    } catch (error) {
      console.error('Paymob payment intention creation error:', error);
      throw new Error('Failed to create payment intention');
    }
  }

  /**
   * Verify webhook HMAC signature
   */
  verifyWebhookSignature(payload: string, receivedSignature: string): boolean {
    try {
      console.log('🔐 Verifying webhook HMAC signature...');
      
      // Remove any whitespace from the signature
      const cleanSignature = receivedSignature.trim();
      
      // Calculate expected signature
      const expectedSignature = crypto
        .createHmac('sha512', this.config.hmacSecret)
        .update(payload)
        .digest('hex');

      console.log('Received signature:', cleanSignature);
      console.log('Expected signature:', expectedSignature);
      
      const isValid = expectedSignature === cleanSignature;
      console.log('Signature verification:', isValid ? '✅ Valid' : '❌ Invalid');
      
      return isValid;
    } catch (error) {
      console.error('HMAC verification error:', error);
      return false;
    }
  }

  /**
   * Process webhook data and determine payment status
   */
  processWebhookData(webhookData: WebhookData): {
    isSuccess: boolean;
    transactionId: number;
    orderId: number;
    merchantOrderId: string;
    amountCents: number;
    currency: string;
    isPending: boolean;
    errorOccurred: boolean;
  } {
    console.log('📊 Processing webhook data:', JSON.stringify(webhookData, null, 2));

    return {
      isSuccess: webhookData.success && !webhookData.error_occurred && !webhookData.pending,
      transactionId: webhookData.id,
      orderId: webhookData.order.id,
      merchantOrderId: webhookData.order.merchant_order_id,
      amountCents: webhookData.amount_cents,
      currency: webhookData.currency,
      isPending: webhookData.pending,
      errorOccurred: webhookData.error_occurred,
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
          'Authorization': `Token ${this.config.apiKey}`,
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
  apiKey: process.env.PAYMOB_API_KEY!,
  secretKey: process.env.PAYMOB_SECRET_KEY!,
  publicKey: process.env.PAYMOB_PUBLIC_KEY!,
  hmacSecret: process.env.HMAC!,
};

export const paymobService = new PaymobService(paymobConfig);