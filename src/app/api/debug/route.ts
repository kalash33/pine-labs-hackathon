import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    PINELABS_CLIENT_ID: process.env.PINELABS_CLIENT_ID ? `${process.env.PINELABS_CLIENT_ID.slice(0, 8)}...` : "MISSING",
    PINELABS_CLIENT_SECRET: process.env.PINELABS_CLIENT_SECRET ? `${process.env.PINELABS_CLIENT_SECRET.slice(0, 8)}...` : "MISSING",
    PINELABS_BASE_URL: process.env.PINELABS_BASE_URL || "MISSING",
    PINELABS_MID: process.env.PINELABS_MID || "MISSING",
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || "MISSING",
    NODE_ENV: process.env.NODE_ENV,
  });
}
