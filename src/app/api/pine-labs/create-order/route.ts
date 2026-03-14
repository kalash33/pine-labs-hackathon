import { NextResponse } from 'next/server';
import { createOrder, generateOrderRef } from '@/lib/pinelabs';
import { saveOrder } from '@/lib/dynamodb';

/**
 * POST /api/pine-labs/create-order
 *
 * Creates a Pine Labs order in IFRAME integration mode.
 * Used for Wallet and Net Banking payment methods where Pine Labs
 * hosts the payment UI inside an iframe on our checkout page.
 *
 * Returns the order token / redirect_url needed to embed the iframe.
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
    if (activeMethod === 'wallet') allowedMethods = ['WALLET'];
    else if (activeMethod === 'netbanking') allowedMethods = ['NET_BANKING'];

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

    // Save to DynamoDB (non-fatal)
    try {
      await saveOrder({
        orderId: order.order_id || merchantOrderRef,
        createdAt: new Date().toISOString(),
        merchantOrderRef,
        amount: amountInPaise,
        currency: 'INR',
        status: 'PENDING',
        paymentMethod: activeMethod?.toUpperCase(),
        customerName: customerName || 'Hackathon Tester',
        customerEmail: customerEmail || 'test@example.com',
      });
    } catch (dbErr) {
      console.warn('[DynamoDB] Failed to save order (non-fatal):', dbErr);
    }

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
