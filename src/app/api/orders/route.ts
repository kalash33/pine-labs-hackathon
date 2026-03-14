import { NextResponse } from "next/server";
import { getRecentOrders, getOrderStats } from "@/lib/dynamodb";

/**
 * GET /api/orders
 * Returns recent orders + stats from DynamoDB pine-labs-orders table
 */
export async function GET() {
  try {
    const [orders, stats] = await Promise.all([
      getRecentOrders(50),
      getOrderStats(),
    ]);
    return NextResponse.json({ orders, stats });
  } catch (error) {
    console.error("[Orders API] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch orders", details: String(error) },
      { status: 500 }
    );
  }
}
