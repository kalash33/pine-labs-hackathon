import { NextResponse } from "next/server";
import { getOrderById, updateOrderStatus } from "@/lib/dynamodb";

/**
 * POST /api/pine-labs/callback
 *
 * Pine Labs redirects the user here with a form POST after payment.
 * We parse the status from the payload, update DynamoDB, and redirect.
 *
 * Pine Labs sends application/x-www-form-urlencoded with fields like:
 *   - plural_order_id
 *   - merchant_order_reference
 *   - order_status  (e.g. "PROCESSED", "FAILED", "CANCELLED")
 *   - response_code (200 = success)
 *   - response_message
 */
export async function POST(req: Request) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  try {
    const url = new URL(req.url);
    const ref = url.searchParams.get("ref") || "";

    // Pine Labs sends form-encoded data
    const formData = await req.formData();
    const payload = Object.fromEntries(formData.entries());
    console.log("[Pine Labs Callback] Payload:", JSON.stringify(payload, null, 2));

    const orderStatus = (payload.order_status as string || "").toUpperCase();
    const responseCode = String(payload.response_code || "");
    const pluralOrderId = (payload.plural_order_id as string) || "";

    const isSuccess =
      orderStatus === "PROCESSED" ||
      orderStatus === "COMPLETED" ||
      responseCode === "200";

    // ── Update DynamoDB ───────────────────────────────────────────────────────
    if (pluralOrderId) {
      try {
        const existing = await getOrderById(pluralOrderId);
        if (existing) {
          await updateOrderStatus(
            pluralOrderId,
            existing.createdAt,
            isSuccess ? "PROCESSED" : "FAILED",
            { pluralOrderId }
          );
        }
      } catch (dbErr) {
        console.warn("[DynamoDB] Failed to update order status (non-fatal):", dbErr);
      }
    }

    const redirectBase = isSuccess
      ? `${appUrl}/payment/success`
      : `${appUrl}/payment/failure`;

    const params = new URLSearchParams();
    if (ref) params.set("ref", ref);
    if (pluralOrderId) params.set("order_id", pluralOrderId);
    if (orderStatus) params.set("status", orderStatus);

    return NextResponse.redirect(
      `${redirectBase}?${params.toString()}`,
      302
    );
  } catch (error) {
    console.error("[Pine Labs Callback] Error:", error);
    return NextResponse.redirect(`${appUrl}/payment/failure`, 302);
  }
}

/**
 * GET /api/pine-labs/callback
 * Some Pine Labs environments redirect via GET. Handle gracefully.
 */
export async function GET(req: Request) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const url = new URL(req.url);
  const ref = url.searchParams.get("ref") || "";
  const status = (url.searchParams.get("order_status") || "").toUpperCase();
  const pluralOrderId = url.searchParams.get("plural_order_id") || "";

  // Update DynamoDB on GET callback too
  if (pluralOrderId) {
    try {
      const existing = await getOrderById(pluralOrderId);
      if (existing) {
        const isSuccess = status === "PROCESSED" || status === "COMPLETED";
        await updateOrderStatus(
          pluralOrderId,
          existing.createdAt,
          isSuccess ? "PROCESSED" : "FAILED"
        );
      }
    } catch (dbErr) {
      console.warn("[DynamoDB] GET callback update failed (non-fatal):", dbErr);
    }
  }

  const isSuccess = status === "PROCESSED" || status === "COMPLETED";
  const redirectBase = isSuccess
    ? `${appUrl}/payment/success`
    : `${appUrl}/payment/success`; // Default to success for GET (browser redirect after 3DS)

  const params = new URLSearchParams();
  if (ref) params.set("ref", ref);
  if (status) params.set("status", status);

  return NextResponse.redirect(`${redirectBase}?${params.toString()}`, 302);
}
