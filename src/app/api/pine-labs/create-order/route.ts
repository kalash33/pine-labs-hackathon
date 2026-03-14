import { NextResponse } from 'next/server';
import { createOrder, generateOrderRef } from '@/lib/pinelabs';

/**
 * POST /api/pine-labs/create-order
 * Creates a real Pine Labs order and returns the hosted checkout redirect URL.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { amount, customerName, customerEmail, customerPhone, description, activeMethod } = body;

    if (!amount || amount <= 0) {
      return NextResponse.json({ error: 'Invalid amount' }, { status: 400 });
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const merchantOrderRef = generateOrderRef();

    // Amount must be in paise (1 INR = 100 paise)
    const amountInPaise = Math.round(Number(amount) * 100);

    // Map frontend activeMethod to Pine Labs allowed_payment_methods
    let allowedMethods: string[] | undefined = undefined;
    if (activeMethod) {
      if (activeMethod === 'card') allowedMethods = ['CARD'];
      else if (activeMethod === 'upi') allowedMethods = ['UPI'];
      else if (activeMethod === 'wallet') allowedMethods = ['WALLET'];
    }

    const order = await createOrder({
      merchantOrderReference: merchantOrderRef,
      amount: amountInPaise,
      currency: 'INR',
      integrationMode: 'IFRAME',
      allowedPaymentMethods: allowedMethods,
      callbackUrl: `${appUrl}/api/pine-labs/callback?ref=${merchantOrderRef}`,
      failureCallbackUrl: `${appUrl}/api/pine-labs/callback?ref=${merchantOrderRef}`,
      customerName: customerName || 'Hackathon Tester',
      customerEmail: customerEmail || 'test@example.com',
      customerPhone: customerPhone || '9999999999',
      description: description || 'AI Checkout Optimizer Demo',
    });

    return NextResponse.json({
      success: true,
      order_id: order.order_id,
      redirect_url: order.redirect_url,
      token: order.token,
      merchant_order_reference: merchantOrderRef,
    });

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Pine Labs Create Order Error:', message);
    return NextResponse.json(
      { error: 'Failed to create Pine Labs order', details: message },
      { status: 500 }
    );
  }
}
