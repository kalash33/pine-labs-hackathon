import { NextResponse } from 'next/server';

/**
 * POST /api/pine-labs/callback
 * Pine Labs redirects the user here alongside a form POST containing the payment status.
 * Since Next.js pages cannot directly accept POST requests, we catch it here and 302 redirect to our success/failure page.
 */
export async function POST(req: Request) {
  try {
    // Pine Labs sends form data (application/x-www-form-urlencoded)
    const formData = await req.formData();
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    
    // Convert FormData to a standard object for debugging if needed
    const payload = Object.fromEntries(formData.entries());
    console.log('[Pine Labs Callback] Received Payload:', payload);

    // Pine Labs typically sends 'dia_secret' and 'dia_secret_type' or response payload.
    // The actual status code comes from the payload.
    // Let's assume a generic success redirect for now. If you want, you can parse the precise response here.
    
    // Redirect cleanly to the frontend React page
    // You can parse payload 'status' here if you want to branch failure/success.
    return NextResponse.redirect(`${appUrl}/payment/success`, 302);
    
  } catch (error) {
    console.error('Callback parsing error:', error);
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    return NextResponse.redirect(`${appUrl}/payment/failure`, 302);
  }
}

export async function GET(_req: Request) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  return NextResponse.redirect(`${appUrl}/payment/success`, 302);
}
