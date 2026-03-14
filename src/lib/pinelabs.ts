// Pine Labs Online Payment API Service
// UAT Base URL: https://pluraluat.v2.pinepg.in/api
// Docs: https://developer.pinelabsonline.com

const BASE_URL = process.env.PINELABS_BASE_URL || 'https://pluraluat.v2.pinepg.in/api';

// Read credentials inside functions (not at module level) to ensure
// they are always resolved from the current process.env at call time.
function getClientId() { return process.env.PINELABS_CLIENT_ID || ''; }
function getClientSecret() { return process.env.PINELABS_CLIENT_SECRET || ''; }

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
  paymentMethod: 'CARD' | 'UPI' | 'WALLET' | 'NETBANKING';
  cardDetails?: CardDetails; // Only required if paymentMethod is CARD
  upiId?: string; // Only required if paymentMethod is UPI
  walletCode?: string; // Only required if paymentMethod is WALLET
  payCode?: string; // Only required if paymentMethod is NETBANKING
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
      client_id: getClientId(),
      client_secret: getClientSecret(),
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

// ─── Agent Enablement Toolkit APIs ───────────────────────────────────────────
// Ref: https://developer.pinelabsonline.com/docs/agent-enablement-toolkit

export interface EmiPlan {
  tenure: number;           // months
  emi_amount: number;       // per month in paise
  interest_rate: number;    // annual %
  total_amount: number;     // total payable in paise
  bank_name?: string;
  scheme_id?: string;
}

export interface EmiOptionsResponse {
  order_id?: string;
  emi_plans: EmiPlan[];
  [key: string]: unknown;
}

export interface OrderStatusResponse {
  order_id: string;
  merchant_order_reference: string;
  status: "CREATED" | "PENDING" | "PROCESSED" | "FAILED" | "CANCELLED";
  order_amount?: { value: number; currency: string };
  payments?: Array<{
    id: string;
    status: string;
    payment_method: string;
    payment_amount: { value: number; currency: string };
  }>;
  [key: string]: unknown;
}

/**
 * Agent Enablement Toolkit: Get EMI options for an order
 * Allows the AI agent to present real EMI plans to the user during recovery.
 * Ref: https://developer.pinelabsonline.com/docs/agent-enablement-toolkit
 */
export async function getEmiOptions(
  orderId: string
): Promise<EmiOptionsResponse> {
  const tokenData = await generateToken();
  const url = `${BASE_URL}/pay/v1/orders/${orderId}/emi-options`;

  const response = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${tokenData.access_token}`,
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    // Return mock EMI plans if API not available in UAT
    console.warn(`[Pine Labs] EMI options not available: ${errorText}`);
    return getMockEmiPlans();
  }

  const data = await response.json();
  return data as EmiOptionsResponse;
}

/**
 * Agent Enablement Toolkit: Get order status
 * Used by the AI agent to verify payment state before suggesting recovery.
 */
export async function getOrderStatus(
  orderId: string
): Promise<OrderStatusResponse> {
  const tokenData = await generateToken();
  const url = `${BASE_URL}/checkout/v1/orders/${orderId}`;

  const response = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${tokenData.access_token}`,
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Pine Labs Order Status Error [${response.status}]: ${errorText}`);
  }

  const data = await response.json();
  return data as OrderStatusResponse;
}

/**
 * Mock EMI plans for UAT/demo when real API is unavailable
 */
function getMockEmiPlans(): EmiOptionsResponse {
  return {
    emi_plans: [
      { tenure: 3,  emi_amount: 150000, interest_rate: 0,    total_amount: 450000, bank_name: "HDFC Bank",  scheme_id: "HDFC_3M_0" },
      { tenure: 6,  emi_amount: 77500,  interest_rate: 1.5,  total_amount: 465000, bank_name: "HDFC Bank",  scheme_id: "HDFC_6M_15" },
      { tenure: 9,  emi_amount: 53333,  interest_rate: 2.0,  total_amount: 480000, bank_name: "ICICI Bank", scheme_id: "ICICI_9M_20" },
      { tenure: 12, emi_amount: 41250,  interest_rate: 2.5,  total_amount: 495000, bank_name: "SBI",        scheme_id: "SBI_12M_25" },
    ],
  };
}

/**
 * Get Card Details from Pine Labs API (Agent Enablement Toolkit)
 * Ref: https://developer.pinelabsonline.com/reference/get-card-details
 *
 * Returns card network, type (credit/debit/prepaid), issuer bank,
 * EMI eligibility, and international flag for a given BIN (first 6-8 digits).
 */
export async function getCardDetails(cardNumber: string): Promise<{
  source: "pine_labs_api" | "bin_lookup";
  bin: string;
  network?: string;
  card_type?: string;
  issuer?: string;
  emi_eligible?: boolean;
  international?: boolean;
  [key: string]: unknown;
}> {
  const bin = cardNumber.replace(/\s/g, "").slice(0, 8);
  try {
    const tokenData = await generateToken();
    const url = `${BASE_URL}/checkout/v1/card/details?card_number=${bin}`;
    const response = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
        Accept: "application/json",
      },
    });
    if (response.ok) {
      const data = await response.json();
      return { source: "pine_labs_api", bin, ...data };
    }
    console.warn(`[Pine Labs] Card details API returned ${response.status}, using BIN lookup`);
  } catch (err) {
    console.warn("[Pine Labs] Card details API unavailable:", err);
  }
  // Fallback to local BIN lookup
  const info = getMockCardDetails(bin.slice(0, 6));
  return { source: "bin_lookup", bin, network: info.network, card_type: info.type, issuer: info.issuer, emi_eligible: info.emi_eligible, international: false };
}

/**
 * getMockCardDetails — BIN lookup used by the agent tool when Pine Labs API is unavailable.
 * Also exported for use in agent.ts.
 */
export function getMockCardDetails(bin: string): {
  network: string; type: string; issuer: string;
  emi_eligible: boolean; success_rate: number; risk_score: string;
} {
  const knownBins: Record<string, ReturnType<typeof getMockCardDetails>> = {
    "401200": { network: "Visa", type: "credit", issuer: "HDFC Bank", emi_eligible: true, success_rate: 98.2, risk_score: "low" },
    "400000": { network: "Visa", type: "credit", issuer: "Test Bank", emi_eligible: false, success_rate: 12.0, risk_score: "high" },
  };
  if (knownBins[bin]) return knownBins[bin];
  const first = bin[0], firstTwo = bin.slice(0, 2);
  let network = "Unknown";
  if (first === "4") network = "Visa";
  else if (["51","52","53","54","55"].includes(firstTwo)) network = "Mastercard";
  else if (["34","37"].includes(firstTwo)) network = "Amex";
  else if (first === "6") network = "RuPay";
  return { network, type: "credit", issuer: "Unknown Bank", emi_eligible: network !== "Amex", success_rate: 85.0, risk_score: "medium" };
}

/**
 * Converts INR amount to paise (Pine Labs expects paise).
 * e.g. ₹4,500 → 450000
 */
export function toPaise(inr: number): number {
  return Math.round(inr * 100);
}

/**
 * Converts paise back to INR for display.
 */
export function fromPaise(paise: number): number {
  return paise / 100;
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
        wallet_code: paymentData.walletCode || 'AMAZON' // Default to AMAZON Pay
      }
    };
  } else if (paymentData.paymentMethod === 'NETBANKING') {
    paymentPayload.payment_option = {
      netbanking_details: {
        pay_code: paymentData.payCode || 'NB1493' // Default test bank
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
