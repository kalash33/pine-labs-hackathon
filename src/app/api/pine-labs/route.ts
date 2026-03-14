import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { amount, paymentMethod, isRetry } = body;

    // Simulate Pine Labs processing delay
    await new Promise((resolve) => setTimeout(resolve, 1500));

    // For the hackathon demo: 
    // First attempt with CC always fails to trigger the AI Recovery Agent
    // Subsequent retries (UPI, EMI) succeed
    if (paymentMethod === 'cc' && !isRetry) {
      return NextResponse.json(
        {
          status: 'FAILED',
          errorCode: 'BANK_NETWORK_DOWN',
          message: 'Issuing bank network is currently unreachable or timed out.',
          transactionId: 'TXN_' + Math.floor(Math.random() * 1000000)
        },
        { status: 400 }
      );
    }

    // Success case
    return NextResponse.json({
      status: 'SUCCESS',
      message: 'Payment processed successfully via Pine Labs',
      transactionId: 'TXN_' + Math.floor(Math.random() * 1000000),
      amount: amount
    });
    
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
