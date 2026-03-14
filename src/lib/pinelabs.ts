// Pine Labs Online Payment API Service
// UAT Base URL: https://pluraluat.v2.pinepg.in/api
// Docs: https://developer.pinelabsonline.com

const BASE_URL = process.env.PINELABS_BASE_URL || 'https://pluraluat.v2.pinepg.in/api';
const CLIENT_ID = process.env.PINELABS_CLIENT_ID!;
const CLIENT_SECRET = process.env.PINELABS_CLIENT_SECRET!;

export interface PineLabsToken {
  access_token: string;
  expires_at: string;
  token_type?: string;
}

export interface CreateOrderRequest {
  merchantOrderReference: string;
  amount: number; // in paise (1 INR = 100 paise)
  currency?: string;
  callbackUrl: string;
  failureCallbackUrl: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  description?: string;
  integrationMode?: 'REDIRECT' | 'IFRAME';
  allowedPaymentMethods?: string[];
  preAuth?: boolean;
}

export interface PineLabsOrder {
  token?: string;
  order_id?: string;
  redirect_url?: string;
  merchant_order_reference?: string;
  [key: string]: unknown;
}

export interface CardDetails {
  name: string;
  cardNumber: string;
  cvv: string;
  expiryMonth: string;
  expiryYear: string;
  registeredMobileNumber?: string;
}

export interface CreatePaymentRequest {
  orderId: string;
  merchantPaymentReference: string;
  amount: number; // in paise
  currency?: string;
  paymentMethod: 'CARD' | 'UPI' | 'WALLET';
  cardDetails?: CardDetails; // Only required if paymentMethod is CARD
  upiId?: string; // Only required if paymentMethod is UPI
}

export interface PineLabsPayment {
  challenge_url?: string;
  status: string;
  [key: string]: unknown;
}

/**
 * Step 1: Generate a short-lived access token using client credentials
 */
export async function generateToken(): Promise<PineLabsToken> {
  const url = `${BASE_URL}/auth/v1/token`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify({
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      grant_type: 'client_credentials',
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Pine Labs Token Error [${response.status}]: ${errorText}`);
  }

  const data = await response.json();
  return data as PineLabsToken;
}

/**
 * Step 2: Create an order and get the hosted checkout redirect URL
 * Based on: https://developer.pinelabsonline.com reference for Hosted Checkout
 */
export async function createOrder(orderData: CreateOrderRequest): Promise<PineLabsOrder> {
  // First get the token
  const tokenData = await generateToken();

  const url = `${BASE_URL}/checkout/v1/orders`;

  // Build payload per Pine Labs Hosted Checkout API schema
  const payload = {
    merchant_order_reference: orderData.merchantOrderReference,
    order_amount: {
      value: orderData.amount, // in paise (e.g., 450000 for ₹4500)
      currency: orderData.currency || 'INR',
    },
    integration_mode: orderData.integrationMode || 'REDIRECT',
    ...(orderData.allowedPaymentMethods && { allowed_payment_methods: orderData.allowedPaymentMethods }),
    purchase_details: {
      customer: {
        email_id: orderData.customerEmail || 'customer@example.com',
        first_name: orderData.customerName?.split(' ')[0] || 'Guest',
        last_name: orderData.customerName?.split(' ').slice(1).join(' ') || 'User',
        customer_id: `CUST_${Date.now()}`,
        mobile_number: orderData.customerPhone || '9999999999',
      },
      merchant_metadata: {
        key1: 'ai_checkout_optimizer',
        key2: orderData.description || 'Hackathon Demo Order',
      },
    },
    callback_url: orderData.callbackUrl,
    failure_callback_url: orderData.failureCallbackUrl,
  };

  console.log('[Pine Labs] Creating order:', JSON.stringify(payload, null, 2));

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${tokenData.access_token}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const responseText = await response.text();
  console.log(`[Pine Labs] Order response [${response.status}]:`, responseText);

  if (!response.ok) {
    throw new Error(`Pine Labs Order Error [${response.status}]: ${responseText}`);
  }

  const data = JSON.parse(responseText);
  return data as PineLabsOrder;
}

/**
 * Generate a unique order reference ID
 */
export function generateOrderRef(): string {
  return `ORDER_${Date.now()}_${Math.floor(Math.random() * 9999)}`;
}

/**
 * Step 3: Create Payment (Seamless Checkout API)
 */
export async function createPayment(paymentData: CreatePaymentRequest): Promise<PineLabsPayment> {
  // First get the token
  const tokenData = await generateToken();

  const url = `${BASE_URL}/pay/v1/orders/${paymentData.orderId}/payments`;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const paymentPayload: any = {
    merchant_payment_reference: paymentData.merchantPaymentReference,
    payment_method: paymentData.paymentMethod,
    payment_amount: {
      value: paymentData.amount,
      currency: paymentData.currency || 'INR',
    },
  };

  if (paymentData.paymentMethod === 'CARD' && paymentData.cardDetails) {
    paymentPayload.payment_option = {
      card_details: {
        name: paymentData.cardDetails.name,
        card_number: paymentData.cardDetails.cardNumber,
        cvv: paymentData.cardDetails.cvv,
        expiry_month: paymentData.cardDetails.expiryMonth,
        expiry_year: paymentData.cardDetails.expiryYear,
        ...(paymentData.cardDetails.registeredMobileNumber && { registered_mobile_number: paymentData.cardDetails.registeredMobileNumber })
      }
    };
  } else if (paymentData.paymentMethod === 'UPI') {
    paymentPayload.payment_option = {
      upi_details: {
        vpa: paymentData.upiId || 'test@paytm'
      }
    };
  } else if (paymentData.paymentMethod === 'WALLET') {
    paymentPayload.payment_option = {
      wallet_details: {
        provider_name: 'PAYTM'
      }
    };
  }

  const payload = {
    payments: [paymentPayload]
  };

  console.log('[Pine Labs] Creating payment:', JSON.stringify(payload, null, 2));

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${tokenData.access_token}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const responseText = await response.text();
  console.log(`[Pine Labs] Payment response [${response.status}]:`, responseText);

  if (!response.ok) {
    throw new Error(`Pine Labs Payment Error [${response.status}]: ${responseText}`);
  }

  const data = JSON.parse(responseText);
  return data as PineLabsPayment;
}
