import { NextResponse } from 'next/server';
import { createOrder, createPayment, generateOrderRef } from '@/lib/pinelabs';

/**
 * POST /api/pine-labs/create-payment
 * Orchestrates creating an order and immediately processing payment via Seamless Checkout API.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { amount, activeMethod, cardDetails, customerName, customerEmail, customerPhone, description, upiId } = body;

    if (!amount || amount <= 0) {
      return NextResponse.json({ error: 'Invalid amount' }, { status: 400 });
    }

    if (!activeMethod) {
      return NextResponse.json({ error: 'Missing payment method' }, { status: 400 });
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const merchantOrderRef = generateOrderRef();

    // 1. Create Order
    const amountInPaise = Math.round(Number(amount) * 100);
    const order = await createOrder({
      merchantOrderReference: merchantOrderRef,
      amount: amountInPaise,
      currency: 'INR',
      callbackUrl: `${appUrl}/api/pine-labs/callback?ref=${merchantOrderRef}`,
      failureCallbackUrl: `${appUrl}/api/pine-labs/callback?ref=${merchantOrderRef}`,
      customerName: customerName || 'Hackathon Tester',
      customerEmail: customerEmail || 'test@example.com',
      customerPhone: customerPhone || '9999999999',
      description: description || 'AI Checkout Optimizer Demo',
      // No integration mode or allowed methods strict typing needed here vs IFRAME flow, 
      // but you can provide them if strict checks apply.
    });

    if (!order.order_id) {
      throw new Error('Pine Labs did not return an order_id');
    }

    // 2. Create Payment
    let paymentMethodCode: 'CARD' | 'UPI' | 'WALLET' = 'CARD';
    if (activeMethod === 'upi') paymentMethodCode = 'UPI';
    if (activeMethod === 'wallet') paymentMethodCode = 'WALLET';

    const merchantPaymentRef = `PAY_${Date.now()}`;

    const paymentResponse = await createPayment({
      orderId: order.order_id,
      merchantPaymentReference: merchantPaymentRef,
      amount: amountInPaise,
      currency: 'INR',
      paymentMethod: paymentMethodCode,
      cardDetails: paymentMethodCode === 'CARD' ? cardDetails : undefined,
      upiId: paymentMethodCode === 'UPI' ? (upiId || 'test@paytm') : undefined,
    });

    return NextResponse.json({
      success: true,
      // Handle Pine Labs nesting the response under a "data" object
      challenge_url: (paymentResponse as Record<string, unknown>).data 
        ? (paymentResponse.data as Record<string, string>).challenge_url 
        : paymentResponse.challenge_url,
      status: (paymentResponse as Record<string, unknown>).data 
        ? (paymentResponse.data as Record<string, string>).status 
        : paymentResponse.status,
      order_id: order.order_id,
      payment_response: paymentResponse
    });

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Pine Labs Create Payment API Error:', message);
    return NextResponse.json(
      { error: 'Failed to process Pine Labs seamless payment', details: message },
      { status: 500 }
    );
  }
}
