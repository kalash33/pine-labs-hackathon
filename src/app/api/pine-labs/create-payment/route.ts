import { NextResponse } from "next/server";
import { createOrder, createPayment, generateOrderRef } from "@/lib/pinelabs";
import { saveOrder } from "@/lib/dynamodb";

/**
 * POST /api/pine-labs/create-payment
 *
 * Seamless Checkout flow:
 *   1. Create a Pine Labs order
 *   2. Immediately submit payment details (card/UPI/wallet)
 *   3. Return the challenge_url for 3DS / OTP redirect
 *
 * The frontend redirects window.location.href to challenge_url.
 * After 3DS, Pine Labs POSTs to /api/pine-labs/callback which redirects
 * to /payment/success or /payment/failure.
 *
 * Ref: https://developer.pinelabsonline.com/docs/seamless-checkout
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      amount,
      activeMethod,
      cardDetails,
      customerName,
      customerEmail,
      customerPhone,
      description,
      upiId,
    } = body;

    if (!amount || Number(amount) <= 0) {
      return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
    }
    if (!activeMethod) {
      return NextResponse.json({ error: "Missing payment method" }, { status: 400 });
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const merchantOrderRef = generateOrderRef();
    const amountInPaise = Math.round(Number(amount) * 100);

    // ── Step 1: Create Order ──────────────────────────────────────────────────
    const order = await createOrder({
      merchantOrderReference: merchantOrderRef,
      amount: amountInPaise,
      currency: "INR",
      // For seamless checkout, use REDIRECT so Pine Labs doesn't enforce iframe
      integrationMode: "REDIRECT",
      callbackUrl: `${appUrl}/api/pine-labs/callback?ref=${merchantOrderRef}`,
      failureCallbackUrl: `${appUrl}/api/pine-labs/callback?ref=${merchantOrderRef}`,
      customerName: customerName || "Hackathon Tester",
      customerEmail: customerEmail || "test@example.com",
      customerPhone: customerPhone || "9999999999",
      description: description || "AI Checkout Optimizer Demo",
    });

    if (!order.order_id) {
      throw new Error("Pine Labs did not return an order_id");
    }

    // ── Save to DynamoDB ──────────────────────────────────────────────────────
    const createdAt = new Date().toISOString();
    try {
      await saveOrder({
        orderId: order.order_id,
        createdAt,
        merchantOrderRef,
        amount: amountInPaise,
        currency: "INR",
        status: "PENDING",
        paymentMethod: activeMethod?.toUpperCase(),
        customerName: customerName || "Hackathon Tester",
        customerEmail: customerEmail || "test@example.com",
      });
    } catch (dbErr) {
      console.warn("[DynamoDB] Failed to save order (non-fatal):", dbErr);
    }

    // ── Step 2: Create Payment ────────────────────────────────────────────────
    let paymentMethod: "CARD" | "UPI" | "WALLET" = "CARD";
    if (activeMethod === "upi") paymentMethod = "UPI";
    else if (activeMethod === "wallet") paymentMethod = "WALLET";

    const merchantPaymentRef = `PAY_${Date.now()}`;

    const paymentResponse = await createPayment({
      orderId: order.order_id,
      merchantPaymentReference: merchantPaymentRef,
      amount: amountInPaise,
      currency: "INR",
      paymentMethod,
      cardDetails: paymentMethod === "CARD" ? cardDetails : undefined,
      upiId: paymentMethod === "UPI" ? (upiId || "test@paytm") : undefined,
    });

    // ── Step 3: Extract challenge_url ─────────────────────────────────────────
    // Pine Labs nests the response under a "data" key in seamless mode.
    // Handle both flat and nested response shapes.
    type PineLabsResponseData = {
      challenge_url?: string;
      status?: string;
      payments?: Array<{ challenge_url?: string }>;
    };

    const responseData: PineLabsResponseData =
      (paymentResponse as { data?: PineLabsResponseData }).data ?? paymentResponse;

    // challenge_url can be at top level or inside payments[0]
    const challengeUrl =
      responseData.challenge_url ||
      responseData.payments?.[0]?.challenge_url ||
      null;

    const status = responseData.status || "PENDING";

    if (!challengeUrl) {
      console.warn("[Pine Labs] No challenge_url in response:", JSON.stringify(paymentResponse));
      // If no challenge_url, payment may have been auto-approved (rare in UAT)
      // Redirect to success
      return NextResponse.json({
        success: true,
        challenge_url: `${appUrl}/payment/success?ref=${merchantOrderRef}`,
        status: "AUTO_APPROVED",
        order_id: order.order_id,
        merchant_order_reference: merchantOrderRef,
      });
    }

    return NextResponse.json({
      success: true,
      challenge_url: challengeUrl,
      status,
      order_id: order.order_id,
      merchant_order_reference: merchantOrderRef,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[Pine Labs Create Payment]", message);
    return NextResponse.json(
      { error: "Failed to process Pine Labs seamless payment", details: message },
      { status: 500 }
    );
  }
}
